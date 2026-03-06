"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = { playerId: string; firstName: string; lastName: string; teamName: string; value: number };

export default function StatsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [scorers, setScorers] = useState<Row[]>([]);
  const [assists, setAssists] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;

    (async () => {
      setErr(null);
      try {
        const res = await fetch(`/api/leagues/${leagueId}/stats`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Errore stats");
        setScorers(data.scorers ?? []);
        setAssists(data.assists ?? []);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, [leagueId]);

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Stats</h1>
      {err ? <div style={{ color: "#b00020" }}>{err}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Top 5 Marcatori</div>
          {scorers.map((r, i) => (
            <div key={r.playerId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f3f3" }}>
              <span>{i + 1}. #{r.value} — {r.firstName} {r.lastName} ({r.teamName})</span>
              <b>{r.value}</b>
            </div>
          ))}
          {scorers.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun dato.</div> : null}
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Top 5 Assistman</div>
          {assists.map((r, i) => (
            <div key={r.playerId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f3f3" }}>
              <span>{i + 1}. {r.firstName} {r.lastName} ({r.teamName})</span>
              <b>{r.value}</b>
            </div>
          ))}
          {assists.length === 0 ? <div style={{ opacity: 0.7 }}>Nessun dato.</div> : null}
        </div>
      </div>
    </div>
  );
}