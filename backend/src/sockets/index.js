// src/sockets/index.js
const pool = require("../config/db");

let ioInstance = null;

function init(io) {
  if (!io) throw new Error("You must pass socket.io instance to init(io)");
  ioInstance = io;

  io.on("connection", async (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // 1️⃣ SEND SNAPSHOT ON CONNECT
    try {
      const r = await pool.query(
        `SELECT id,
                src_ip, src_lat, src_lng, src_city, src_country,
                dst_ip, dst_lat, dst_lng, dst_city, dst_country,
                attack_type, threat_score, severity, created_at
         FROM attacks
         ORDER BY created_at DESC
         LIMIT 100;`
      );
      const rows = (r.rows || []).slice().reverse();
      socket.emit("snapshot", rows);
    } catch (err) {
      console.error("Failed to fetch snapshot for new socket:", err);
      socket.emit("snapshot", []);
    }

    // 2️⃣ MANUAL SNAPSHOT REQUEST
    socket.on("request_snapshot", async () => {
      try {
        const r = await pool.query(
          `SELECT id,
                  src_ip, src_lat, src_lng, src_city, src_country,
                  dst_ip, dst_lat, dst_lng, dst_city, dst_country,
                  attack_type, threat_score, severity, created_at
           FROM attacks
           ORDER BY created_at DESC
           LIMIT 100;`
        );
        const rows = (r.rows || []).slice().reverse();
        socket.emit("snapshot", rows);
      } catch (err) {
        console.error("Failed to provide requested snapshot:", err);
        socket.emit("snapshot", []);
      }
    });

    // 3️⃣ DISCONNECT LOGGING
    socket.on("disconnect", (reason) => {
      console.log(`🔴 Socket disconnected: ${socket.id} | reason = ${reason}`);
    });

    socket.on("error", (err) => {
      console.log("⚠️ Socket error:", err);
    });
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized. Call init(io) first.");
  return ioInstance;
}

module.exports = { init, getIO };
