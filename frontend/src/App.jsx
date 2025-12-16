import React, { useState } from "react";
import Layout from "./components/Layout/Layout";
import MapContainer from "./components/LiveMap/MapContainer";
import useSocket from "./hooks/useSocket";

export default function App() {
  const [snapshot, setSnapshot] = useState([]);
  const [attacks, setAttacks] = useState([]);

  useSocket(
    (rows) => { 
      setSnapshot(rows); 
      setAttacks(rows.slice());
    },
    (attack) => { 
      setAttacks(prev => [attack, ...prev].slice(0, 200));
    }
  );

  return (
    <Layout>
      <div style={{ padding: 16 }}>
        <h2 style={{ color: "#32b8c6" }}>EonCyber — CTM (Frontend)</h2>
        <MapContainer snapshot={snapshot} attacks={attacks} />
      </div>
    </Layout>
  );
}
