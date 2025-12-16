// src/controllers/attacks.controller.js
const pool = require("../config/db");

// Try to import a getIO helper from your sockets module.
// If your sockets module exports getIO, we'll use it. Otherwise we'll use req.app.get('io') at runtime.
let getIO;
try {
  // Use require path relative to controllers folder
  ({ getIO } = require("../sockets"));
} catch (e) {
  // module may not export getIO — that's fine, we'll fallback to req.app.get('io')
  getIO = null;
}

// Add new attack record
exports.addAttack = async (req, res) => {
    try {
        const {
            src_ip, src_lat, src_lng, src_city, src_country,
            dst_ip, dst_lat, dst_lng, dst_city, dst_country,
            attack_type, threat_score, severity, raw_payload
        } = req.body;

        const query = `
            INSERT INTO attacks (
                src_ip, src_lat, src_lng, src_city, src_country,
                dst_ip, dst_lat, dst_lng, dst_city, dst_country,
                attack_type, threat_score, severity, raw_payload
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *;
        `;

        const values = [
            src_ip, src_lat, src_lng, src_city, src_country,
            dst_ip, dst_lat, dst_lng, dst_city, dst_country,
            attack_type, threat_score, severity, raw_payload
        ];

        const result = await pool.query(query, values);
        const inserted = result.rows[0];

        // Emit via Socket.IO so frontend can update in real-time.
        // Prefer getIO() if available, otherwise use req.app.get('io').
        try {
          const io = (typeof getIO === 'function') ? getIO() : (req && req.app && req.app.get && req.app.get('io'));
          if (io) {
            // Send the new attack to all connected clients
            io.emit('attack', inserted);

            // Optionally emit a lightweight stats update (frontend can decide to request full stats)
            io.emit('stats_update', { hint: 'new_attack', id: inserted.id });
          } else {
            // no-op if io not found
            // console.warn('Socket.IO instance not found; skipping emit.');
          }
        } catch (emitErr) {
          // do not fail the request if emit fails
          console.warn('Failed to emit socket event for new attack:', emitErr);
        }

        res.json({
            message: "Attack inserted successfully",
            attack: inserted
        });

    } catch (err) {
        console.error("❌ Error inserting attack:", err.message);
        res.status(500).json({ error: "Failed to insert attack" });
    }
};

// Get latest attacks (for threat map)
exports.getLiveAttacks = async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                src_ip, src_lat, src_lng, src_city, src_country,
                dst_ip, dst_lat, dst_lng, dst_city, dst_country,
                attack_type, threat_score, severity, created_at
            FROM attacks
            ORDER BY created_at DESC
            LIMIT 100;
        `;

        const result = await pool.query(query);

        res.json({
            count: result.rows.length,
            attacks: result.rows
        });

    } catch (err) {
        console.error("❌ Error fetching live attacks:", err.message);
        res.status(500).json({ error: "Failed to fetch attacks" });
    }
};

// Attack statistics for sidebar
exports.getAttackStats = async (req, res) => {
    try {
        // Top attacker countries
        const topAttackersQuery = `
            SELECT src_country, COUNT(*) AS count
            FROM attacks
            GROUP BY src_country
            ORDER BY count DESC
            LIMIT 5;
        `;
        
        // Top victim countries
        const topVictimsQuery = `
            SELECT dst_country, COUNT(*) AS count
            FROM attacks
            GROUP BY dst_country
            ORDER BY count DESC
            LIMIT 5;
        `;

        // Attack types distribution
        const attackTypesQuery = `
            SELECT attack_type, COUNT(*) AS count
            FROM attacks
            GROUP BY attack_type
            ORDER BY count DESC;
        `;

        // Severity distribution
        const severityQuery = `
            SELECT severity, COUNT(*) AS count
            FROM attacks
            GROUP BY severity;
        `;

        const [attackers, victims, types, severity] = await Promise.all([
            pool.query(topAttackersQuery),
            pool.query(topVictimsQuery),
            pool.query(attackTypesQuery),
            pool.query(severityQuery),
        ]);

        res.json({
            top_attackers: attackers.rows,
            top_victims: victims.rows,
            attack_types: types.rows,
            severity_distribution: severity.rows
        });

    } catch (err) {
        console.error("❌ Error fetching attack stats:", err.message);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
};

// Get attack timeline for graph
exports.getTimeline = async (req, res) => {
    try {
        let minutes = parseInt(req.query.minutes) || 60;

        const query = `
            SELECT 
                date_trunc('minute', created_at) AS time_bucket,
                attack_type,
                COUNT(*) AS count
            FROM attacks
            WHERE created_at >= NOW() - INTERVAL '${minutes} minutes'
            GROUP BY time_bucket, attack_type
            ORDER BY time_bucket ASC;
        `;

        const result = await pool.query(query);

        res.json({
            interval: minutes,
            timeline: result.rows
        });

    } catch (err) {
        console.error("❌ Error generating timeline:", err.message);
        res.status(500).json({ error: "Failed to fetch timeline" });
    }
};
