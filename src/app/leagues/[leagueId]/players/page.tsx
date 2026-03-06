"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import DashboardShell from "src/app/_components/dashboard-shell";

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  team: { id: string; name: string };
};

export default function PlayersPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const q = (sp.get("q") ?? "").trim();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState(q);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  useEffect(() => {
    if (!leagueId) return;

    setErr(null);
    setLoading(true);

    fetch(`/api/leagues/${leagueId}/players?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d?.error ?? "Errore");
        setRows(d);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [leagueId, q]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = search.trim();
    router.push(
      value
        ? `/leagues/${leagueId}/players?q=${encodeURIComponent(value)}`
        : `/leagues/${leagueId}/players`
    );
  }

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/8 bg-[#121214]/95 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Players
          </div>
          <h1 className="mt-2 text-3xl font-black text-white">Giocatori</h1>
          <p className="mt-2 text-sm text-white/60">
            {loading ? "Caricamento…" : `Totale risultati: ${rows.length}`}
          </p>

          <form onSubmit={submitSearch} className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, cognome, numero o squadra"
              className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-white/35 focus:border-[var(--accent)]/40"
            />
            <button
              type="submit"
              className="h-14 rounded-2xl bg-[var(--accent)] px-6 font-bold text-black"
            >
              Cerca
            </button>
          </form>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/8 bg-[#121214]/95 p-5 shadow-2xl shadow-black/20">
          {rows.length === 0 && !loading ? (
            <div className="rounded-2xl bg-white/[0.04] px-4 py-4 text-white/55">
              Nessun giocatore trovato.
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {rows.map((p) => (
              <Link
                key={p.id}
                href={`/leagues/${leagueId}/players/${p.id}`}
                className="rounded-[24px] border border-white/8 bg-[#17171a] p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent)]/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.18em] text-white/40">
                      {p.team.name}
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {p.firstName} {p.lastName}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[var(--accent)] px-4 py-2 text-lg font-black text-black">
                    #{p.number}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}