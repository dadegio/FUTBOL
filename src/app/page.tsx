"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type League = { id: string; name: string };

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error ?? "Errore");
  return data as T;
}

export default function HomePage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const ls = await getJSON<League[]>("/api/leagues");
    setLeagues(ls);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function create() {
    setErr(null);
    const n = name.trim();
    if (!n) return setErr("Inserisci un nome torneo");

    try {
      await postJSON("/api/leagues", { name: n });
      setName("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ marginTop: 0 }}>Gestione Campionati</h1>
      <p style={{ opacity: 0.75 }}>
        Crea un torneo oppure selezionane uno: verrai portato direttamente al calendario.
      </p>

      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Crea nuovo torneo</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome torneo"
            style={{ flex: "1 1 280px", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <button onClick={create} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}>
            Crea
          </button>
        </div>
        {err ? <div style={{ marginTop: 8, color: "#b00020" }}>{err}</div> : null}
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Tornei salvati</div>
        {leagues.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Nessun torneo.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {leagues.map(l => (
  <div
    key={l.id}
    style={{
      display: "flex",
      gap: 8,
      alignItems: "stretch",
    }}
  >
    <Link
      href={`/leagues/${l.id}/calendar`}
      style={{
        flex: 1,
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #f0f0f0",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div style={{ fontWeight: 900 }}>{l.name}</div>
      <div style={{ fontSize: 12, opacity: 0.65 }}>{l.id}</div>
    </Link>

    <button
      onClick={async () => {
        setErr(null);
        const ok = window.confirm(
          `Eliminare il torneo "${l.name}"?\n\nVerranno cancellati anche squadre, giocatori, partite e statistiche.`
        );
        if (!ok) return;

        try {
          const res = await fetch(`/api/leagues/${l.id}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error((data as any)?.error ?? "Errore eliminazione");

          await load();
        } catch (e: any) {
          setErr(e.message);
        }
      }}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #f0f0f0",
        background: "white",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Elimina
    </button>
  </div>
))}
          </div>
        )}
      </div>

    </div>
  );
}