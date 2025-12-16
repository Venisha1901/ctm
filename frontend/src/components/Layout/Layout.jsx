import React from "react";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: 12, borderBottom: "1px solid #0b1a22", background: "linear-gradient(90deg,#00121a, #001a24)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, color: "#32b8c6" }}>EonCyber CTM</div>
          <div style={{ color: "#9aa6b2" }}>Live Cyber Threat Map — Frontend (dev)</div>
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: 1200, margin: "24px auto", width: "100%" }}>
        {children}
      </main>
      <footer style={{ padding: 12, textAlign: "center", color: "#6b7b84" }}>© CTM</footer>
    </div>
  );
}
