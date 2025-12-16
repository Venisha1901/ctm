const express = require("express");
const router = express.Router();
const { searchIP, enrichIP } = require("../controllers/ip.controller");


// example health route
router.get("/lookup", (req, res) => {
  res.json({ message: "IP lookup route working" });
});

// IP Search (working API)
router.get("/search", searchIP);

// NEW: GET /api/ip/enrich/:ip
router.get("/enrich/:ip", enrichIP);

module.exports = router;
