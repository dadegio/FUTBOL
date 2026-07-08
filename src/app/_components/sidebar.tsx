"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Trophy,
  CalendarDays,
  Users,
  BarChart3,
  Search,
  Swords,
  ShieldCheck,
  Settings,
} from "lucide-react";
import AuthButton from "./auth-button";
import { useIsAdmin } from "@/lib/client-auth";

type SidebarProps = {
  leagueId?: string;
};

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "border border-[rgba(210,174,114,0.28)] bg-[var(--accent-soft)] font-bold text-[var(--accent)]"
          : "border border-transparent font-normal text-[var(--muted)] hover:border-[rgba(210,174,114,0.14)] hover:bg-[var(--card-2)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      <span className={active ? "opacity-100" : "opacity-60"}>{icon}</span>
      {label}
    </Link>
  );
}

export default function Sidebar({ leagueId }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [search, setSearch] = useState("");
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [hasPlayoffs, setHasPlayoffs] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    fetch(`/api/leagues/${leagueId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) setLeagueName(d.name);
        setHasPlayoffs(Boolean(d?.playoffFormat));
      })
      .catch(() => {});
  }, [leagueId]);

  const links = leagueId
    ? [
        { href: `/leagues/${leagueId}`,           label: "Overview",    icon: <Home size={17} /> },
        { href: `/leagues/${leagueId}/table`,      label: "Classifica",  icon: <Trophy size={17} /> },
        { href: `/leagues/${leagueId}/calendar`,   label: "Calendario",  icon: <CalendarDays size={17} /> },
        ...(hasPlayoffs ? [{ href: `/leagues/${leagueId}/playoffs`, label: "Playoff", icon: <Swords size={17} /> }] : []),
        { href: `/leagues/${leagueId}/teams`,      label: "Squadre",     icon: <Users size={17} /> },
        { href: `/leagues/${leagueId}/players`,    label: "Giocatori",   icon: <Users size={17} /> },
        { href: `/leagues/${leagueId}/stats`,      label: "Statistiche", icon: <BarChart3 size={17} /> },
      ]
    : [{ href: `/`, label: "Home", icon: <Home size={17} /> }];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!leagueId) return;
    const q = search.trim();
    router.push(q
      ? `/leagues/${leagueId}/players?q=${encodeURIComponent(q)}`
      : `/leagues/${leagueId}/players`
    );
  }

  return (
    <aside className="turf-card hidden w-[260px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 lg:block">
      {/* Logo */}
      <div className="mb-5">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/cammino-imperiale-logo.png"
            alt="Cammino Imperiale"
            className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_18px_rgba(177,42,31,0.22)]"
          />
          <span className="imperial-title leading-none text-[22px] font-bold tracking-[0.08em] text-[var(--accent)]">
            CAMMINO<br />
            IMPERIALE
          </span>
        </Link>
      </div>

      {/* League name */}
      {leagueId && leagueName && (
        <div className="imperial-plate mb-4 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--foreground)]/35">
            Torneo attivo
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-[var(--foreground)]">
            {leagueName}
          </p>
        </div>
      )}

      {/* Search */}
      <form
        onSubmit={submitSearch}
        className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2"
      >
        <Search size={14} className="shrink-0 text-[var(--foreground)]/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={leagueId ? "Cerca giocatore…" : "Cerca…"}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]/35"
        />
        {leagueId && (
          <button
            type="submit"
            className="rounded-lg border border-[rgba(210,174,114,0.32)] bg-[var(--imperial-green-2)] px-2.5 py-1 text-xs font-semibold text-[var(--imperial-text)]"
          >
            Vai
          </button>
        )}
      </form>

      {/* Nav */}
      <nav aria-label="Navigazione principale" className="space-y-0.5">
        {links.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
          />
        ))}
      </nav>

      {/* Admin section */}
      {isAdmin && (
        <>
          <div className="my-3 border-t border-[var(--border)]" />
          <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-widest text-[var(--foreground)]/30">
            Admin
          </p>
          {leagueId && (
            <NavItem
              href={`/leagues/${leagueId}/admin`}
              icon={<Settings size={17} />}
              label="Impostazioni"
              active={pathname === `/leagues/${leagueId}/admin`}
            />
          )}
          <NavItem
            href="/admin/users"
            icon={<ShieldCheck size={17} />}
            label="Utenti"
            active={pathname === "/admin/users"}
          />
        </>
      )}

      {/* Bottom */}
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <AuthButton />
      </div>
    </aside>
  );
}
