"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardShell from "src/app/_components/dashboard-shell";

type Team = { id: string; name: string };

type Match = {
  id: string;
  leagueId: string;
  round: number;
  date: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: Team;
  awayTeam: Team;
};

type Filter = "all" | "played" | "pending";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
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

function isPlayed(match: Match) {
  return match.homeGoals !== null && match.awayGoals !== null;
}

export default function CalendarPage() {
  const { leagueId } = useParams<{ leagueId: string }>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [selectedRound, setSelectedRound] = useState<string>("current");
  const [showCalendarTools, setShowCalendarTools] = useState(false);

  const [manualRound, setManualRound] = useState("1");
  const [manualHomeTeamId, setManualHomeTeamId] = useState("");
  const [manualAwayTeamId, setManualAwayTeamId] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const t = await getJSON<any[]>(`/api/leagues/${leagueId}/teams`);
      setTeams(t.map((x) => ({ id: x.id, name: x.name })));

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

  const rounds = useMemo(() => {
    return [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  }, [matches]);

  const currentRound = useMemo(() => {
    if (rounds.length === 0) return null;

    for (const round of rounds) {
      const roundMatches = matches.filter((m) => m.round === round);
      const allPlayed = roundMatches.length > 0 && roundMatches.every(isPlayed);
      if (!allPlayed) return round;
    }

    return rounds[rounds.length - 1] ?? null;
  }, [matches, rounds]);

  useEffect(() => {
    if (!hasSchedule) return;
    if (selectedRound !== "current") return;
    if (currentRound !== null) {
      setManualRound(String(currentRound));
    }
  }, [currentRound, hasSchedule, selectedRound]);

  const playedCount = useMemo(
    () => matches.filter(isPlayed).length,
    [matches]
  );

  const pendingCount = useMemo(
    () => matches.filter((m) => !isPlayed(m)).length,
    [matches]
  );

  const filteredMatches = useMemo(() => {
    let out = matches;

    if (filter === "played") {
      out = out.filter(isPlayed);
    } else if (filter === "pending") {
      out = out.filter((m) => !isPlayed(m));
    }

    const effectiveRound =
      selectedRound === "current" ? currentRound : Number(selectedRound);

    if (effectiveRound && Number.isInteger(effectiveRound)) {
      out = out.filter((m) => m.round === effectiveRound);
    }

    return out;
  }, [matches, filter, selectedRound, currentRound]);

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
      setSelectedRound("current");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function createManualMatch() {
    setErr(null);

    const round = Number(manualRound);

    if (!Number.isInteger(round) || round <= 0) {
      setErr("Inserisci una giornata valida");
      return;
    }

    if (!manualHomeTeamId || !manualAwayTeamId) {
      setErr("Seleziona entrambe le squadre");
      return;
    }

    if (manualHomeTeamId === manualAwayTeamId) {
      setErr("Le due squadre devono essere diverse");
      return;
    }

    try {
      setSubmittingManual(true);

      const res = await fetch(`/api/leagues/${leagueId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          round,
          homeTeamId: manualHomeTeamId,
          awayTeamId: manualAwayTeamId,
          date: manualDate || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore creazione partita");

      setManualHomeTeamId("");
      setManualAwayTeamId("");
      setManualDate("");
      await load();
      setSelectedRound(String(round));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmittingManual(false);
    }
  }

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/8 bg-[var(--card)]/95 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Calendar
          </div>
          <h1 className="mt-2 text-3xl font-black text-[var(--foreground)]">
            Calendario
          </h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/60">
            Mostra automaticamente la giornata corrente. Puoi consultare anche le altre dalla tendina.
          </p>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-[var(--card)]/95 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-2xl px-4 py-2 font-medium transition ${
                  filter === "all"
                    ? "bg-[var(--accent)] text-black"
                    : "border border-white/10 bg-white/5 text-[var(--foreground)]/80"
                }`}
              >
                Tutte
              </button>

              <button
                onClick={() => setFilter("played")}
                className={`rounded-2xl px-4 py-2 font-medium transition ${
                  filter === "played"
                    ? "bg-[var(--accent)] text-black"
                    : "border border-white/10 bg-white/5 text-[var(--foreground)]/80"
                }`}
              >
                Giocate
              </button>

              <button
                onClick={() => setFilter("pending")}
                className={`rounded-2xl px-4 py-2 font-medium transition ${
                  filter === "pending"
                    ? "bg-[var(--accent)] text-black"
                    : "border border-white/10 bg-white/5 text-[var(--foreground)]/80"
                }`}
              >
                Da giocare
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-[var(--foreground)] outline-none"
              >
                <option value="current" className="text-black">
                  Giornata corrente
                </option>
                {rounds.map((round) => (
                  <option key={round} value={String(round)} className="text-black">
                    Giornata {round}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCalendarTools((v) => !v)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--foreground)]/80 hover:bg-white/10"
              >
                {showCalendarTools ? "Nascondi gestione calendario" : "Gestisci calendario"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--foreground)]/65">
            <div className="rounded-2xl bg-white/5 px-4 py-2">
              Totali: <b className="text-[var(--foreground)]">{matches.length}</b>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-2">
              Giocate: <b className="text-[var(--foreground)]">{playedCount}</b>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-2">
              Da giocare: <b className="text-[var(--foreground)]">{pendingCount}</b>
            </div>
            <div className="rounded-2xl bg-white/5 px-4 py-2">
              Corrente:{" "}
              <b className="text-[var(--foreground)]">
                {currentRound ? `Giornata ${currentRound}` : "—"}
              </b>
            </div>
          </div>

          {showCalendarTools ? (
            <div className="mt-6 space-y-6">
              <section className="rounded-[24px] border border-white/8 bg-[var(--card-2)] p-5">
                <div className="mb-3 text-lg font-black text-[var(--foreground)]">
                  Genera calendario automatico
                </div>
                <p className="mb-4 text-sm leading-6 text-[var(--foreground)]/60">
                  Crea un calendario round robin casuale. Le partite esistenti verranno sostituite.
                </p>
                <button
                  onClick={generateRandom}
                  disabled={teams.length < 2}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Genera calendario casuale
                </button>

                {teams.length < 2 ? (
                  <div className="mt-3 text-sm text-[var(--foreground)]/50">
                    Servono almeno 2 squadre.
                  </div>
                ) : null}
              </section>

              <section className="rounded-[24px] border border-white/8 bg-[var(--card-2)] p-5">
                <div className="mb-4 text-lg font-black text-[var(--foreground)]">
                  Inserisci partita manualmente
                </div>

                <div className="grid gap-3 lg:grid-cols-4">
                  <input
                    value={manualRound}
                    onChange={(e) => setManualRound(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Giornata"
                    className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]/35"
                  />

                  <select
                    value={manualHomeTeamId}
                    onChange={(e) => setManualHomeTeamId(e.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-[var(--foreground)] outline-none"
                  >
                    <option value="" className="text-black">Squadra casa</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id} className="text-black">
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={manualAwayTeamId}
                    onChange={(e) => setManualAwayTeamId(e.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-[var(--foreground)] outline-none"
                  >
                    <option value="" className="text-black">Squadra ospite</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id} className="text-black">
                        {team.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="datetime-local"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="h-14 rounded-2xl border border-white/10 bg-white/5 px-4 text-[var(--foreground)] outline-none"
                  />
                </div>

                <button
                  onClick={createManualMatch}
                  disabled={submittingManual}
                  className="mt-4 rounded-2xl bg-[var(--accent)] px-5 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingManual ? "Creazione..." : "Aggiungi partita"}
                </button>
              </section>
            </div>
          ) : null}

          {loading ? <div className="mt-5 text-[var(--foreground)]/60">Caricamento…</div> : null}

          {err ? (
            <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {!loading && !hasSchedule ? (
            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
              <div className="text-xl font-bold text-[var(--foreground)]">Nessuna partita trovata</div>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]/60">
                Usa “Gestisci calendario” per generare o inserire partite.
              </p>
            </div>
          ) : null}

          {!loading && hasSchedule ? (
            <div className="mt-5 space-y-4">
              {grouped.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.04] px-4 py-4 text-[var(--foreground)]/55">
                  Nessuna partita per questo filtro.
                </div>
              ) : null}

              {grouped.map(([round, ms]) => (
                <div
                  key={round}
                  className="rounded-[24px] border border-white/8 bg-[var(--card-2)] p-5"
                >
                  <div className="mb-4 text-xl font-black text-[var(--foreground)]">
                    Giornata {round}
                  </div>

                  <div className="space-y-3">
  {ms.map((m) => {
    const played = isPlayed(m);

    return (
      <div
        key={m.id}
        className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
      >

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div className="min-w-0 flex-1">
    <div className="break-words text-base font-bold text-[var(--foreground)] sm:text-lg">
      {m.homeTeam.name}{" "}
      <span className="text-[var(--foreground)]/35">vs</span>{" "}
      {m.awayTeam.name}
    </div>

    {!played ? (
      <div className="mt-1 text-sm text-[var(--foreground)]/55">
        Risultato non inserito
      </div>
    ) : (
      <div className="mt-3">
        <Link
          href={`/leagues/${leagueId}/matches/${m.id}`}
          className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--foreground)]/80 hover:bg-white/10"
        >
          Modifica risultato
        </Link>
      </div>
    )}
  </div>

  <div className="w-full shrink-0 sm:w-auto">
    {played ? (
      <div className="inline-flex rounded-2xl bg-[var(--accent)] px-4 py-2 text-lg font-black text-black">
        {m.homeGoals} - {m.awayGoals}
      </div>
    ) : (
      <Link
        href={`/leagues/${leagueId}/matches/${m.id}`}
        className="inline-flex w-full justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black sm:w-auto"
      >
        Inserisci risultato
      </Link>
    )}
  </div>
</div>

      </div>
    );
  })}
</div>

                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}