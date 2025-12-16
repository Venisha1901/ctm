const axios = require("axios");

/**
 * Call AbuseIPDB check endpoint.
 * Returns { success, status, data } or throws.
 */
async function checkAbuseIPDB(ip) {
  const apiKey = process.env.ABUSEIPDB_KEY;
  if (!apiKey) {
    throw new Error("ABUSEIPDB API key not configured");
  }

  const url = `https://api.abuseipdb.com/api/v2/check`;
  const params = { ipAddress: ip, maxAgeInDays: 90 };

  const headers = {
    "Accept": "application/json",
    "Key": apiKey
  };

  const resp = await axios.get(url, { headers, params, timeout: 10000 });
  return resp.data; // keep raw provider data
}

module.exports = { checkAbuseIPDB };
