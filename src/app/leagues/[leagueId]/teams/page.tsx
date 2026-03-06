"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TeamRow = {
  id: string;
  name: string;
  badgeUrl?: string | null;
  _count?: { players: number };
};

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [name, setName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore caricamento squadre");
      setTeams(data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!leagueId) return;
    load();
  }, [leagueId]);

  async function createTeam() {
    setErr(null);
    setMsg(null);

    const teamName = name.trim();
    if (!teamName) {
      setErr("Inserisci il nome squadra");
      return;
    }

    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore creazione squadra");

      setName("");
      setBadgeUrl("");
      setMsg("Squadra creata ✅");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Squadre</h1>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Crea nuova squadra</h2>

        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome squadra"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />

          <input
            value={badgeUrl}
            onChange={(e) => setBadgeUrl(e.target.value)}
            placeholder="Stemma (URL) opzionale"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </div>

        <button
          onClick={createTeam}
          style={{
            marginTop: 10,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ccc",
            cursor: "pointer",
            background: "white",
          }}
        >
          Crea squadra
        </button>

        {msg ? <div style={{ marginTop: 8, color: "green" }}>{msg}</div> : null}
        {err ? <div style={{ marginTop: 8, color: "#b00020" }}>{err}</div> : null}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {loading ? <div style={{ opacity: 0.75 }}>Caricamento…</div> : null}

        {!loading && teams.length === 0 ? (
          <div style={{ opacity: 0.75 }}>Nessuna squadra presente.</div>
        ) : null}

        {teams.map((t) => (
          <Link
            key={t.id}
            href={`/leagues/${leagueId}/teams/${t.id}`}
            style={{
              textDecoration: "none",
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 10,
              color: "inherit",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{t.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Rosa: {t._count?.players ?? 0}/16
              </div>
            </div>

            {t.badgeUrl ? (
              <img
                src={t.badgeUrl}
                alt=""
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1px solid #eee" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}