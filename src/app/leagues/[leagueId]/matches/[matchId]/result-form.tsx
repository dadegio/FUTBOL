"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CircleDot, ShieldCheck } from "lucide-react";
import DashboardShell from "src/app/_components/dashboard-shell";
import Card from "src/app/_components/ui/card";
import Button from "src/app/_components/ui/button";
import Badge from "src/app/_components/ui/badge";
import { useAuth, authFetch } from "@/lib/client-auth";
import { FUTPOLI_RULES } from "@/lib/tournament-rules";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  teamId: string;
  position?: string | null;
  photoUrl?: string | null;
  registrationStatus?: string;
  isEligibleForMatchSheet?: boolean;
  adminMissingItems?: string[];
};

type Team = {
  id: string;
  name: string;
  badgeUrl?: string | null;
  players: Player[];
};

type StatRow = {
  id: string;
  matchId: string;
  playerId: string;
  goals: number;
  assists: number;
};

type Match = {
  id: string;
  round: number;
  date: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: Team;
  awayTeam: Team;
  stats: StatRow[];
  sheetPlayers?: Array<{ playerId: string; teamId: string }>;
  leagueId: string;
};

function TeamCrest({ name, badgeUrl, size = 44 }: { name: string; badgeUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (badgeUrl) {
    return (
      <img
        src={badgeUrl}
        alt={`Logo ${name}`}
        className="shrink-0 object-contain"
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center bg-[var(--card-2)] font-black text-[var(--accent)]"
      style={{ width: size, height: size, borderRadius: size * 0.28, fontSize: size * 0.34 }}
    >
      {initials || "?"}
    </div>
  );
}

function isPlayerEligible(player: Player) {
  return player.isEligibleForMatchSheet === true;
}

function playerEligibilityLabel(player: Player, admin = false) {
  if (isPlayerEligible(player)) return "Iscrizione OK";
  if (admin && player.adminMissingItems?.length) {
    return `Da completare · ${player.adminMissingItems.join(", ")}`;
  }
  return player.registrationStatus ?? "Da completare";
}

export default function MatchResultForm({ match }: { match: Match }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const canEdit =
    !authLoading &&
    (user?.role === "ADMIN" ||
      (user?.role === "CAPTAIN" &&
        (user.teamId === match.homeTeam?.id || user.teamId === match.awayTeam?.id)));

  const router = useRouter();

  const [homeGoals, setHomeGoals] = useState<string>(match.homeGoals === null ? "" : String(match.homeGoals));
  const [awayGoals, setAwayGoals] = useState<string>(match.awayGoals === null ? "" : String(match.awayGoals));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toLocalDatetimeValue = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [dateValue, setDateValue] = useState(() => toLocalDatetimeValue(match.date));
  const [savingDate, setSavingDate] = useState(false);
  const [dateMsg, setDateMsg] = useState<string | null>(null);
  const [dateErr, setDateErr] = useState<string | null>(null);

  const initial = useMemo(() => {
    const m = new Map<string, { goals: number; assists: number }>();
    for (const s of match.stats) m.set(s.playerId, { goals: s.goals, assists: s.assists });
    return m;
  }, [match.stats]);

  const [stats, setStats] = useState<Record<string, { goals: string; assists: string }>>(() => {
    const out: Record<string, { goals: string; assists: string }> = {};
    for (const p of [...match.homeTeam.players, ...match.awayTeam.players]) {
      const s = initial.get(p.id);
      out[p.id] = { goals: s ? String(s.goals) : "", assists: s ? String(s.assists) : "" };
    }
    return out;
  });

  const [sheet, setSheet] = useState<Record<string, boolean>>(() => {
    const selected = new Set(match.sheetPlayers?.map((row) => row.playerId) ?? []);
    const out: Record<string, boolean> = {};
    for (const p of [...match.homeTeam.players, ...match.awayTeam.players]) out[p.id] = selected.has(p.id);
    return out;
  });

  const homePlayers = useMemo(() => match.homeTeam.players.slice().sort((a, b) => a.number - b.number), [match.homeTeam.players]);
  const awayPlayers = useMemo(() => match.awayTeam.players.slice().sort((a, b) => a.number - b.number), [match.awayTeam.players]);

  const totals = useMemo(() => {
    let goalsSum = 0;
    let assistsSum = 0;
    let homeSheetCount = 0;
    let awaySheetCount = 0;

    for (const p of homePlayers) {
      goalsSum += Number(stats[p.id]?.goals || 0);
      assistsSum += Number(stats[p.id]?.assists || 0);
      if (sheet[p.id]) homeSheetCount += 1;
    }

    for (const p of awayPlayers) {
      goalsSum += Number(stats[p.id]?.goals || 0);
      assistsSum += Number(stats[p.id]?.assists || 0);
      if (sheet[p.id]) awaySheetCount += 1;
    }

    return { goalsSum, assistsSum, homeSheetCount, awaySheetCount };
  }, [stats, sheet, homePlayers, awayPlayers]);

  const missingHome = Math.max(0, FUTPOLI_RULES.minPlayersInMatchSheet - totals.homeSheetCount);
  const missingAway = Math.max(0, FUTPOLI_RULES.minPlayersInMatchSheet - totals.awaySheetCount);

  function setPlayerStat(playerId: string, key: "goals" | "assists", value: string) {
    const cleaned = value.replace(/[^\d]/g, "");
    setStats((prev) => ({ ...prev, [playerId]: { ...prev[playerId], [key]: cleaned === "" ? "0" : cleaned } }));
  }

  function toggleSheet(playerId: string, checked: boolean) {
    setSheet((prev) => ({ ...prev, [playerId]: checked }));
  }

  async function saveDate(clear = false) {
    setDateErr(null);
    setDateMsg(null);
    setSavingDate(true);
    try {
      const res = await authFetch(`/api/matches/${match.id}/date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: clear ? null : dateValue ? new Date(dateValue).toISOString() : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore salvataggio data");
      if (clear) setDateValue("");
      setDateMsg(clear ? "Data rimossa" : "Data salvata");
      router.refresh();
    } catch (e: any) {
      setDateErr(e.message);
    } finally {
      setSavingDate(false);
    }
  }

  async function save() {
    setErr(null);
    setMsg(null);

    const hg = homeGoals.trim() === "" ? null : Number(homeGoals);
    const ag = awayGoals.trim() === "" ? null : Number(awayGoals);

    if (hg !== null && (!Number.isFinite(hg) || hg < 0)) {
      setErr("Gol squadra casa non valido");
      return;
    }

    if (ag !== null && (!Number.isFinite(ag) || ag < 0)) {
      setErr("Gol squadra ospite non valido");
      return;
    }

    if (missingHome > 0 || missingAway > 0) {
      const parts = [];
      if (missingHome > 0) parts.push(`mancano ${missingHome} giocatori nella distinta di ${match.homeTeam.name}`);
      if (missingAway > 0) parts.push(`mancano ${missingAway} giocatori nella distinta di ${match.awayTeam.name}`);
      setErr(parts.join("; "));
      return;
    }

    const sheetPlayerIds = [...homePlayers, ...awayPlayers].filter((p) => sheet[p.id]).map((p) => p.id);
    const playerStats = [...homePlayers, ...awayPlayers]
      .map((p) => ({ playerId: p.id, goals: Number(stats[p.id]?.goals || 0), assists: Number(stats[p.id]?.assists || 0) }))
      .filter((s) => s.goals > 0 || s.assists > 0);

    setSaving(true);
    try {
      const res = await authFetch(`/api/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeGoals: hg === null ? undefined : hg, awayGoals: ag === null ? undefined : ag, playerStats, sheetPlayerIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore salvataggio");
      setMsg("Salvato");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const played = homeGoals !== "" && awayGoals !== "";
  const hg = Number(homeGoals);
  const ag = Number(awayGoals);

  return (
    <DashboardShell leagueId={match.leagueId}>
      <div className="w-full space-y-5 pb-8">
        <div className="flex items-center gap-2 pt-1">
          <Link href={`/leagues/${match.leagueId}/calendar`} className="flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            <ChevronLeft size={16} /> Calendario
          </Link>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="text-sm text-[var(--muted)]">Giornata {match.round}</span>
        </div>

        {msg && <Badge variant="success">{msg}</Badge>}
        {err && <Badge variant="error">{err}</Badge>}

        <Card className="overflow-hidden !p-0">
          <div className="matchroom-hero p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">Match Center</p>
                <h1 className="mt-1 text-2xl font-black tracking-[-0.06em] text-[var(--foreground)] sm:text-4xl">
                  {match.homeTeam.name} <span className="text-[var(--muted)]">vs</span> {match.awayTeam.name}
                </h1>
              </div>
              <div className="hidden rounded-full border border-[var(--border)] bg-black/20 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--muted)] sm:block">
                distinta / risultato
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <TeamScoreBlock team={match.homeTeam} faded={played && hg < ag} />
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 rounded-[28px] border border-white/10 bg-black/30 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <ScoreInput value={homeGoals} setValue={setHomeGoals} readOnly={!canEdit} />
                  <span className="text-2xl font-black text-[var(--muted)]">:</span>
                  <ScoreInput value={awayGoals} setValue={setAwayGoals} readOnly={!canEdit} />
                </div>
                {played && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent)]">
                    {hg > ag ? `${match.homeTeam.name} avanti` : hg < ag ? `${match.awayTeam.name} avanti` : "Pareggio"}
                  </span>
                )}
              </div>
              <TeamScoreBlock team={match.awayTeam} faded={played && ag < hg} />
            </div>
          </div>
        </Card>

        {canEdit && (
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">Data e ora</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Programma la gara o rimuovi la data dal calendario.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-11 min-w-[220px] flex-1 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
                <Button onClick={() => saveDate(false)} disabled={savingDate || !dateValue} size="sm">{savingDate ? "…" : "Salva data"}</Button>
                {dateValue && <Button variant="secondary" onClick={() => saveDate(true)} disabled={savingDate} size="sm">Rimuovi</Button>}
              </div>
            </div>
            {dateMsg && <p className="mt-2 text-xs font-semibold text-emerald-400">{dateMsg}</p>}
            {dateErr && <p className="mt-2 text-xs font-semibold text-red-300">{dateErr}</p>}
          </Card>
        )}

        {!canEdit && !authLoading && <p className="px-1 text-sm text-[var(--muted)]">Sola lettura — accedi come admin o capitano per modificare.</p>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TeamStatsCard title={match.homeTeam.name} players={homePlayers} stats={stats} sheet={sheet} toggleSheet={toggleSheet} setPlayerStat={setPlayerStat} readOnly={!canEdit} isAdmin={isAdmin} />
          <TeamStatsCard title={match.awayTeam.name} players={awayPlayers} stats={stats} sheet={sheet} toggleSheet={toggleSheet} setPlayerStat={setPlayerStat} readOnly={!canEdit} isAdmin={isAdmin} />
        </div>

        {canEdit && (
          <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--tabbar-bg)] px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:bottom-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span><b className="text-[var(--foreground)]">{totals.goalsSum}</b> gol</span>
              <span><b className="text-[var(--foreground)]">{totals.assistsSum}</b> assist</span>
              <SheetCounter team={match.homeTeam.name} count={totals.homeSheetCount} missing={missingHome} />
              <SheetCounter team={match.awayTeam.name} count={totals.awaySheetCount} missing={missingAway} />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Salvataggio…" : "Salva risultato"}</Button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function TeamScoreBlock({ team, faded }: { team: Team; faded?: boolean }) {
  return (
    <div className={["flex min-w-0 flex-col items-center gap-2 text-center", faded ? "opacity-55" : ""].join(" ")}>
      <TeamCrest name={team.name} badgeUrl={team.badgeUrl ?? null} size={52} />
      <span className="max-w-full truncate text-sm font-black text-[var(--foreground)] sm:text-base">{team.name}</span>
    </div>
  );
}

function ScoreInput({ value, setValue, readOnly }: { value: string; setValue: (v: string) => void; readOnly?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => !readOnly && setValue(e.target.value.replace(/[^\d]/g, ""))}
      placeholder="–"
      inputMode="numeric"
      readOnly={readOnly}
      className="h-16 w-16 rounded-2xl border border-white/10 bg-white/[0.05] text-center text-[42px] font-black leading-none text-[var(--foreground)] outline-none placeholder:text-[var(--border-strong)] focus:border-[var(--accent)] sm:h-20 sm:w-20 sm:text-[54px]"
    />
  );
}

function SheetCounter({ team, count, missing }: { team: string; count: number; missing: number }) {
  return (
    <span className={missing ? "text-amber-300" : "text-[var(--muted)]"}>
      <b className="text-[var(--foreground)]">{count}</b>/{FUTPOLI_RULES.minPlayersInMatchSheet} {team.slice(0, 10)}
      {missing ? ` · -${missing}` : ""}
    </span>
  );
}

function TeamStatsCard({
  title,
  players,
  stats,
  sheet,
  toggleSheet,
  setPlayerStat,
  readOnly,
  isAdmin,
}: {
  title: string;
  players: Player[];
  stats: Record<string, { goals: string; assists: string }>;
  sheet: Record<string, boolean>;
  toggleSheet: (playerId: string, checked: boolean) => void;
  setPlayerStat: (playerId: string, key: "goals" | "assists", value: string) => void;
  readOnly?: boolean;
  isAdmin?: boolean;
}) {
  const eligibleCount = players.filter(isPlayerEligible).length;

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
        <div>
          <h2 className="text-base font-black text-[var(--foreground)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">{eligibleCount} giocatori selezionabili</p>
        </div>
        <span className="rounded-full bg-[var(--card-2)] px-3 py-1 text-xs font-black text-[var(--muted)]">Distinta</span>
      </div>

      {players.length === 0 ? (
        <p className="px-4 py-4 text-sm text-[var(--muted)]">Nessun giocatore.</p>
      ) : (
        <div>
          {players.map((p, i) => {
            const hasStats = Number(stats[p.id]?.goals || 0) > 0 || Number(stats[p.id]?.assists || 0) > 0;
            const eligible = isPlayerEligible(p);
            return (
              <div
                key={p.id}
                className={[
                  "grid items-center gap-3 px-4 py-3",
                  i < players.length - 1 ? "border-b border-[var(--border)]" : "",
                  hasStats ? "bg-[var(--accent-soft)]" : "",
                ].join(" ")}
                style={{ gridTemplateColumns: "32px minmax(0,1fr) auto auto" }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--card-2)] text-[11px] font-black text-[var(--muted)]">{p.number}</div>

                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-black text-[var(--foreground)]">{p.firstName} {p.lastName}</span>
                  <span className={["mt-0.5 flex items-center gap-1 truncate text-[10px] font-bold", eligible ? "text-emerald-300" : "text-amber-300"].join(" ")}>
                    {eligible ? <ShieldCheck size={12} /> : <CircleDot size={12} />}
                    {playerEligibilityLabel(p, isAdmin)}
                  </span>
                </div>

                <label className="flex items-center gap-1 text-[10px] font-black text-[var(--muted)]">
                  <input type="checkbox" checked={sheet[p.id] ?? false} disabled={readOnly || !eligible} onChange={(event) => toggleSheet(p.id, event.target.checked)} />
                  Distinta
                </label>

                <div className="flex items-center gap-1.5">
                  <StatInput label="G" value={stats[p.id]?.goals ?? ""} onChange={(v) => setPlayerStat(p.id, "goals", v)} readOnly={readOnly} />
                  <StatInput label="A" value={stats[p.id]?.assists ?? ""} onChange={(v) => setPlayerStat(p.id, "assists", v)} readOnly={readOnly} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function StatInput({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 text-[10px] font-black text-[var(--muted)]">{label}</span>
      <input
        value={value === "0" ? "" : value}
        placeholder="0"
        onChange={(e) => !readOnly && onChange(e.target.value)}
        inputMode="numeric"
        readOnly={readOnly}
        className={["h-8 w-10 rounded-xl border text-center text-[13px] font-black text-[var(--foreground)] outline-none placeholder:text-[var(--border-strong)]", readOnly ? "cursor-default border-transparent bg-transparent" : "border-[var(--border)] bg-[var(--card-2)] focus:border-[var(--accent)]"].join(" ")}
      />
    </div>
  );
}
