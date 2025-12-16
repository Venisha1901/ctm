// // src/controllers/virustotal.controller.js
// const { checkVirusTotal } = require("../services/virustotal.service");
// const { logApiCall } = require("../services/apiLog.service"); // ensure exact filename

// exports.checkVT = async (req, res) => {
//   try {
//     const { type, value } = req.body;
//     if (!type || !value) {
//       return res.status(400).json({ error: "type and value are required in body" });
//     }

//     // call VirusTotal
//     let providerResp, status = 200;
//     try {
//       providerResp = await checkVirusTotal(type, value);
//       status = 200;
//     } catch (err) {
//       providerResp = { error: err.message || String(err) };
//       status = err.response ? err.response.status : 500;
//     }

//     // Log API call (best-effort)
//     try {
//       await logApiCall({
//         serviceName: "virustotal",
//         requestPayload: { type, value },
//         responsePayload: providerResp,
//         statusCode: status
//       });
//     } catch (e) {
//       console.warn("VT log failed:", e);
//     }

//     // Return normalized response
//     return res.json({
//       type,
//       value,
//       vt_response: providerResp
//     });
//   } catch (err) {
//     console.error("❌ /api/virustotal/check error:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };

// src/controllers/virustotal.controller.js
const pool = require("../config/db");
const { checkVirusTotal } = require("../services/virustotal.service");
const { logApiCall } = require("../services/apiLog.service");

// cache TTL in hours
const CACHE_TTL_HOURS = 24;

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

exports.checkVT = async (req, res) => {
  try {
    const { type, value } = req.body || {};
    if (!type || !value) {
      return res.status(400).json({ error: "type and value are required in body" });
    }

    const normType = String(type).toLowerCase();
    const normValue = String(value).trim();

    // 1) Try DB cache (columns: response_json, status_code, checked_at)
    const selectQ = `
      SELECT id, type, value, response_json, status_code, checked_at, created_at
      FROM vt_reports
      WHERE type = $1 AND value = $2
      ORDER BY checked_at DESC
      LIMIT 1;
    `;
    let cached = null;
    try {
      const r = await pool.query(selectQ, [normType, normValue]);
      if (r.rowCount > 0) cached = r.rows[0];
    } catch (err) {
      console.warn("VT: cache select failed", err.message || err);
      // continue (we'll call provider)
    }

    if (cached && cached.checked_at) {
      const ageHrs = hoursSince(cached.checked_at);
      if (ageHrs <= CACHE_TTL_HOURS) {
        return res.json({
          type: normType,
          value: normValue,
          cached: true,
          cacheAgeHours: ageHrs,
          vt_response: cached.response_json,
          status_code: cached.status_code,
          message: "cached"
        });
      }
    }

    // 2) Cache miss or expired -> call VirusTotal provider
    let providerResp = null;
    let providerStatus = 200;
    try {
      providerResp = await checkVirusTotal(normType, normValue);
      providerStatus = 200;
    } catch (err) {
      providerResp = { error: err.message || String(err) };
      providerStatus = err.response ? err.response.status : 500;
    }

    // 3) Persist provider response (insert or upsert)
    try {
      const upsertQ = `
        INSERT INTO vt_reports (type, value, response_json, status_code, checked_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (type, value) DO UPDATE
          SET response_json = EXCLUDED.response_json,
              status_code = EXCLUDED.status_code,
              checked_at = EXCLUDED.checked_at
        RETURNING id, checked_at, created_at;
      `;
      const upsertVals = [normType, normValue, providerResp, providerStatus];
      await pool.query(upsertQ, upsertVals);
    } catch (err) {
      console.error("VT: failed to persist vt_reports:", err.message || err);
      // don't fail the API — proceed to return providerResp
    }

    // 4) Log the external API call (best-effort)
    try {
      await logApiCall({
        serviceName: "virustotal",
        requestPayload: { type: normType, value: normValue },
        responsePayload: providerResp,
        statusCode: providerStatus
      });
    } catch (e) {
      console.warn("VT: logApiCall failed:", e.message || e);
    }

    // 5) Return normalized response
    return res.json({
      type: normType,
      value: normValue,
      cached: false,
      cacheAgeHours: cached && cached.checked_at ? hoursSince(cached.checked_at) : null,
      vt_response: providerResp,
      status_code: providerStatus,
      message: "fetched"
    });

  } catch (err) {
    console.error("❌ /api/virustotal/check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
