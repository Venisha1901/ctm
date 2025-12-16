const pool = require("../config/db");
const { checkAbuseIPDB } = require("../services/abuseipdb.service");
const { logApiCall } = require("../services/apiLog.service");

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function isValidIp(ip) {
  return /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/.test(ip);
}

/**
 * GET /api/ip/search?q=<ip>
 * Returns:
 * - Cached IP report (if exists)
 * - Recent attacks where IP is source or destination
 */
exports.searchIP = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        error: "Missing query parameter 'q' (ip)",
      });
    }

    if (!isValidIp(ip)) return res.status(400).json({ error: "Invalid IP address" });

    // ---------------------------------------
    // 1) Fetch cached IP report
    // ---------------------------------------
    const ipReportQuery = `
      SELECT 
        ip,
        abuse_confidence,
        country,
        isp,
        last_reported,
        raw_json,
        created_at
      FROM ip_reports
      WHERE ip = $1
      LIMIT 1;
    `;

    let cacheExpired = false;

    if (cachedReport && cachedReport.checked_at) {
    const ageHrs = hoursSince(cachedReport.checked_at);
    cacheExpired = ageHrs > 24; // example: refresh after 24h
    }

    const ipReportResult = await pool.query(ipReportQuery, [q]);

    const cachedReport =
      ipReportResult.rowCount > 0 ? ipReportResult.rows[0] : null;

    const message =
  cacheExpired ? "cache_expired" :
  cachedReport ? "cached_report" :
  "no_cached_report";

    // ---------------------------------------
    // 2) Fetch recent attacks involving IP
    // ---------------------------------------
    const attacksQuery = `
      SELECT 
        id,
        src_ip, src_lat, src_lng, src_city, src_country,
        dst_ip, dst_lat, dst_lng, dst_city, dst_country,
        attack_type, threat_score, severity, created_at
      FROM attacks
      WHERE src_ip = $1 OR dst_ip = $1
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    const attacksResult = await pool.query(attacksQuery, [q]);
    const recentAttacks = attacksResult.rows || [];

    // ---------------------------------------
    // 3) Build response payload
    // ---------------------------------------
    const response = {
      query: q,
      ip: cachedReport ? cachedReport.ip : q,
      cached: Boolean(cachedReport),

      reputation: cachedReport
        ? {
            abuseConfidence: cachedReport.abuse_confidence,
            isBlacklisted:
              typeof cachedReport.abuse_confidence === "number"
                ? cachedReport.abuse_confidence >= 76
                : null,
          }
        : null,

      geo: cachedReport
        ? {
            country: cachedReport.country || null,
            isp: cachedReport.isp || null,
          }
        : { country: null, isp: null },

      ip_report: cachedReport ? cachedReport.raw_json || null : null,

      recent_attacks: recentAttacks,

      message,
    };

    return res.json(response);
  } catch (err) {
    console.error("❌ /api/ip/search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.enrichIP = async (req, res) => {
  try {
    const ip = (req.params.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "IP param required" });
    if (!isValidIp(ip)) return res.status(400).json({ error: "Invalid IP address" });

    // 1) Call external provider (AbuseIPDB)
    let providerResp = null;
    let providerStatus = null;
    try {
      providerResp = await checkAbuseIPDB(ip); // may throw
      providerStatus = 200;
    } catch (err) {
      // Log failure (but continue to return useful data)
      console.error("AbuseIPDB call failed:", err.message || err);
      providerResp = { error: err.message || "provider error" };
      providerStatus = err.response ? err.response.status : 500;
    }

    // 2) Log API call into api_logs (best-effort)
    try {
      await logApiCall({
        serviceName: "abuseipdb",
        requestPayload: { ip },
        responsePayload: providerResp,
        statusCode: providerStatus
      });
    } catch (err) {
      console.error("Failed to log API call:", err);
    }

    // 3) Parse provider response defensively
    // AbuseIPDB typically replies: { data: { ipAddress, abuseConfidenceScore, countryCode, isp, lastReportedAt, ... } }
    let parsed = {
      abuseConfidence: null,
      country: null,
      isp: null,
      lastReportedAt: null,
      raw: providerResp
    };

    try {
      if (providerResp && providerResp.data) {
        const d = providerResp.data;
        parsed.abuseConfidence =
          d.abuseConfidenceScore !== undefined ? d.abuseConfidenceScore : (d.abuse_confidence || null);
        parsed.country = d.countryCode || d.country || null;
        parsed.isp = d.isp || null;
        parsed.lastReportedAt = d.lastReportedAt || d.last_reported || null;
      } else if (providerResp && providerResp.data === undefined && providerResp.error) {
        // keep raw error in parsed.raw
      }
    } catch (e) {
      console.warn("Could not parse provider response fully:", e.message || e);
    }

    // 4) Upsert into ip_reports table (INSERT ... ON CONFLICT)
    // ensure ip column has unique constraint in DB
    const upsertQuery = `
      INSERT INTO ip_reports (ip, abuse_confidence, country, isp, last_reported, raw_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (ip) DO UPDATE
        SET abuse_confidence = EXCLUDED.abuse_confidence,
            country = EXCLUDED.country,
            isp = EXCLUDED.isp,
            last_reported = EXCLUDED.last_reported,
            raw_json = EXCLUDED.raw_json,
            checked_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const upsertValues = [
      ip,
      parsed.abuseConfidence,
      parsed.country,
      parsed.isp,
      parsed.lastReportedAt,
      parsed.raw
    ];

    let savedReport = null;
    try {
      const r = await pool.query(upsertQuery, upsertValues);
      savedReport = r.rows[0];
    } catch (err) {
      console.error("Failed to upsert ip_reports:", err);
      // don't fail the whole call; continue with provider data
    }

    // 5) Fetch recent attacks involving this IP (reuse same query as searchIP)
    const attacksRes = await pool.query(
      `SELECT id, src_ip, src_lat, src_lng, src_city, src_country,
              dst_ip, dst_lat, dst_lng, dst_city, dst_country,
              attack_type, threat_score, severity, created_at
       FROM attacks
       WHERE src_ip = $1 OR dst_ip = $1
       ORDER BY created_at DESC
       LIMIT 50;`,
      [ip]
    );
    const recentAttacks = attacksRes.rows || [];

    // 6) Build and return final response
    return res.json({
      query: ip,
      ip,
      cached: Boolean(savedReport),
      reputation: {
        abuseConfidence: parsed.abuseConfidence,
        isBlacklisted: typeof parsed.abuseConfidence === "number" ? parsed.abuseConfidence >= 76 : null,
        source: "abuseipdb"
      },
      geo: {
        country: parsed.country,
        isp: parsed.isp
      },
      ip_report: savedReport ? (savedReport.raw_json || parsed.raw) : parsed.raw,
      recent_attacks: recentAttacks,
      message: savedReport ? "enriched_and_cached" : "enriched_not_cached"
    });
  } catch (err) {
    console.error("❌ enrichIP error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};