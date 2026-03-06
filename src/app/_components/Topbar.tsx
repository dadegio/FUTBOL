"use client";

import PlayerSearchBox from "./PlayerSearchBox";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

type League = { id: string; name: string };

export default function TopBarClient() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ leagueId?: string }>();

  const leagueId = params?.leagueId;
  const inLeague = Boolean(leagueId) && pathname.startsWith("/leagues/");

  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueName, setLeagueName] = useState<string>("");

  // carica lista campionati (serve in home, e anche per ricavare il nome nel league header)
  useEffect(() => {
    fetch("/api/leagues", { cache: "no-store" })
      .then(r => r.json())
      .then((data: League[]) => setLeagues(Array.isArray(data) ? data : []))
      .catch(() => setLeagues([]));
  }, []);

  // calcola nome campionato corrente quando sei dentro /leagues/[leagueId]
  useEffect(() => {
    if (!inLeague || !leagueId) {
      setLeagueName("");
      return;
    }
    const found = leagues.find(l => l.id === leagueId);
    setLeagueName(found?.name ?? "");
  }, [inLeague, leagueId, leagues]);

  const leagueSelect = useMemo(() => {
    if (leagues.length === 0) return null;

    return (
      <select
        value={leagueId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          if (!id) return;
          router.push(`/leagues/${id}/calendar`);
        }}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
      >
        <option value="" disabled>
          Seleziona campionato…
        </option>
        {leagues.map(l => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    );
  }, [leagues, leagueId, router]);

  return (
    <div style={{ borderBottom: "1px solid #eee", padding: "10px 16px", position: "sticky", top: 0, background: "white", zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/" style={{ fontWeight: 900, textDecoration: "none" }}>⚽ Home</Link>

        {inLeague ? (
          <>
            <span style={{ opacity: 0.6 }}>•</span>
            <Link href={`/leagues/${leagueId}`} style={{ textDecoration: "none", fontWeight: 800 }}>
              {leagueName || "Campionato"}
            </Link>

            <span style={{ opacity: 0.6 }}>|</span>

            <Link href={`/leagues/${leagueId}/calendar`} style={{ textDecoration: "none" }}>Calendario</Link>
            <Link href={`/leagues/${leagueId}/teams`} style={{ textDecoration: "none" }}>Squadre</Link>
            <Link href={`/leagues/${leagueId}/stats`} style={{ textDecoration: "none" }}>Stats</Link>
            <Link href={`/leagues/${leagueId}/table`} style={{ textDecoration: "none" }}>Classifica</Link>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              {leagueSelect} <PlayerSearchBox leagueId={leagueId as string} />
            </div>

          </>
        ) : (
          <>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ opacity: 0.75, fontSize: 13 }}>Vai al calendario:</span>
              {leagueSelect}
            </div>
          </>
        )}
      </div>
    </div>
  );
}