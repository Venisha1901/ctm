// import { useEffect, useRef } from "react";
// import { io } from "socket.io-client";

// export default function useSocket({ url = "http://localhost:5000", onSnapshot, onAttack, onStats } = {}) {
//   const socketRef = useRef(null);

//   useEffect(() => {
//     const socket = io(url, { transports: ["websocket"] });
//     socketRef.current = socket;

//     socket.on("connect", () => {
//       console.log("Socket connected:", socket.id);
//     });

//     socket.on("snapshot", (rows) => {
//       if (typeof onSnapshot === "function") onSnapshot(rows);
//     });

//     socket.on("attack", (data) => {
//       if (typeof onAttack === "function") onAttack(data);
//     });

//     socket.on("stats_update", (data) => {
//       if (typeof onStats === "function") onStats(data);
//     });

//     socket.on("disconnect", () => {
//       console.log("Socket disconnected");
//     });

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [url, onSnapshot, onAttack, onStats]);

//   return socketRef;
// }

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket({
  url = "http://localhost:5000",
  onSnapshot,
  onAttack,
  onStats
} = {}) {

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(url, { transports: ["websocket"] });
    socketRef.current = socket;

    // Debug logs
    socket.on("connect_error", (err) => console.log("connect_error:", err));
    socket.on("connect_timeout", () => console.log("connect_timeout"));
    socket.on("reconnect_attempt", (n) => console.log("reconnect_attempt:", n));
    socket.on("disconnect", (reason) => console.log("client disconnect reason:", reason));

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("snapshot", (rows) => {
      if (onSnapshot) onSnapshot(rows);
    });

    socket.on("attack", (data) => {
      if (onAttack) onAttack(data);
    });

    socket.on("stats_update", (data) => {
      if (onStats) onStats(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };

  }, []);   // <-- FIX: only run once!

  return socketRef;
}

