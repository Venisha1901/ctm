// src/services/virustotal.service.js
const axios = require("axios");

const VT_BASE = "https://www.virustotal.com/api/v3";

async function callVT(path, method = "GET", data = null, headers = {}) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) throw new Error("VIRUSTOTAL_API_KEY not configured in env");

  const url = `${VT_BASE}${path}`;
  const res = await axios({
    url,
    method,
    headers: {
      "x-apikey": apiKey,
      Accept: "application/json",
      ...headers
    },
    data,
    timeout: 20000
  });
  return res.data;
}

/**
 * type: "ip" | "hash" | "url"
 * value: ip string / file hash / url string
 */
async function checkVirusTotal(type, value) {
  if (!type || !value) throw new Error("type and value are required");

  if (type === "ip") {
    // GET /api/v3/ip_addresses/{ip}
    return await callVT(`/ip_addresses/${encodeURIComponent(value)}`);
  }

  if (type === "hash") {
    // GET /api/v3/files/{hash}
    return await callVT(`/files/${encodeURIComponent(value)}`);
  }

  if (type === "url") {
    // For URLs: submit URL for analysis, then fetch analysis result.
    // 1) POST /api/v3/urls with form data 'url'
    // 2) The response contains data.id (analysis id) or data.links.self
    // 3) GET /api/v3/analyses/{id}
    const form = new URLSearchParams();
    form.append("url", value);

    const postRes = await callVT("/urls", "POST", form.toString(), {
      "Content-Type": "application/x-www-form-urlencoded"
    });

    // postRes contains data.id for the analysis resource
    const analysisId = postRes.data && (postRes.data.id || postRes.data.links?.self);
    if (!analysisId) {
      // some VT responses vary; just return the postRes
      return postRes;
    }

    // If analysisId looks like a URL (links.self), try to extract id
    let id = analysisId;
    if (typeof id === "string" && id.includes("/analyses/")) {
      id = id.split("/analyses/").pop();
    }

    // fetch analysis
    try {
      const analysis = await callVT(`/analyses/${encodeURIComponent(id)}`);
      return { submitted: postRes, analysis };
    } catch (e) {
      // return the submission response if analysis not yet ready
      return { submitted: postRes };
    }
  }

  throw new Error("unsupported type");
}

module.exports = { checkVirusTotal };
