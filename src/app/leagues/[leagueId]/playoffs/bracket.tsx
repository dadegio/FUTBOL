"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import SeriesCard, { type SeriesData } from "./series-card";

type Props = {
  series: SeriesData[];
  leagueId: string;
  format: string;
  teamCount: number;
};

type Line = { x1: number; y1: number; x2: number; y2: number };

const ROUND_NAMES = new Map<number, string>([
  [1, "Finale"],
  [2, "Semifinali"],
  [4, "Quarti di finale"],
  [8, "Ottavi di finale"],
]);

function getRounds(teamCount: number) {
  const rounds: number[] = [];
  let round = teamCount / 2;

  while (round >= 1) {
    rounds.push(round);
    round = round / 2;
  }

  return rounds;
}

export default function BracketView({ series, leagueId, format, teamCount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const rounds = useMemo(() => getRounds(teamCount), [teamCount]);

  const seriesByRound = useMemo(() => {
    const map = new Map<number, SeriesData[]>();

    for (const round of rounds) {
      map.set(
        round,
        series
          .filter((s) => s.bracketRound === round)
          .sort((a, b) => a.position - b.position)
      );
    }

    return map;
  }, [rounds, series]);

  const champion = useMemo(() => {
    const finalSeries = series.find((s) => s.bracketRound === 1);
    if (!finalSeries?.winnerId) return null;
    if (finalSeries.homeTeam?.id === finalSeries.winnerId) return finalSeries.homeTeam;
    if (finalSeries.awayTeam?.id === finalSeries.winnerId) return finalSeries.awayTeam;
    return null;
  }, [series]);

  const computeLines = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newLines: Line[] = [];

    for (const source of series) {
      const sourceEl = container.querySelector<HTMLElement>(`[data-series="${source.id}"]`);
      if (!sourceEl) continue;

      const target = series.find(
        (candidate) =>
          candidate.bracketRound === source.bracketRound / 2 &&
          candidate.position === Math.floor(source.position / 2)
      );
      if (!target) continue;

      const targetEl = container.querySelector<HTMLElement>(`[data-series="${target.id}"]`);
      if (!targetEl) continue;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      newLines.push({
        x1: sourceRect.right - rect.left,
        y1: sourceRect.top + sourceRect.height / 2 - rect.top,
        x2: targetRect.left - rect.left,
        y2: targetRect.top + targetRect.height / 2 - rect.top,
      });
    }

    setLines(newLines);
  }, [series]);

  useEffect(() => {
    computeLines();

    const container = containerRef.current;
    const resizeObserver = container ? new ResizeObserver(computeLines) : null;

    if (container && resizeObserver) {
      resizeObserver.observe(container);
      container.querySelectorAll("[data-series]").forEach((node) => resizeObserver.observe(node));
    }

    window.addEventListener("resize", computeLines);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", computeLines);
    };
  }, [computeLines]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Tabellone playoff
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--foreground)]">
            {teamCount} squadre · {format === "TWO_LEG" ? "andata e ritorno" : "gara secca"}
          </h2>
        </div>

        {champion && (
          <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 py-3 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Campione
            </p>
            <p className="mt-0.5 max-w-[260px] text-sm font-black text-[var(--foreground)]">
              {champion.name}
            </p>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative isolate overflow-x-auto rounded-[26px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--card)_0%,var(--card-2)_100%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
      >
        <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible" aria-hidden="true">
          {lines.map((line, i) => {
            const midX = line.x1 + Math.max((line.x2 - line.x1) * 0.5, 36);
            return (
              <path
                key={i}
                d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke="var(--accent)"
                strokeLinecap="round"
                strokeOpacity={0.28}
                strokeWidth={3}
              />
            );
          })}
        </svg>

        <div
          className="relative z-10 grid auto-cols-[minmax(280px,1fr)] grid-flow-col items-stretch gap-7 lg:auto-cols-[minmax(300px,1fr)]"
          style={{ minWidth: rounds.length * 310 }}
        >
          {rounds.map((round) => {
            const roundSeries = seriesByRound.get(round) ?? [];
            return (
              <section key={round} className="flex min-h-[420px] flex-col rounded-[22px] border border-white/10 bg-[var(--card)]/55 p-3">
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                      {ROUND_NAMES.get(round) ?? `Round ${round}`}
                    </p>
                    <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                      {roundSeries.length} {roundSeries.length === 1 ? "serie" : "serie"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--card-2)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[var(--muted)]">
                    {round === 1 ? "🏆" : `${round * 2}→${round}`}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-around gap-5">
                  {roundSeries.map((s) => (
                    <div key={s.id} data-series={s.id} className="relative">
                      <SeriesCard series={s} leagueId={leagueId} format={format} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
