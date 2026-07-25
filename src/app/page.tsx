"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { ArrowRight, CopyPlus, Plus } from "lucide-react";
import Card from "src/app/_components/ui/card";
import Button from "src/app/_components/ui/button";
import Input from "src/app/_components/ui/input";
import Badge from "src/app/_components/ui/badge";
import SponsorBanner from "src/app/_components/sponsor-banner";
import { useIsAdmin, authFetch } from "@/lib/client-auth";

type League = {
  id: string;
  name: string;
  playoffFormat?: "SINGLE_ELIM" | "TWO_LEG" | null;
  teams?: Array<{
    id: string;
    name: string;
    badgeUrl?: string | null;
    players?: Array<{ firstName: string; lastName: string; number: number }>;
  }>;
};

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
}

export default function HomePage() {
  const isAdmin = useIsAdmin();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [teamIdsToCopy, setTeamIdsToCopy] = useState<string[]>([]);
  const [playoffEnabled, setPlayoffEnabled] = useState(false);
  const [playoffFormat, setPlayoffFormat] = useState<"SINGLE_ELIM" | "TWO_LEG">("SINGLE_ELIM");
  const [playoffTeamCount, setPlayoffTeamCount] = useState(8);
  const [playoffSeeded, setPlayoffSeeded] = useState(true);

  async function load() {
    setLoadingLeagues(true);
    try {
      setLeagues(await getJSON<League[]>("/api/leagues"));
    } finally {
      setLoadingLeagues(false);
    }
  }

  useEffect(() => {
    load().catch((e: any) => setErr(e.message ?? "Errore caricamento tornei"));
  }, []);

  async function create() {
    setErr(null);
    const n = name.trim();
    if (!n) return setErr("Inserisci un nome torneo");

    try {
      setLoading(true);
      await postJSON("/api/leagues", { name: n, teamIdsToCopy, playoffEnabled, playoffFormat, playoffTeamCount, playoffSeeded });
      setName("");
      setTeamIdsToCopy([]);
      setPlayoffEnabled(false);
      setPlayoffFormat("SINGLE_ELIM");
      setPlayoffTeamCount(8);
      setPlayoffSeeded(true);
      setShowCreateLeague(false);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Errore creazione torneo");
    } finally {
      setLoading(false);
    }
  }

  async function removeLeague(id: string, leagueName: string) {
    setErr(null);
    if (!window.confirm(`Eliminare il torneo "${leagueName}"?\n\nVerranno cancellati anche squadre, giocatori, partite e statistiche.`)) return;

    try {
      const res = await authFetch(`/api/leagues/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore eliminazione");
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Errore eliminazione torneo");
    }
  }

  const existingTeams = useMemo(() => {
    const map = new Map<string, { id: string; name: string; badgeUrl?: string | null }>();
    for (const league of leagues) {
      for (const team of league.teams ?? []) {
        if (!map.has(team.id)) map.set(team.id, { id: team.id, name: team.name, badgeUrl: team.badgeUrl ?? null });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leagues]);

  const totalTeams = leagues.reduce((sum, league) => sum + (league.teams?.length ?? 0), 0);

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
      {err && <Badge variant="error" className="w-full">{err}</Badge>}

      <section className="matchroom-hero rounded-[34px] border border-[var(--border)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="imperial-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em]">
              <img src="/cammino-imperiale-logo.png" alt="" className="h-4 w-4 object-contain" />
              Cammino Imperiale
            </div>
            <h1 className="imperial-title mt-5 max-w-4xl text-5xl font-black text-[var(--foreground)] sm:text-7xl lg:text-8xl">
              scegli il cammino, entra in campo.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Una control room compatta per campionati, rose, classifiche, playoff e statistiche. Tutto pronto per il tuo cammino verso il titolo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroMetric label="Tornei" value={loadingLeagues ? "…" : leagues.length} />
            <HeroMetric label="Squadre" value={loadingLeagues ? "…" : totalTeams} />
            <HeroMetric label="Ruolo" value={isAdmin ? "Admin" : "Viewer"} />
            <HeroMetric label="Playoff" value={leagues.some((l) => l.playoffFormat) ? "On" : "Off"} />
          </div>
        </div>
      </section>

      <SponsorBanner />

        <div className={isAdmin && showCreateLeague ? "desktop-control-grid gap-6" : "space-y-6"}>
          <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--accent)]">Sentiero del torneo</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.06em] text-[var(--foreground)]">Arene disponibili</h2>
            </div>
            {isAdmin && <Button onClick={() => setShowCreateLeague((v) => !v)}>{showCreateLeague ? "Chiudi" : "Nuovo torneo"}</Button>}
          </div>

          {loadingLeagues ? (
            <div className="grid gap-4 md:grid-cols-2"><LeagueCardSkeleton /><LeagueCardSkeleton /></div>
          ) : leagues.length === 0 ? (
            <Card className="turf-card py-14 text-center">
              <div className="w-full max-w-md space-y-3 lg:max-w-none">
                <div className="text-lg font-black text-[var(--foreground)]">Nessun torneo salvato</div>
                <p className="text-sm text-[var(--muted)]">{isAdmin ? "Crea il primo torneo per iniziare." : "Al momento non ci sono tornei disponibili."}</p>
                {isAdmin && <Button onClick={() => setShowCreateLeague(true)}>Crea torneo</Button>}
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {leagues.map((league) => (
                <LeagueSwitchCard
                  key={league.id}
                  league={league}
                  isAdmin={isAdmin}
                  onDelete={() => removeLeague(league.id, league.name)}
                />
              ))}
            </div>
          )}
        </section>

        {isAdmin && showCreateLeague && (
          <aside className="space-y-5">
            <CreateLeaguePanel
              name={name}
              setName={setName}
              loading={loading}
              create={create}
              existingTeams={existingTeams}
              teamIdsToCopy={teamIdsToCopy}
              setTeamIdsToCopy={setTeamIdsToCopy}
              playoffEnabled={playoffEnabled}
              setPlayoffEnabled={setPlayoffEnabled}
              playoffFormat={playoffFormat}
              setPlayoffFormat={setPlayoffFormat}
              playoffTeamCount={playoffTeamCount}
              setPlayoffTeamCount={setPlayoffTeamCount}
              playoffSeeded={playoffSeeded}
              setPlayoffSeeded={setPlayoffSeeded}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="imperial-plate rounded-[24px] px-4 py-4"><p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black text-[var(--foreground)]">{value}</p></div>;
}

function LeagueSwitchCard({
  league,
  isAdmin,
  onDelete,
}: {
  league: League;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const teams = league.teams?.length ?? 0;
  const players = league.teams?.reduce((sum, team) => sum + (team.players?.length ?? 0), 0) ?? 0;
  return (
  <Card className="group turf-card transition hover:-translate-y-1 hover:border-[var(--accent)]/60">
  <div className="flex min-h-[180px] flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex imperial-chip rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">{league.playoffFormat ? "Playoff previsti" : "Stagione regolare"}</span>
            <h3 className="imperial-title mt-4 text-3xl font-black text-[var(--foreground)]">{league.name}</h3>
          </div>
          {isAdmin && <button onClick={onDelete} className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">Elimina</button>}
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex gap-3 text-sm text-[var(--muted)]"><span><b className="text-[var(--foreground)]">{teams}</b> squadre</span><span><b className="text-[var(--foreground)]">{players}</b> giocatori</span></div>
          <Link href={`/leagues/${league.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(210,174,114,0.38)] bg-[linear-gradient(135deg,var(--imperial-green-2),var(--imperial-green))] px-4 py-2 text-sm font-black text-[var(--imperial-text)] shadow-[0_12px_34px_rgba(0,0,0,0.26)]">Entra <ArrowRight size={15} /></Link>
        </div>
      </div>
    </Card>
  );
}

function CreateLeaguePanel(props: {
  name: string;
  setName: (v: string) => void;
  loading: boolean;
  create: () => void;
  existingTeams: Array<{ id: string; name: string; badgeUrl?: string | null }>;
  teamIdsToCopy: string[];
  setTeamIdsToCopy: Dispatch<SetStateAction<string[]>>;
  playoffEnabled: boolean;
  setPlayoffEnabled: (v: boolean) => void;
  playoffFormat: "SINGLE_ELIM" | "TWO_LEG";
  setPlayoffFormat: (v: "SINGLE_ELIM" | "TWO_LEG") => void;
  playoffTeamCount: number;
  setPlayoffTeamCount: (v: number) => void;
  playoffSeeded: boolean;
  setPlayoffSeeded: (v: boolean) => void;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Plus size={20} /></div><div><p className="text-xs font-black uppercase tracking-widest text-[var(--accent)]">Creazione</p><h2 className="text-xl font-black">Nuovo torneo</h2></div></div>
      <div className="mt-5 space-y-4">
        <Input value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Nome torneo" />
        <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4"><input type="checkbox" checked={props.playoffEnabled} onChange={(e) => props.setPlayoffEnabled(e.target.checked)} className="mt-1" /><span><span className="block text-sm font-black">Prevedi fase playoff</span><span className="mt-1 block text-xs text-[var(--muted)]">La voce Playoff comparirà solo se questa opzione è attiva.</span></span></label>
        {props.playoffEnabled && <div className="grid gap-3 sm:grid-cols-2"><select value={props.playoffFormat} onChange={(e) => props.setPlayoffFormat(e.target.value as "SINGLE_ELIM" | "TWO_LEG")} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 text-sm"><option value="SINGLE_ELIM" className="text-black">Eliminazione diretta</option><option value="TWO_LEG" className="text-black">Andata e ritorno</option></select><select value={props.playoffTeamCount} onChange={(e) => props.setPlayoffTeamCount(Number(e.target.value))} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 text-sm">{[2,4,8,16].map((n) => <option key={n} value={n} className="text-black">Top {n}</option>)}</select><label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={props.playoffSeeded} onChange={(e) => props.setPlayoffSeeded(e.target.checked)} /> Seeding</label></div>}
        {props.existingTeams.length > 0 && <div><p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--muted)]">Copia squadre</p><div className="grid gap-2">{props.existingTeams.slice(0, 8).map((team) => { const checked = props.teamIdsToCopy.includes(team.id); return <button key={team.id} type="button" onClick={() => props.setTeamIdsToCopy((prev) => checked ? prev.filter((id) => id !== team.id) : [...prev, team.id])} className={["flex items-center gap-3 rounded-2xl border px-3 py-3 text-left", checked ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--card-2)]"].join(" ")}><CopyPlus size={15} /><span className="truncate text-sm font-semibold">{team.name}</span></button>; })}</div></div>}
        <Button onClick={props.create} disabled={props.loading} className="w-full">{props.loading ? "Creazione…" : "Crea torneo"}</Button>
      </div>
    </Card>
  );
}

function LeagueCardSkeleton() {
  return <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-5"><div className="animate-pulse space-y-4"><div className="h-4 w-24 rounded bg-white/10" /><div className="h-8 w-2/3 rounded bg-white/10" /><div className="h-20 rounded bg-white/10" /></div></div>;
}
