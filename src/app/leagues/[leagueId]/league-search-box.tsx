"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeagueSearchBox({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/leagues/${leagueId}/players?q=${encodeURIComponent(q.trim())}`);
      }}
      style={{ display: "flex", gap: 8, alignItems: "center" }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca giocatore…"
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 220 }}
      />
      <button type="submit" style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc", background: "white" }}>
        Cerca
      </button>
    </form>
  );
}