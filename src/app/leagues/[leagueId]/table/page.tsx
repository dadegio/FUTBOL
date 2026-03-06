"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export default function TablePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      setErr(null);
      const res = await fetch(`/api/leagues/${leagueId}/table`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(data?.error ?? "Errore classifica");
      setRows(data);
    })();
  }, [leagueId]);

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Classifica</h1>
      {err ? <div style={{ color: "#b00020" }}>{err}</div> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {["#", "Squadra", "Pt", "G", "V", "N", "P", "GF", "GS", "DR"].map(h => (
                <th key={h} style={{ textAlign: h === "Squadra" ? "left" : "center", borderBottom: "1px solid #eee", padding: 8 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.teamId}>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{i + 1}</td>
                <td style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.teamName}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5", fontWeight: 800 }}>{r.points}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.played}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.wins}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.draws}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.losses}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.gf}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.ga}</td>
                <td style={{ textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5" }}>{r.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? <div style={{ marginTop: 10, opacity: 0.7 }}>Nessuna partita con risultato inserito.</div> : null}
    </div>
  );
}