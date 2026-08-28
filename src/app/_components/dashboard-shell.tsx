"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Menu, UserCircle, X, Trophy } from "lucide-react";
import Sidebar from "./sidebar";
import BottomTabs from "./bottom-tabs";
import MobileMenu from "./mobile-menu";
import Breadcrumbs from "./breadcrumbs";
import { useAuth } from "@/lib/client-auth";

export default function DashboardShell({
  children,
  leagueId,
}: {
  children: React.ReactNode;
  leagueId?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [popupOpen, setPopupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show popup once per session when a guest opens a league
  useEffect(() => {
    if (!authLoading && !user && leagueId) {
      const dismissed = sessionStorage.getItem("futbol-login-popup-dismissed");
      if (!dismissed) setPopupOpen(true);
    }
  }, [authLoading, user, leagueId]);

  function dismissPopup() {
    sessionStorage.setItem("futbol-login-popup-dismissed", "1");
    setPopupOpen(false);
  }


return (
    <div className="min-h-screen max-w-full overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-7 lg:py-7 xl:px-9 2xl:px-12">
      <div className="w-full min-w-0">
        {/* Mobile top bar */}
        <div className="no-print mb-4 flex min-w-0 items-center justify-between gap-3 rounded-[18px] bg-[var(--card)] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)] lg:hidden">
          <Link href="/" className="min-w-0 text-base font-extrabold tracking-tight sm:text-lg">
            <span className="imperial-title block truncate text-[var(--accent)]">CAMMINO IMPERIALE</span>
          </Link>

          {!authLoading && (
            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <span className="hidden items-center gap-1.5 text-xs text-[var(--foreground)]/60 min-[380px]:flex">
                  <UserCircle size={15} />
                  <span className="max-w-24 truncate">{user.username}</span>
                </span>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-xl border border-[rgba(210,174,114,0.38)] bg-[var(--imperial-green-2)] px-3 py-1.5 text-xs font-semibold text-[var(--imperial-text)] transition-colors hover:bg-[var(--imperial-green)]"
                >
                  <LogIn size={13} />
                  Accedi
                </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Apri menu"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card-2)] text-[var(--foreground)]/70"
              >
                <Menu size={19} />
              </button>
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 gap-4 md:gap-6">
          <Sidebar leagueId={leagueId} />

          <main className="min-w-0 flex-1 pb-20 lg:pb-0">
            <Breadcrumbs leagueId={leagueId} />
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      {leagueId && <BottomTabs leagueId={leagueId} />}

      <MobileMenu
        leagueId={leagueId}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Login nudge popup */}
      {popupOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={dismissPopup}
        >
          <div
            className="w-full max-w-sm rounded-[24px] bg-[var(--card)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <Trophy size={20} />
              </div>
              <button
                onClick={dismissPopup}
                aria-label="Chiudi"
                className="rounded-xl p-1.5 text-[var(--foreground)]/35 transition-colors hover:text-[var(--foreground)]/70"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="text-xl font-black text-[var(--foreground)]">
              Benvenuto nel torneo
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/55">
              Accedi per gestire squadre, inserire risultati e aggiornare le classifiche. Puoi anche continuare come ospite in sola lettura.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={dismissPopup}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(210,174,114,0.38)] bg-[var(--imperial-green-2)] text-sm font-semibold text-[var(--imperial-text)] transition-colors hover:bg-[var(--imperial-green)]"
              >
                <LogIn size={15} />
                Accedi
              </Link>
              <button
                onClick={dismissPopup}
                className="flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--border)] text-sm text-[var(--foreground)]/60 transition-colors hover:text-[var(--foreground)]"
              >
                Continua come ospite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
