const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "Routes working properly" });
});

module.exports = router;
