"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  team: { id: string; name: string };
};

export default function PlayersPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim();

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    setErr(null);
    setLoading(true);
    fetch(`/api/leagues/${leagueId}/players?q=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d?.error ?? "Errore");
        setRows(d);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [leagueId, q]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Giocatori</h1>
      <div style={{ opacity: 0.75 }}>Risultati: {loading ? "…" : rows.length}</div>
      {err ? <div style={{ color: "#b00020", marginTop: 10 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.map(p => (
          <Link
            key={p.id}
            href={`/leagues/${leagueId}/players/${p.id}`}
            style={{ textDecoration: "none", border: "1px solid #eee", borderRadius: 10, padding: 10, color: "inherit" }}
          >
            <b>#{p.number}</b> {p.firstName} {p.lastName} <span style={{ opacity: 0.75 }}>— {p.team.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}