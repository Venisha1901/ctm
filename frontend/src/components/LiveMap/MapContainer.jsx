// src/components/LiveMap/MapContainer.jsx
import React, { useEffect, useState } from "react";
import useSocket from "../../hooks/useSocket";
import useAttacks from "../../hooks/useAttacks";
import { api } from "../../api/api";
import MapVisualization from "./MapVisualization";

function AttacksList({ attacks }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {attacks.slice(0, 40).map((a) => (
        <div key={a.id} className="card small-card">
          <div style={{ fontWeight: 700 }}>
            {a.attack_type}{" "}
            <small style={{ color: "#9aa6b2" }}>({a.severity})</small>
          </div>
          <div style={{ color: "#9aa6b2" }}>
            {a.src_city || a.src_ip} → {a.dst_city || a.dst_ip}
          </div>
          <div style={{ fontSize: 11, color: "#9aa6b2" }}>
            {new Date(a.created_at).toLocaleString()} — {a.threat_score}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MapContainer() {
  const { attacks, setSnapshot, pushAttack } = useAttacks([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isBottomOpen, setBottomOpen] = useState(true);

  // SOCKET HOOK
  useSocket({
    url: import.meta.env.VITE_API_URL || "http://localhost:5000",
    onSnapshot: (rows) => setSnapshot(rows),
    onAttack: (a) => pushAttack(a),
  });

  // Initial data fetch
  useEffect(() => {
    api
      .get("/api/attacks/live")
      .then((r) => {
        const rows = (r.data.attacks || []).slice().reverse();
        setSnapshot(rows);
      })
      .catch(() => {});
  }, []);

  return (
  <div className="ctm-wrapper" >

    {/* MAP AREA */}
    <div className="map-area">
      <MapVisualization attacks={attacks} />

      {/* Bottom Panel */}
      <div className={`bottom-panel ${isBottomOpen ? "" : "collapsed"}`}>
        <button
          className="bottom-toggle"
          onClick={() => setBottomOpen(!isBottomOpen)}
        >
          {isBottomOpen ? "▼" : "▲"}
        </button>

        <h3 style={{ marginTop: 0 }}>Attack Activity Timeline</h3>
        {/* <p style={{ color: "#9aa6b2" }}>(Graph placeholder)</p> */}
      </div>
    </div>

    {/* SIDEBAR */}
    <div className={`sidebar ${isSidebarOpen ? "" : "collapsed"}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? "❯" : "❮"}
      </button>

      <h3>Live Attacks</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: "#9aa6b2" }}>Total Recent</label>
        <div className="stat-number">{attacks.length}</div>
      </div>

      <AttacksList attacks={attacks} />
    </div>

  </div>
);

}
