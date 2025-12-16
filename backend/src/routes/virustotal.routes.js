// src/routes/virustotal.routes.js
const express = require("express");
const router = express.Router();
const { checkVT } = require("../controllers/virustotal.controller");

router.post("/check", checkVT);

module.exports = router;
