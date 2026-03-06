"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Team = { id: string; name: string };

type Match = {
  id: string;
  leagueId: string;
  round: number;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: Team;
  awayTeam: Team;
};

type Filter = "all" | "played" | "pending";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Errore");
  return data;
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
}

export default function CalendarPage() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const t = await getJSON<any[]>(`/api/leagues/${leagueId}/teams`);
      setTeams(t.map(x => ({ id: x.id, name: x.name })));

      const m = await getJSON<Match[]>(`/api/leagues/${leagueId}/schedule`);
      setMatches(m);
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

  const hasSchedule = matches.length > 0;

  const playedCount = useMemo(
    () => matches.filter(m => m.homeGoals !== null && m.awayGoals !== null).length,
    [matches]
  );

  const pendingCount = useMemo(
    () => matches.filter(m => m.homeGoals === null || m.awayGoals === null).length,
    [matches]
  );

  const filteredMatches = useMemo(() => {
    if (filter === "played") {
      return matches.filter(m => m.homeGoals !== null && m.awayGoals !== null);
    }
    if (filter === "pending") {
      return matches.filter(m => m.homeGoals === null || m.awayGoals === null);
    }
    return matches;
  }, [matches, filter]);

  const grouped = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of filteredMatches) {
      map.set(m.round, [...(map.get(m.round) ?? []), m]);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filteredMatches]);

  async function generateRandom() {
    setErr(null);
    try {
      await postJSON(`/api/leagues/${leagueId}/schedule`, { random: true });
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>Calendario</h1>
          <div style={{ opacity: 0.75, fontSize: 14 }}>
            Totali: <b>{matches.length}</b> • Giocate: <b>{playedCount}</b> • Da giocare: <b>{pendingCount}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilter("all")}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: filter === "all" ? "#f4f4f4" : "white", cursor: "pointer" }}
          >
            Tutte
          </button>
          <button
            onClick={() => setFilter("played")}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: filter === "played" ? "#f4f4f4" : "white", cursor: "pointer" }}
          >
            Giocate
          </button>
          <button
            onClick={() => setFilter("pending")}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: filter === "pending" ? "#f4f4f4" : "white", cursor: "pointer" }}
          >
            Da giocare
          </button>
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.75 }}>Caricamento…</div> : null}
      {err ? <div style={{ color: "#b00020", marginTop: 10 }}>{err}</div> : null}

      {!loading && !hasSchedule ? (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>Nessuna partita trovata</div>
          <p style={{ opacity: 0.75 }}>
            Crea un calendario casuale. Poi potrai inserire i risultati cliccando sulle partite.
          </p>

          <button
            onClick={generateRandom}
            disabled={teams.length < 2}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc", background: "white", cursor: "pointer" }}
          >
            Genera calendario casuale
          </button>

          {teams.length < 2 ? <div style={{ marginTop: 8, opacity: 0.7 }}>Servono almeno 2 squadre.</div> : null}
        </div>
      ) : null}

      {!loading && hasSchedule ? (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {grouped.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Nessuna partita per questo filtro.</div>
          ) : null}

          {grouped.map(([round, ms]) => (
            <div key={round} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Giornata {round}</div>

              <div style={{ display: "grid", gap: 8 }}>
                {ms.map(m => {
                  const played = m.homeGoals !== null && m.awayGoals !== null;

                  return (
                    <div
                      key={m.id}
                      style={{
                        border: "1px solid #f0f0f0",
                        borderRadius: 10,
                        padding: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {m.homeTeam.name} - {m.awayTeam.name}
                        </div>
                        <div style={{ opacity: 0.75, fontSize: 14 }}>
                          {played ? `${m.homeGoals} : ${m.awayGoals}` : "Risultato non inserito"}
                        </div>
                      </div>

                      <Link
                        href={`/leagues/${leagueId}/matches/${m.id}`}
                        style={{
                          textDecoration: "none",
                          border: "1px solid #ccc",
                          borderRadius: 10,
                          padding: "8px 10px",
                          color: "inherit",
                          background: "white",
                        }}
                      >
                        {played ? "Modifica risultato" : "Inserisci risultato"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}