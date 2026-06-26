"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardShell from "src/app/_components/dashboard-shell";
import Card from "src/app/_components/ui/card";
import Badge from "src/app/_components/ui/badge";
import { authFetch } from "@/lib/client-auth";

type Summary = {
  league: { id: string; name: string };
  totals: {
    teams: number;
    players: number;
    authorized: number;
    blocked: number;
    wildcards: number;
    sheetAppearances: number;
    playerFeesCents: number;
    matches: number;
    playedMatches: number;
    refereeFeesCents: number;
  };
  byTeam: Array<{
    teamId: string;
    teamName: string;
    players: number;
    authorized: number;
    blocked: number;
    wildcards: number;
  }>;
};

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function LeagueAdminPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await authFetch(`/api/leagues/${leagueId}/admin/summary`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "Errore caricamento admin");
        setSummary(data);
      } catch (error: any) {
        setErr(error.message ?? "Errore");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [leagueId]);

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="w-full space-y-5 pb-8">
        <header className="pt-2">
          <h1 className="text-[31px] font-black tracking-[-0.06em] text-[var(--foreground)]">Admin torneo</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Documenti, autorizzazioni, quote e costi arbitro.</p>
        </header>

        {err && <Badge variant="error">{err}</Badge>}
        {loading && <p className="text-sm text-[var(--muted)]">Caricamento…</p>}

        {summary && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Stat label="Giocatori" value={`${summary.totals.authorized}/${summary.totals.players}`} note="autorizzati/totali" />
              <Stat label="Da sistemare" value={summary.totals.blocked} note="documenti o stato mancanti" />
              <Stat label="Quote giocatori" value={formatEuro(summary.totals.playerFeesCents)} note={`${summary.totals.sheetAppearances} presenze in distinta`} />
              <Stat label="Arbitri" value={formatEuro(summary.totals.refereeFeesCents)} note={`${summary.totals.playedMatches} partite concluse`} />
            </div>

            <Card className="overflow-hidden !p-0">
              <div className="grid grid-cols-[1fr_70px_90px_90px_80px] border-b border-[var(--border)] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <span>Squadra</span>
                <span className="text-right">Rosa</span>
                <span className="text-right">OK</span>
                <span className="text-right">Bloccati</span>
                <span className="text-right">Wildcard</span>
              </div>
              {summary.byTeam.map((team) => (
                <Link
                  key={team.teamId}
                  href={`/leagues/${leagueId}/teams/${team.teamId}`}
                  className="grid grid-cols-[1fr_70px_90px_90px_80px] border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-[var(--foreground)]">{team.teamName}</span>
                  <span className="text-right text-[var(--muted)]">{team.players}</span>
                  <span className="text-right text-emerald-700">{team.authorized}</span>
                  <span className="text-right text-red-600">{team.blocked}</span>
                  <span className="text-right text-[var(--muted)]">{team.wildcards}</span>
                </Link>
              ))}
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card variant="inner">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--foreground)]/50">{label}</p>
      <p className="mt-3 text-2xl font-black text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{note}</p>
    </Card>
  );
}
