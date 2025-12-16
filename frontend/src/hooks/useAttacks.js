import { useState, useCallback } from "react";

export default function useAttacks(initial = []) {
  const [attacks, setAttacks] = useState(initial);

  const setSnapshot = useCallback((rows) => {
    // rows expected oldest-first; keep as-is
    setAttacks(rows);
  }, []);

  const pushAttack = useCallback((attack) => {
    setAttacks(prev => {
      const next = prev.slice(); // shallow copy
      next.unshift(attack); // newest-first for UI
      // keep length bounded
      if (next.length > 500) next.pop();
      return next;
    });
  }, []);

  return { attacks, setSnapshot, pushAttack, setAttacks };
}
