const pool = require("../config/db");

async function logApiCall({ serviceName, requestPayload, responsePayload, statusCode }) {
  const q = `
    INSERT INTO api_logs (service_name, request_payload, response_payload, status_code)
    VALUES ($1,$2,$3,$4) RETURNING *;
  `;
  const values = [serviceName, requestPayload || null, responsePayload || null, statusCode || null];
  try {
    const r = await pool.query(q, values);
    return r.rows[0];
  } catch (err) {
    console.error("Failed to insert api_log", err);
    return null;
  }
}

module.exports = { logApiCall };
