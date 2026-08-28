"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  BarChart3,
  Goal,
  Medal,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
} from "lucide-react";
import DashboardShell from "src/app/_components/dashboard-shell";
import Card from "src/app/_components/ui/card";
import Badge from "src/app/_components/ui/badge";
import OptimizedPlayerImage from "src/app/_components/optimized-player-image";

type FormResult = "W" | "D" | "L";

type Overview = {
  completedMatches: number;
  totalGoals: number;
  averageGoalsPerMatch: number;
  totalCleanSheets: number;
  draws: number;
  homeWins: number;
  awayWins: number;
  teams: number;
  players: number;
};

type TeamStat = {
  teamId: string;
  teamName: string;
  badgeUrl: string | null;
  colorHex: string | null;
  secondaryColorHex: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  pointsPerGame: number;
  goalsPerGame: number;
  goalsAgainstPerGame: number;
  cleanSheets: number;
  form: FormResult[];
  winStreak: number;
  unbeatenStreak: number;
};

type PlayerStat = {
  playerId: string;
  firstName: string;
  lastName: string;
  number: number;
  position: string | null;
  photoUrl: string | null;
  photoZoom: number;
  photoPositionX: number;
  photoPositionY: number;
  isTeamCaptain: boolean;
  teamId: string;
  teamName: string;
  teamBadgeUrl: string | null;
  appearances: number;
  goals: number;
  assists: number;
  contributions: number;
  goalsPerAppearance: number;
  assistsPerAppearance: number;
  contributionsPerAppearance: number;
};

type MatchRecord = {
  matchId: string;
  date: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
};

type StatsResponse = {
  overview: Overview;
  teamStats: TeamStat[];
  playerStats: PlayerStat[];
  leaders: {
    topScorer: PlayerStat | null;
    topAssister: PlayerStat | null;
    topContributor: PlayerStat | null;
    mostAppearances: PlayerStat | null;
  };
  records: {
    bestAttack: TeamStat | null;
    bestDefense: TeamStat | null;
    mostCleanSheets: TeamStat | null;
    biggestWin: (MatchRecord & { margin: number }) | null;
    highestScoringMatch: (MatchRecord & { totalGoals: number }) | null;
    bestSingleMatch:
      | (MatchRecord & {
          playerId: string;
          playerName: string;
          teamName: string;
          goals: number;
          assists: number;
        })
      | null;
    longestWinningStreak:
      | {
          teamId: string;
          teamName: string;
          badgeUrl: string | null;
          longestWinningStreak: number;
          longestUnbeatenStreak: number;
        }
      | null;
    longestUnbeatenStreak:
      | {
          teamId: string;
          teamName: string;
          badgeUrl: string | null;
          longestWinningStreak: number;
          longestUnbeatenStreak: number;
        }
      | null;
  };
};

type TabKey = "overview" | "teams" | "players" | "records" | "compare";
type PlayerSort = "contributions" | "goals" | "assists" | "appearances" | "rate";
type TeamSort = "points" | "attack" | "defense" | "cleanSheets" | "form";

const EMPTY_STATS: StatsResponse = {
  overview: {
    completedMatches: 0,
    totalGoals: 0,
    averageGoalsPerMatch: 0,
    totalCleanSheets: 0,
    draws: 0,
    homeWins: 0,
    awayWins: 0,
    teams: 0,
    players: 0,
  },
  teamStats: [],
  playerStats: [],
  leaders: {
    topScorer: null,
    topAssister: null,
    topContributor: null,
    mostAppearances: null,
  },
  records: {
    bestAttack: null,
    bestDefense: null,
    mostCleanSheets: null,
    biggestWin: null,
    highestScoringMatch: null,
    bestSingleMatch: null,
    longestWinningStreak: null,
    longestUnbeatenStreak: null,
  },
};

export default function StatsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/leagues/${leagueId}/stats`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Errore statistiche");
        setStats(data);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Errore statistiche");
      } finally {
        setLoading(false);
      }
    })();
  }, [leagueId]);

  if (!leagueId) return <div>Caricamento…</div>;

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="w-full space-y-5 pb-10">
        <header className="pt-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                Numeri del torneo
              </div>
              <h1 className="text-[32px] font-black tracking-[-0.06em] text-[var(--foreground)] md:text-[38px]">
                Statistiche
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                Prestazioni, forma, record e confronti aggiornati automaticamente dai risultati inseriti.
              </p>
            </div>

            {!loading && stats.overview.completedMatches > 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 py-2 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Campione
                </div>
                <div className="text-sm font-black text-[var(--foreground)]">
                  {stats.overview.completedMatches} partite
                </div>
              </div>
            )}
          </div>
        </header>

        {err && <Badge variant="error">{err}</Badge>}

        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-2">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")} label="Panoramica" />
            <TabButton active={tab === "teams"} onClick={() => setTab("teams")} label="Squadre" />
            <TabButton active={tab === "players"} onClick={() => setTab("players")} label="Giocatori" />
            <TabButton active={tab === "records"} onClick={() => setTab("records")} label="Record" />
            <TabButton active={tab === "compare"} onClick={() => setTab("compare")} label="Confronta" />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : stats.overview.completedMatches === 0 ? (
          <EmptyState />
        ) : (
          <>
            {tab === "overview" && <OverviewTab stats={stats} leagueId={leagueId} />}
            {tab === "teams" && <TeamsTab teams={stats.teamStats} leagueId={leagueId} />}
            {tab === "players" && <PlayersTab players={stats.playerStats} leagueId={leagueId} />}
            {tab === "records" && <RecordsTab stats={stats} leagueId={leagueId} />}
            {tab === "compare" && <CompareTab stats={stats} leagueId={leagueId} />}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function OverviewTab({ stats, leagueId }: { stats: StatsResponse; leagueId: string }) {
  const { overview, leaders, teamStats, records } = stats;
  const topForm = [...teamStats]
    .sort((a, b) => formScore(b.form) - formScore(a.form) || b.points - a.points)
    .slice(0, 5);
  const maxGoals = Math.max(...teamStats.map((team) => team.gf), 1);
  const maxDefense = Math.max(...teamStats.map((team) => team.ga), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={<Activity size={18} />} label="Partite giocate" value={overview.completedMatches} />
        <KpiCard icon={<Goal size={18} />} label="Gol totali" value={overview.totalGoals} />
        <KpiCard icon={<BarChart3 size={18} />} label="Gol / partita" value={overview.averageGoalsPerMatch.toFixed(2)} />
        <KpiCard icon={<ShieldCheck size={18} />} label="Clean sheet" value={overview.totalCleanSheets} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="!p-0 overflow-hidden">
          <SectionHeader icon={<Sparkles size={18} />} title="Leader del torneo" subtitle="Chi sta incidendo di più" />
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
            <LeaderCell label="Re dei gol" player={leaders.topScorer} value={leaders.topScorer?.goals ?? 0} suffix="gol" leagueId={leagueId} />
            <LeaderCell label="Assistman" player={leaders.topAssister} value={leaders.topAssister?.assists ?? 0} suffix="assist" leagueId={leagueId} />
            <LeaderCell label="Contributi" player={leaders.topContributor} value={leaders.topContributor?.contributions ?? 0} suffix="G+A" leagueId={leagueId} />
            <LeaderCell label="Presenze" player={leaders.mostAppearances} value={leaders.mostAppearances?.appearances ?? 0} suffix="gare" leagueId={leagueId} />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Forma ultime 5" subtitle="3 punti vittoria · 1 pareggio" />
          <div className="mt-4 space-y-3">
            {topForm.map((team, index) => (
              <Link
                key={team.teamId}
                href={`/leagues/${leagueId}/teams/${team.teamId}`}
                className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-[var(--card-2)]"
              >
                <span className="w-5 text-center text-xs font-black tabular-nums text-[var(--muted)]">{index + 1}</span>
                <TeamLogo name={team.teamName} badgeUrl={team.badgeUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--foreground)]">{team.teamName}</span>
                <FormDots form={team.form} />
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Potenza offensiva" subtitle="Gol segnati complessivi" />
          <div className="mt-5 space-y-4">
            {[...teamStats]
              .sort((a, b) => b.gf - a.gf)
              .slice(0, 5)
              .map((team) => (
                <TeamBar
                  key={team.teamId}
                  team={team}
                  value={team.gf}
                  max={maxGoals}
                  label={`${team.gf} gol`}
                  leagueId={leagueId}
                />
              ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title="Difese a confronto" subtitle="Meno gol subiti è meglio" />
          <div className="mt-5 space-y-4">
            {[...teamStats]
              .filter((team) => team.played > 0)
              .sort((a, b) => a.ga - b.ga)
              .slice(0, 5)
              .map((team) => (
                <TeamBar
                  key={team.teamId}
                  team={team}
                  value={maxDefense - team.ga + 1}
                  max={maxDefense + 1}
                  label={`${team.ga} subiti`}
                  leagueId={leagueId}
                />
              ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MiniRecord
          icon={<Trophy size={18} />}
          label="Miglior attacco"
          title={records.bestAttack?.teamName ?? "—"}
          detail={records.bestAttack ? `${records.bestAttack.gf} gol` : "Nessun dato"}
        />
        <MiniRecord
          icon={<ShieldCheck size={18} />}
          label="Miglior difesa"
          title={records.bestDefense?.teamName ?? "—"}
          detail={records.bestDefense ? `${records.bestDefense.ga} gol subiti` : "Nessun dato"}
        />
        <MiniRecord
          icon={<Swords size={18} />}
          label="Partita più ricca"
          title={records.highestScoringMatch ? `${records.highestScoringMatch.homeTeamName} ${records.highestScoringMatch.homeGoals}-${records.highestScoringMatch.awayGoals} ${records.highestScoringMatch.awayTeamName}` : "—"}
          detail={records.highestScoringMatch ? `${records.highestScoringMatch.totalGoals} gol complessivi` : "Nessun dato"}
        />
      </section>
    </div>
  );
}

function TeamsTab({ teams, leagueId }: { teams: TeamStat[]; leagueId: string }) {
  const [sort, setSort] = useState<TeamSort>("points");

  const sorted = useMemo(() => {
    const rows = [...teams];
    if (sort === "attack") return rows.sort((a, b) => b.gf - a.gf || b.goalsPerGame - a.goalsPerGame);
    if (sort === "defense") return rows.sort((a, b) => a.ga - b.ga || a.goalsAgainstPerGame - b.goalsAgainstPerGame);
    if (sort === "cleanSheets") return rows.sort((a, b) => b.cleanSheets - a.cleanSheets || a.ga - b.ga);
    if (sort === "form") return rows.sort((a, b) => formScore(b.form) - formScore(a.form) || b.points - a.points);
    return rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  }, [teams, sort]);

  return (
    <div className="space-y-4">
      <Card variant="inner" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[var(--foreground)]">Analisi squadre</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">Medie, clean sheet e forma recente.</div>
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as TeamSort)}
          className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none"
        >
          <option value="points">Ordina per punti</option>
          <option value="attack">Miglior attacco</option>
          <option value="defense">Miglior difesa</option>
          <option value="cleanSheets">Clean sheet</option>
          <option value="form">Forma recente</option>
        </select>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        {sorted.map((team, index) => (
          <Link key={team.teamId} href={`/leagues/${leagueId}/teams/${team.teamId}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-[var(--accent)]">
              <div className="flex items-start gap-3">
                <div className="pt-1 text-xs font-black tabular-nums text-[var(--muted)]">#{index + 1}</div>
                <TeamLogo name={team.teamName} badgeUrl={team.badgeUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-black tracking-[-0.03em] text-[var(--foreground)]">{team.teamName}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <FormDots form={team.form} />
                        {team.unbeatenStreak >= 2 && (
                          <span className="text-[10px] font-bold text-[var(--muted)]">{team.unbeatenStreak} senza sconfitte</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums text-[var(--foreground)]">{team.points}</div>
                      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">punti</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[var(--border)] pt-3">
                    <SmallMetric label="G" value={team.played} />
                    <SmallMetric label="GF" value={team.gf} />
                    <SmallMetric label="GS" value={team.ga} />
                    <SmallMetric label="CS" value={team.cleanSheets} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <SmallMetric label="PT/G" value={team.pointsPerGame.toFixed(2)} muted />
                    <SmallMetric label="GF/G" value={team.goalsPerGame.toFixed(2)} muted />
                    <SmallMetric label="GS/G" value={team.goalsAgainstPerGame.toFixed(2)} muted />
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PlayersTab({ players, leagueId }: { players: PlayerStat[]; leagueId: string }) {
  const [sort, setSort] = useState<PlayerSort>("contributions");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = normalized
      ? players.filter((player) =>
          `${player.firstName} ${player.lastName} ${player.teamName}`.toLowerCase().includes(normalized)
        )
      : [...players];

    if (sort === "goals") return rows.sort((a, b) => b.goals - a.goals || b.assists - a.assists);
    if (sort === "assists") return rows.sort((a, b) => b.assists - a.assists || b.goals - a.goals);
    if (sort === "appearances") return rows.sort((a, b) => b.appearances - a.appearances || b.contributions - a.contributions);
    if (sort === "rate") return rows.sort((a, b) => b.contributionsPerAppearance - a.contributionsPerAppearance || b.contributions - a.contributions);
    return rows.sort((a, b) => b.contributions - a.contributions || b.goals - a.goals || b.assists - a.assists);
  }, [players, query, sort]);

  return (
    <div className="space-y-4">
      <Card variant="inner" className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca giocatore o squadra"
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-10 pr-3 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] md:text-sm"
          />
        </label>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as PlayerSort)}
          className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] outline-none"
        >
          <option value="contributions">Gol + Assist</option>
          <option value="goals">Gol</option>
          <option value="assists">Assist</option>
          <option value="appearances">Presenze</option>
          <option value="rate">G+A per presenza</option>
        </select>
      </Card>

      <Card className="overflow-hidden !p-0">
        <div className="grid grid-cols-[32px_58px_minmax(0,1fr)_44px_44px_48px] items-center border-b border-[var(--border)] px-3 py-3 text-[10px] font-black uppercase tracking-wide text-[var(--muted)] sm:grid-cols-[36px_64px_minmax(0,1fr)_58px_58px_58px_72px]">
          <div>#</div>
          <div></div>
          <div>Giocatore</div>
          <div className="text-center">G</div>
          <div className="text-center">A</div>
          <div className="text-center">G+A</div>
          <div className="hidden text-right sm:block">G+A/G</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-6 text-sm text-[var(--muted)]">Nessun giocatore trovato.</div>
        ) : (
          filtered.map((player, index) => (
            <Link
              key={player.playerId}
              href={`/leagues/${leagueId}/players/${player.playerId}`}
              className="grid grid-cols-[32px_58px_minmax(0,1fr)_44px_44px_48px] items-center border-b border-[var(--border)] px-3 py-3 transition hover:bg-[var(--card-2)] last:border-b-0 sm:grid-cols-[36px_64px_minmax(0,1fr)_58px_58px_58px_72px]"
            >
              <div className="text-xs font-black tabular-nums text-[var(--muted)]">{index + 1}</div>
              <PlayerAvatar player={player} />
              <div className="min-w-0 pr-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate text-sm font-black text-[var(--foreground)]">
                    {player.firstName} {player.lastName}
                  </div>
                  {player.isTeamCaptain && <span title="Capitano" className="shrink-0 text-xs">👑</span>}
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <TeamLogo name={player.teamName} badgeUrl={player.teamBadgeUrl} size="xs" />
                  <span className="truncate">#{player.number} · {player.teamName}</span>
                  <span className="hidden sm:inline">· {player.appearances} pres.</span>
                </div>
              </div>
              <MetricNumber value={player.goals} />
              <MetricNumber value={player.assists} />
              <MetricNumber value={player.contributions} strong />
              <div className="hidden text-right text-sm font-black tabular-nums text-[var(--foreground)] sm:block">
                {player.contributionsPerAppearance.toFixed(2)}
              </div>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}

function RecordsTab({ stats, leagueId }: { stats: StatsResponse; leagueId: string }) {
  const { records, leaders } = stats;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RecordCard icon={<Goal size={20} />} eyebrow="Miglior attacco" title={records.bestAttack?.teamName ?? "—"} value={records.bestAttack ? `${records.bestAttack.gf} gol` : "Nessun dato"} />
      <RecordCard icon={<ShieldCheck size={20} />} eyebrow="Miglior difesa" title={records.bestDefense?.teamName ?? "—"} value={records.bestDefense ? `${records.bestDefense.ga} subiti` : "Nessun dato"} />
      <RecordCard icon={<ShieldCheck size={20} />} eyebrow="Più clean sheet" title={records.mostCleanSheets?.teamName ?? "—"} value={records.mostCleanSheets ? `${records.mostCleanSheets.cleanSheets} clean sheet` : "Nessun dato"} />
      <RecordCard icon={<Trophy size={20} />} eyebrow="Serie di vittorie" title={records.longestWinningStreak?.teamName ?? "—"} value={records.longestWinningStreak ? `${records.longestWinningStreak.longestWinningStreak} consecutive` : "Nessun dato"} />
      <RecordCard icon={<Activity size={20} />} eyebrow="Imbattibilità" title={records.longestUnbeatenStreak?.teamName ?? "—"} value={records.longestUnbeatenStreak ? `${records.longestUnbeatenStreak.longestUnbeatenStreak} partite` : "Nessun dato"} />
      <RecordCard icon={<Medal size={20} />} eyebrow="Più gol in una gara" title={records.bestSingleMatch?.playerName ?? "—"} value={records.bestSingleMatch ? `${records.bestSingleMatch.goals} gol · ${records.bestSingleMatch.homeTeamName} ${records.bestSingleMatch.homeGoals}-${records.bestSingleMatch.awayGoals} ${records.bestSingleMatch.awayTeamName}` : "Nessun dato"} />
      <RecordCard icon={<Swords size={20} />} eyebrow="Vittoria più larga" title={records.biggestWin ? `${records.biggestWin.homeTeamName} ${records.biggestWin.homeGoals}-${records.biggestWin.awayGoals} ${records.biggestWin.awayTeamName}` : "—"} value={records.biggestWin ? `Scarto di ${records.biggestWin.margin}` : "Nessun dato"} />
      <RecordCard icon={<Sparkles size={20} />} eyebrow="Partita più spettacolare" title={records.highestScoringMatch ? `${records.highestScoringMatch.homeTeamName} ${records.highestScoringMatch.homeGoals}-${records.highestScoringMatch.awayGoals} ${records.highestScoringMatch.awayTeamName}` : "—"} value={records.highestScoringMatch ? `${records.highestScoringMatch.totalGoals} gol totali` : "Nessun dato"} />
      <Link href={leaders.topContributor ? `/leagues/${leagueId}/players/${leaders.topContributor.playerId}` : "#"} className="block">
        <RecordCard icon={<Target size={20} />} eyebrow="Re dei contributi" title={leaders.topContributor ? `${leaders.topContributor.firstName} ${leaders.topContributor.lastName}` : "—"} value={leaders.topContributor ? `${leaders.topContributor.contributions} G+A in ${leaders.topContributor.appearances} presenze` : "Nessun dato"} />
      </Link>
    </div>
  );
}

function CompareTab({ stats, leagueId }: { stats: StatsResponse; leagueId: string }) {
  const [mode, setMode] = useState<"teams" | "players">("teams");
  const [leftTeamId, setLeftTeamId] = useState(stats.teamStats[0]?.teamId ?? "");
  const [rightTeamId, setRightTeamId] = useState(stats.teamStats[1]?.teamId ?? stats.teamStats[0]?.teamId ?? "");
  const [leftPlayerId, setLeftPlayerId] = useState(stats.playerStats[0]?.playerId ?? "");
  const [rightPlayerId, setRightPlayerId] = useState(stats.playerStats[1]?.playerId ?? stats.playerStats[0]?.playerId ?? "");

  const leftTeam = stats.teamStats.find((team) => team.teamId === leftTeamId) ?? stats.teamStats[0];
  const rightTeam = stats.teamStats.find((team) => team.teamId === rightTeamId) ?? stats.teamStats[1] ?? stats.teamStats[0];
  const leftPlayer = stats.playerStats.find((player) => player.playerId === leftPlayerId) ?? stats.playerStats[0];
  const rightPlayer = stats.playerStats.find((player) => player.playerId === rightPlayerId) ?? stats.playerStats[1] ?? stats.playerStats[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabButton active={mode === "teams"} onClick={() => setMode("teams")} label="Squadre" />
        <TabButton active={mode === "players"} onClick={() => setMode("players")} label="Giocatori" />
      </div>

      {mode === "teams" ? (
        <>
          <Card variant="inner" className="grid gap-3 sm:grid-cols-2">
            <CompareSelect value={leftTeamId} onChange={setLeftTeamId} options={stats.teamStats.map((team) => ({ value: team.teamId, label: team.teamName }))} />
            <CompareSelect value={rightTeamId} onChange={setRightTeamId} options={stats.teamStats.map((team) => ({ value: team.teamId, label: team.teamName }))} />
          </Card>
          {leftTeam && rightTeam && (
            <ComparisonCard
              leftHeader={<TeamCompareHeader team={leftTeam} leagueId={leagueId} />}
              rightHeader={<TeamCompareHeader team={rightTeam} leagueId={leagueId} />}
              metrics={[
                { label: "Punti", left: leftTeam.points, right: rightTeam.points },
                { label: "Punti / gara", left: leftTeam.pointsPerGame, right: rightTeam.pointsPerGame },
                { label: "Gol fatti", left: leftTeam.gf, right: rightTeam.gf },
                { label: "Gol subiti", left: leftTeam.ga, right: rightTeam.ga, lowerIsBetter: true },
                { label: "Clean sheet", left: leftTeam.cleanSheets, right: rightTeam.cleanSheets },
                { label: "Vittorie", left: leftTeam.wins, right: rightTeam.wins },
              ]}
            />
          )}
        </>
      ) : (
        <>
          <Card variant="inner" className="grid gap-3 sm:grid-cols-2">
            <CompareSelect value={leftPlayerId} onChange={setLeftPlayerId} options={stats.playerStats.map((player) => ({ value: player.playerId, label: `${player.firstName} ${player.lastName} · ${player.teamName}` }))} />
            <CompareSelect value={rightPlayerId} onChange={setRightPlayerId} options={stats.playerStats.map((player) => ({ value: player.playerId, label: `${player.firstName} ${player.lastName} · ${player.teamName}` }))} />
          </Card>
          {leftPlayer && rightPlayer && (
            <ComparisonCard
              leftHeader={<PlayerCompareHeader player={leftPlayer} leagueId={leagueId} />}
              rightHeader={<PlayerCompareHeader player={rightPlayer} leagueId={leagueId} />}
              metrics={[
                { label: "Presenze", left: leftPlayer.appearances, right: rightPlayer.appearances },
                { label: "Gol", left: leftPlayer.goals, right: rightPlayer.goals },
                { label: "Assist", left: leftPlayer.assists, right: rightPlayer.assists },
                { label: "Gol + Assist", left: leftPlayer.contributions, right: rightPlayer.contributions },
                { label: "G+A / gara", left: leftPlayer.contributionsPerAppearance, right: rightPlayer.contributionsPerAppearance },
                { label: "Gol / gara", left: leftPlayer.goalsPerAppearance, right: rightPlayer.goalsPerAppearance },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
}

function ComparisonCard({
  leftHeader,
  rightHeader,
  metrics,
}: {
  leftHeader: React.ReactNode;
  rightHeader: React.ReactNode;
  metrics: Array<{ label: string; left: number; right: number; lowerIsBetter?: boolean }>;
}) {
  return (
    <Card className="overflow-hidden !p-0">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        <div className="bg-[var(--card)] p-4">{leftHeader}</div>
        <div className="bg-[var(--card)] p-4">{rightHeader}</div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {metrics.map((metric) => {
          const leftWins = metric.lowerIsBetter ? metric.left < metric.right : metric.left > metric.right;
          const rightWins = metric.lowerIsBetter ? metric.right < metric.left : metric.right > metric.left;
          return (
            <div key={metric.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
              <div className={`text-left text-lg font-black tabular-nums ${leftWins ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                {formatMetric(metric.left)}
              </div>
              <div className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{metric.label}</div>
              <div className={`text-right text-lg font-black tabular-nums ${rightWins ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                {formatMetric(metric.right)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-10 rounded-2xl border px-4 py-2 text-sm font-bold transition",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--foreground)] hover:bg-[var(--card)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-3 top-3 text-[var(--accent)] opacity-70">{icon}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.05em] tabular-nums text-[var(--foreground)]">{value}</div>
    </Card>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
      <div className="text-[var(--accent)]">{icon}</div>
      <div>
        <div className="text-base font-black text-[var(--foreground)]">{title}</div>
        <div className="text-xs text-[var(--muted)]">{subtitle}</div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="text-base font-black text-[var(--foreground)]">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</div>
    </div>
  );
}

function LeaderCell({ label, player, value, suffix, leagueId }: { label: string; player: PlayerStat | null; value: number; suffix: string; leagueId: string }) {
  if (!player) return <div className="bg-[var(--card)] p-4 text-sm text-[var(--muted)]">Nessun dato</div>;
  return (
    <Link href={`/leagues/${leagueId}/players/${player.playerId}`} className="flex items-center gap-3 bg-[var(--card)] p-4 transition hover:bg-[var(--card-2)]">
      <PlayerAvatar player={player} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.13em] text-[var(--muted)]">{label}</div>
        <div className="mt-1 truncate text-sm font-black text-[var(--foreground)]">{player.firstName} {player.lastName}</div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{player.teamName}</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black tabular-nums text-[var(--foreground)]">{value}</div>
        <div className="text-[10px] uppercase text-[var(--muted)]">{suffix}</div>
      </div>
    </Link>
  );
}

function TeamBar({ team, value, max, label, leagueId }: { team: TeamStat; value: number; max: number; label: string; leagueId: string }) {
  const width = Math.max(6, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <Link href={`/leagues/${leagueId}/teams/${team.teamId}`} className="block">
      <div className="mb-1.5 flex items-center gap-2">
        <TeamLogo name={team.teamName} badgeUrl={team.badgeUrl} size="xs" />
        <div className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--foreground)]">{team.teamName}</div>
        <div className="text-xs font-black tabular-nums text-[var(--muted)]">{label}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--card-2)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${width}%` }} />
      </div>
    </Link>
  );
}

function MiniRecord({ icon, label, title, detail }: { icon: React.ReactNode; label: string; title: string; detail: string }) {
  return (
    <Card variant="inner">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[var(--accent)]">{icon}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
          <div className="mt-1 text-sm font-black leading-snug text-[var(--foreground)]">{title}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div>
        </div>
      </div>
    </Card>
  );
}

function RecordCard({ icon, eyebrow, title, value }: { icon: React.ReactNode; eyebrow: string; title: string; value: string }) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[var(--accent)]">{icon}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{eyebrow}</div>
      </div>
      <div className="mt-6 text-xl font-black leading-tight tracking-[-0.04em] text-[var(--foreground)]">{title}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--muted)]">{value}</div>
    </Card>
  );
}

function SmallMetric({ label, value, muted = false }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-base font-black tabular-nums ${muted ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>{value}</div>
      <div className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </div>
  );
}

function MetricNumber({ value, strong = false }: { value: number; strong?: boolean }) {
  return <div className={`text-center text-sm tabular-nums ${strong ? "font-black text-[var(--foreground)]" : "font-semibold text-[var(--muted)]"}`}>{value}</div>;
}

function FormDots({ form }: { form: FormResult[] }) {
  if (form.length === 0) return <span className="text-[10px] text-[var(--muted)]">—</span>;
  return (
    <div className="flex items-center gap-1" aria-label={`Forma: ${form.join(" ")}`}>
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={[
            "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-white",
            result === "W" ? "bg-emerald-600" : result === "D" ? "bg-slate-500" : "bg-red-500",
          ].join(" ")}
        >
          {result === "W" ? "V" : result === "D" ? "N" : "P"}
        </span>
      ))}
    </div>
  );
}

function TeamLogo({ name, badgeUrl, size = "sm" }: { name: string; badgeUrl: string | null; size?: "xs" | "sm" | "lg" }) {
  const classes = size === "xs" ? "h-5 w-5 rounded-md" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-9 w-9 rounded-xl";
  if (badgeUrl) return <img src={badgeUrl} alt={name} className={`${classes} shrink-0 object-contain`} />;
  return (
    <div className={`${classes} flex shrink-0 items-center justify-center bg-[var(--card-2)] text-[10px] font-black text-[var(--muted)]`}>
      {(name.match(/\b\w/g) || []).slice(0, 2).join("").toUpperCase() || "TM"}
    </div>
  );
}

function PlayerAvatar({ player }: { player: PlayerStat }) {
  const initials = `${player.firstName} ${player.lastName}`.trim().split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  if (!player.photoUrl) {
    return <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-2)] text-sm font-black text-[var(--accent)]">{initials || "?"}</div>;
  }
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-2)]">
      <OptimizedPlayerImage
        src={player.photoUrl}
        alt={`${player.firstName} ${player.lastName}`}
        sizes="48px"
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          objectPosition: `${player.photoPositionX}% ${player.photoPositionY}%`,
          transform: `scale(${Math.min(player.photoZoom, 1)})`,
          transformOrigin: `${player.photoPositionX}% ${player.photoPositionY}%`,
        }}
      />
    </div>
  );
}

function CompareSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-bold text-[var(--foreground)] outline-none"
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function TeamCompareHeader({ team, leagueId }: { team: TeamStat; leagueId: string }) {
  return (
    <Link href={`/leagues/${leagueId}/teams/${team.teamId}`} className="flex flex-col items-center text-center">
      <TeamLogo name={team.teamName} badgeUrl={team.badgeUrl} size="lg" />
      <div className="mt-2 text-sm font-black text-[var(--foreground)]">{team.teamName}</div>
      <div className="mt-2"><FormDots form={team.form} /></div>
    </Link>
  );
}

function PlayerCompareHeader({ player, leagueId }: { player: PlayerStat; leagueId: string }) {
  return (
    <Link href={`/leagues/${leagueId}/players/${player.playerId}`} className="flex flex-col items-center text-center">
      <PlayerAvatar player={player} />
      <div className="mt-2 text-sm font-black text-[var(--foreground)]">{player.firstName} {player.lastName}</div>
      <div className="mt-1 text-[11px] text-[var(--muted)]">{player.teamName}</div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-[24px] border border-[var(--border)] bg-[var(--card)]" />)}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="py-12 text-center">
      <BarChart3 size={32} className="mx-auto text-[var(--accent)]" />
      <div className="mt-4 text-lg font-black text-[var(--foreground)]">Le statistiche partiranno dal primo risultato</div>
      <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Inserisci il risultato di una partita e questa sezione calcolerà automaticamente classifiche, medie, forma e record.
      </div>
    </Card>
  );
}

function formScore(form: FormResult[]) {
  return form.reduce((score, result) => score + (result === "W" ? 3 : result === "D" ? 1 : 0), 0);
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
