'use client'

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Player = { id: string; firstName: string; lastName: string; number: number; teamId: string };
type Team = { id: string; name: string; players: Player[] };
type StatRow = { id: string; matchId: string; playerId: string; goals: number; assists: number };
type Match = {
  id: string;
  round: number;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: Team;
  awayTeam: Team;
  stats: StatRow[];
  leagueId: string;
};

export default function MatchResultForm({ match }: { match: Match }) {
  const router = useRouter();
  const [homeGoals, setHomeGoals] = useState<string>(match.homeGoals === null ? "" : String(match.homeGoals));
  const [awayGoals, setAwayGoals] = useState<string>(match.awayGoals === null ? "" : String(match.awayGoals));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // inizializza mappa stats per giocatore dai dati DB
  const initial = useMemo(() => {
    const m = new Map<string, { goals: number; assists: number }>();
    for (const s of match.stats) m.set(s.playerId, { goals: s.goals, assists: s.assists });
    return m;
  }, [match.stats]);

  const [stats, setStats] = useState<Record<string, { goals: string; assists: string }>>(() => {
    const out: Record<string, { goals: string; assists: string }> = {};
    const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players];
    for (const p of allPlayers) {
      const s = initial.get(p.id);
      out[p.id] = {
        goals: s ? String(s.goals) : "0",
        assists: s ? String(s.assists) : "0",
      };
    }
    return out;
  });

  const homePlayers = useMemo(
    () => match.homeTeam.players.slice().sort((a, b) => a.number - b.number),
    [match.homeTeam.players]
  );
  const awayPlayers = useMemo(
    () => match.awayTeam.players.slice().sort((a, b) => a.number - b.number),
    [match.awayTeam.players]
  );

  const totals = useMemo(() => {
    const allPlayers = [...homePlayers, ...awayPlayers];
    let goalsSum = 0;
    let assistsSum = 0;
    for (const p of allPlayers) {
      const g = Number(stats[p.id]?.goals ?? "0") || 0;
      const a = Number(stats[p.id]?.assists ?? "0") || 0;
      goalsSum += g;
      assistsSum += a;
    }
    return { goalsSum, assistsSum };
  }, [stats, homePlayers, awayPlayers]);

  function setPlayerStat(playerId: string, key: "goals" | "assists", value: string) {
    // permette vuoto? No: teniamolo semplice => numeri >=0
    const cleaned = value.replace(/[^\d]/g, "");
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [key]: cleaned === "" ? "0" : cleaned } }));
  }

  async function save() {
    setErr(null);
    setMsg(null);

    const hg = homeGoals.trim() === "" ? null : Number(homeGoals);
    const ag = awayGoals.trim() === "" ? null : Number(awayGoals);

    if (hg !== null && (!Number.isFinite(hg) || hg < 0)) return setErr("Home goals non valido");
    if (ag !== null && (!Number.isFinite(ag) || ag < 0)) return setErr("Away goals non valido");

    // inviamo solo chi ha almeno un goal o un assist > 0
    const allPlayers = [...homePlayers, ...awayPlayers];
    const playerStats = allPlayers
      .map(p => {
        const g = Number(stats[p.id]?.goals ?? "0") || 0;
        const a = Number(stats[p.id]?.assists ?? "0") || 0;
        return { playerId: p.id, goals: g, assists: a };
      })
      .filter(s => s.goals > 0 || s.assists > 0);

    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeGoals: hg === null ? undefined : hg,
          awayGoals: ag === null ? undefined : ag,
          playerStats,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Errore salvataggio");

      setMsg("Salvato ✅");
      // ricarica dati server per vedere conferma e stats aggiornate
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/leagues/${match.leagueId}/calendar`}>← Torna al calendario</Link>
      </div>
      <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>
              {match.homeTeam.name} - {match.awayTeam.name}
            </h1>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Giornata {match.round}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={homeGoals}
              onChange={e => setHomeGoals(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="-"
              inputMode="numeric"
              style={{ width: 70, padding: 10, borderRadius: 10, border: "1px solid #ccc", textAlign: "center", fontSize: 18, fontWeight: 800 }}
            />
            <span style={{ fontWeight: 900, fontSize: 18 }}>:</span>
            <input
              value={awayGoals}
              onChange={e => setAwayGoals(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="-"
              inputMode="numeric"
              style={{ width: 70, padding: 10, borderRadius: 10, border: "1px solid #ccc", textAlign: "center", fontSize: 18, fontWeight: 800 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
          >
            {saving ? "Salvataggio..." : "Salva risultato + stats"}
          </button>

          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Totale gol inseriti: <b>{totals.goalsSum}</b> • Totale assist inseriti: <b>{totals.assistsSum}</b>
          </div>
        </div>

        {msg && <div style={{ marginTop: 10, color: "green" }}>{msg}</div>}
        {err && <div style={{ marginTop: 10, color: "#b00020" }}>{err}</div>}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 12,
        }}
      >
        <TeamStatsCard
          title={match.homeTeam.name}
          players={homePlayers}
          stats={stats}
          setPlayerStat={setPlayerStat}
        />
        <TeamStatsCard
          title={match.awayTeam.name}
          players={awayPlayers}
          stats={stats}
          setPlayerStat={setPlayerStat}
        />
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Note rapide</h2>
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
          <li>Inserisci gol/assist solo per chi serve: gli altri restano 0.</li>
          <li>Puoi riaprire la partita e correggere: il salvataggio sovrascrive i dati della partita.</li>
        </ul>
      </div>
    </div>
  );
}

function TeamStatsCard({
  title,
  players,
  stats,
  setPlayerStat,
}: {
  title: string;
  players: Player[];
  stats: Record<string, { goals: string; assists: string }>;
  setPlayerStat: (playerId: string, key: "goals" | "assists", value: string) => void;
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16 }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>

      <div style={{ display: "grid", gap: 8 }}>
        {players.map(p => (
          <div
            key={p.id}
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              padding: 10,
              display: "grid",
              gridTemplateColumns: "1fr 90px 90px",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 650 }}>
              #{p.number} {p.firstName} {p.lastName}
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Gol</div>
              <input
                value={stats[p.id]?.goals ?? "0"}
                onChange={e => setPlayerStat(p.id, "goals", e.target.value)}
                inputMode="numeric"
                style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ccc", textAlign: "center" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Assist</div>
              <input
                value={stats[p.id]?.assists ?? "0"}
                onChange={e => setPlayerStat(p.id, "assists", e.target.value)}
                inputMode="numeric"
                style={{ width: "100%", padding: 8, borderRadius: 10, border: "1px solid #ccc", textAlign: "center" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}