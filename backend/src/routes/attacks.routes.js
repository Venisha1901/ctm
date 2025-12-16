const express = require("express");
const router = express.Router();

const { addAttack, getLiveAttacks, getAttackStats, getTimeline } = require("../controllers/attacks.controller");

// Test route
router.get("/", (req, res) => {
    res.json({ message: "Attack endpoint working" });
});

// Add attack route
router.post("/add", addAttack);

// Live attacks route
router.get("/live", getLiveAttacks);

// Attack statistics route
router.get("/stats", getAttackStats);

// Attack timeline route
router.get("/timeline", getTimeline);

module.exports = router;
