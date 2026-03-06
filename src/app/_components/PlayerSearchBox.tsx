"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PlayerHit = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  team: { id: string; name: string };
};

export default function PlayerSearchBox({ leagueId }: { leagueId: string }) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<PlayerHit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const qq = q.trim();
    if (!leagueId || qq.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/players?q=${encodeURIComponent(qq)}`, { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error((data as any)?.error ?? "Errore ricerca");

        const arr = Array.isArray(data) ? (data as PlayerHit[]) : [];
        setItems(arr.slice(0, 8));
        setOpen(true);
      } catch {
        setItems([]);
        setOpen(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [q, leagueId]);

  function goToPlayer(playerId: string) {
    setOpen(false);
    setQ("");
    router.push(`/leagues/${leagueId}/players/${playerId}`);
  }

  function goToFirst() {
    if (!items.length) return;
    goToPlayer(items[0].id);
  }

  return (
    <div style={{ position: "relative", minWidth: 280, width: 360, maxWidth: "100%" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca giocatore (nome, cognome, #, squadra)…"
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        onBlur={() => {
          // piccolo delay per permettere click sui risultati
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            goToFirst();
          }
          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
      />

      {open && items.length > 0 ? (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #eee",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
            zIndex: 100,
          }}
        >
          {items.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // evita blur prima del click
              onClick={() => goToPlayer(p.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 10,
                border: "none",
                background: "white",
                cursor: "pointer",
                borderBottom: idx === items.length - 1 ? "none" : "1px solid #f3f3f3",
              }}
            >
              <div className="min-w-0 pr-2">
                <div className="text-lg font-bold text-white">
                  #{p.number} {p.firstName} {p.lastName}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{p.team.name}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}