"use client";

import Link from "next/link";

type Team = { id: string; name: string; badgeUrl?: string | null };

type Match = {
  id: string;
  leg: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeamId: string;
  awayTeamId: string;
};

export type SeriesData = {
  id: string;
  bracketRound: number;
  position: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeSeed: number | null;
  awaySeed: number | null;
  penaltiesHome: number | null;
  penaltiesAway: number | null;
  winnerId: string | null;
  matches: Match[];
};

type Props = {
  series: SeriesData;
  leagueId: string;
  format: string;
};

function getTeamGoals(match: Match | undefined, teamId: string | undefined) {
  if (!match || !teamId) return null;
  if (match.homeGoals === null || match.awayGoals === null) return null;
  if (match.homeTeamId === teamId) return match.homeGoals;
  if (match.awayTeamId === teamId) return match.awayGoals;
  return null;
}

export default function SeriesCard({ series, leagueId, format }: Props) {
  const { homeTeam, awayTeam, winnerId, matches } = series;
  const isTwoLeg = format === "TWO_LEG";

  const leg1 = matches.find((m) => m.leg === 1) ?? matches[0];
  const leg2 = matches.find((m) => m.leg === 2);

  const homeWon = Boolean(winnerId && homeTeam && winnerId === homeTeam.id);
  const awayWon = Boolean(winnerId && awayTeam && winnerId === awayTeam.id);
  const ready = Boolean(homeTeam && awayTeam);

  return (
    <article
      className={[
        "group overflow-hidden rounded-[20px] border bg-[var(--card)] shadow-[0_10px_26px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.35)] transition duration-200",
        winnerId
          ? "border-[var(--accent)]/35 ring-1 ring-[var(--accent)]/10"
          : "border-[var(--border)] hover:border-[var(--accent)]/35",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card-2)]/70 px-3 py-2">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          Serie #{series.position + 1}
        </span>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            winnerId
              ? "bg-[var(--accent)]/12 text-[var(--accent)]"
              : ready
                ? "bg-white/5 text-[var(--muted)]"
                : "bg-[var(--border)]/30 text-[var(--muted)]",
          ].join(" ")}
        >
          {winnerId ? "Qualificata" : ready ? "Da giocare" : "In attesa"}
        </span>
      </div>

      <TeamRow
        seed={series.homeSeed}
        name={homeTeam?.name ?? null}
        badgeUrl={homeTeam?.badgeUrl ?? null}
        won={homeWon}
        lost={awayWon}
        leg1Score={getTeamGoals(leg1, homeTeam?.id)}
        leg2Score={isTwoLeg ? getTeamGoals(leg2, homeTeam?.id) : null}
        isTwoLeg={isTwoLeg}
        border
      />

      <TeamRow
        seed={series.awaySeed}
        name={awayTeam?.name ?? null}
        badgeUrl={awayTeam?.badgeUrl ?? null}
        won={awayWon}
        lost={homeWon}
        leg1Score={getTeamGoals(leg1, awayTeam?.id)}
        leg2Score={isTwoLeg ? getTeamGoals(leg2, awayTeam?.id) : null}
        isTwoLeg={isTwoLeg}
      />

      {series.penaltiesHome !== null && series.penaltiesAway !== null && (
        <div className="border-t border-[var(--border)] bg-[var(--card-2)]/45 px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--muted)]">
          Rigori {series.penaltiesHome}–{series.penaltiesAway}
        </div>
      )}

      {homeTeam && awayTeam && !winnerId && matches.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-2.5">
          <div className="flex gap-2">
            {matches.map((m) => (
              <Link
                key={m.id}
                href={`/leagues/${leagueId}/matches/${m.id}`}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-2 py-1.5 text-center text-xs font-bold text-[var(--accent)] transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--card)]"
              >
                {m.homeGoals !== null ? "Modifica" : "Risultato"}
                {isTwoLeg ? ` · G${m.leg}` : ""}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function TeamRow({
  seed,
  name,
  badgeUrl,
  won,
  lost,
  leg1Score,
  leg2Score,
  isTwoLeg,
  border = false,
}: {
  seed: number | null;
  name: string | null;
  badgeUrl: string | null;
  won: boolean;
  lost: boolean;
  leg1Score: number | null;
  leg2Score: number | null;
  isTwoLeg: boolean;
  border?: boolean;
}) {
  return (
    <div
      className={[
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors",
        border ? "border-b border-[var(--border)]" : "",
        won ? "bg-[var(--accent)]/10" : "",
        lost ? "opacity-50" : "",
      ].join(" ")}
    >
      <div className="relative">
        <TeamMiniLogo name={name ?? "In attesa"} badgeUrl={badgeUrl} muted={!name} />
        {seed && (
          <span className="absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--card)] bg-[var(--card-2)] px-1 text-[9px] font-black tabular-nums text-[var(--muted)]">
            {seed}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <div
          className={[
            "break-words text-sm font-black leading-tight tracking-[-0.02em]",
            won
              ? "text-[var(--accent)]"
              : name
                ? "text-[var(--foreground)]"
                : "italic text-[var(--muted)]",
          ].join(" ")}
        >
          {name ?? "In attesa"}
        </div>
        {won && <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">Passa il turno</div>}
      </div>

      <ScoreDisplay leg1Score={leg1Score} leg2Score={leg2Score} isTwoLeg={isTwoLeg} />
    </div>
  );
}

function ScoreDisplay({
  leg1Score,
  leg2Score,
  isTwoLeg,
}: {
  leg1Score: number | null;
  leg2Score: number | null;
  isTwoLeg: boolean;
}) {
  if (leg1Score === null && leg2Score === null) {
    return <span className="rounded-xl bg-[var(--card-2)] px-2.5 py-1 text-sm font-black text-[var(--border-strong)]">—</span>;
  }

  if (isTwoLeg) {
    return (
      <div className="flex items-center gap-1 rounded-xl bg-[var(--card-2)] px-2.5 py-1 text-sm font-black tabular-nums text-[var(--foreground)]">
        <span>{leg1Score ?? "—"}</span>
        <span className="text-[var(--border-strong)]">|</span>
        <span>{leg2Score ?? "—"}</span>
      </div>
    );
  }

  return (
    <span className="rounded-xl bg-[var(--card-2)] px-2.5 py-1 text-sm font-black tabular-nums text-[var(--foreground)]">
      {leg1Score ?? "—"}
    </span>
  );
}

function TeamMiniLogo({
  name,
  badgeUrl,
  muted = false,
}: {
  name: string;
  badgeUrl: string | null;
  muted?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (badgeUrl) {
    return (
      <img
        src={badgeUrl}
        alt={`Logo ${name}`}
        className="h-9 w-9 shrink-0 rounded-xl object-contain"
      />
    );
  }

  return (
    <span
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black",
        muted
          ? "border border-dashed border-[var(--border)] bg-transparent text-[var(--muted)]"
          : "bg-[var(--card-2)] text-[var(--muted)]",
      ].join(" ")}
    >
      {initials || "?"}
    </span>
  );
}
