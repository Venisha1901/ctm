require("dotenv").config();
console.log("VT KEY:", process.env.VIRUSTOTAL_API_KEY);

const express = require("express");
const http = require("http");
const cors = require("cors");

const { init: initSockets } = require("./src/sockets");
const pool = require("./src/config/db");

const app = express();
const server = http.createServer(app);

const { Server } = require("socket.io");

const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000,
  transports: ["websocket"]
});


// initialize helper
initSockets(io);

// OPTIONAL: keep a small connection log (the module also logs)
// io.on('connection', (socket) => {
//   // When client connects, send snapshot of recent attacks
//   // We will require db and query here or you can implement this inside module.
//   const pool = require('./src/config/db');

//   (async () => {
//     try {
//       const r = await pool.query(
//         `SELECT id,
//                 src_ip, src_lat, src_lng, src_city, src_country,
//                 dst_ip, dst_lat, dst_lng, dst_city, dst_country,
//                 attack_type, threat_score, severity, created_at
//          FROM attacks
//          ORDER BY created_at DESC
//          LIMIT 100;`
//       );
//       // snapshot: send oldest-first so frontend can draw in order
//       const rows = (r.rows || []).slice().reverse();
//       socket.emit('snapshot', rows);
//     } catch (err) {
//       console.error('Failed to send snapshot on connect:', err);
//       socket.emit('snapshot', []);
//     }
//   })();
// });

app.set("io", io);

// Middlewares
app.use(cors());
app.use(express.json());
// ROUTES
app.use("/api/test", require("./src/routes/test.routes"));
app.use("/api/attacks", require("./src/routes/attacks.routes"));
app.use("/api/ip", require("./src/routes/ip.routes"));
app.use("/api/events", require("./src/routes/events.routes"));
app.use("/api/virustotal", require("./src/routes/virustotal.routes"));


// Test route
app.get("/", (req, res) => {
    res.send("CTM Backend is running...");
});

// Real-time socket connection
// io.on("connection", (socket) => {
//     console.log("🟢 Client connected:", socket.id);

//     socket.on("disconnect", () => {
//         console.log("🔴 Client disconnected:", socket.id);
//     });
// });

// Port
const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
