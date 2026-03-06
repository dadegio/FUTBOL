"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Player = { id: string; firstName: string; lastName: string; number: number };
type Team = {
  id: string;
  name: string;
  badgeUrl?: string | null;
  league: { id: string; name: string };
  players: Player[];
};

export default function TeamPage() {
  const { leagueId, teamId } = useParams<{ leagueId: string; teamId: string }>();

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");

  async function load() {
    setErr(null);
    const res = await fetch(`/api/teams/${teamId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Errore");
    setTeam(data);
    setName(data.name ?? "");
    setBadgeUrl(data.badgeUrl ?? "");
  }

  useEffect(() => {
    if (!teamId) return;
    load().catch(e => setErr(e.message));
  }, [teamId]);

  async function saveTeam() {
    setErr(null);
    setMsg(null);

    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        badgeUrl: badgeUrl.trim() ? badgeUrl.trim() : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) return setErr(data?.error ?? "Errore");

    setMsg("Squadra aggiornata ✅");
    await load();
  }

  async function addPlayer() {
    setErr(null);
    setMsg(null);

    const n = Number(newNumber);
    if (!newFirstName.trim() || !newLastName.trim()) {
      setErr("Inserisci nome e cognome");
      return;
    }
    if (!Number.isInteger(n) || n <= 0) {
      setErr("Numero non valido");
      return;
    }

    const res = await fetch(`/api/teams/${teamId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        number: n,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data?.error ?? "Errore aggiunta giocatore");

    setNewFirstName("");
    setNewLastName("");
    setNewNumber("");
    setMsg("Giocatore aggiunto ✅");
    await load();
  }

  async function savePlayer(playerId: string, firstName: string, lastName: string, number: string) {
    setErr(null);
    setMsg(null);

    const n = Number(number);
    if (!firstName.trim() || !lastName.trim()) {
      setErr("Nome e cognome non validi");
      return;
    }
    if (!Number.isInteger(n) || n <= 0) {
      setErr("Numero non valido");
      return;
    }

    const res = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        number: n,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data?.error ?? "Errore aggiornamento giocatore");

    setMsg("Giocatore aggiornato ✅");
    await load();
  }

  async function deletePlayer(playerId: string, label: string) {
    setErr(null);
    setMsg(null);

    const ok = window.confirm(`Eliminare il giocatore "${label}"?`);
    if (!ok) return;

    const res = await fetch(`/api/players/${playerId}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data?.error ?? "Errore eliminazione giocatore");

    setMsg("Giocatore eliminato ✅");
    await load();
  }

  async function swapNumbers() {
    setErr(null);
    setMsg(null);

    if (!swapA || !swapB) return setErr("Seleziona due giocatori");
    if (swapA === swapB) return setErr("Seleziona due giocatori diversi");

    const res = await fetch(`/api/teams/${teamId}/swap-numbers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aPlayerId: swapA, bPlayerId: swapB }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(data?.error ?? "Errore scambio");

    setMsg("Numeri scambiati ✅");
    setSwapA("");
    setSwapB("");
    await load();
  }

  if (!team) {
    return (
      <div>
        <div>Caricamento…</div>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
      </div>
    );
  }

  const sortedPlayers = [...team.players].sort((a, b) => a.number - b.number);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ marginTop: 0 }}>Club: {team.name}</h1>
        <Link href={`/leagues/${leagueId}/teams`} style={{ textDecoration: "none" }}>
          ← Lista squadre
        </Link>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Modifica info squadra</h2>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome squadra"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <input
            value={badgeUrl}
            onChange={e => setBadgeUrl(e.target.value)}
            placeholder="Stemma (URL) opzionale"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </div>

        <button
          onClick={saveTeam}
          style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Salva squadra
        </button>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Aggiungi giocatore</h2>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input
            value={newFirstName}
            onChange={e => setNewFirstName(e.target.value)}
            placeholder="Nome"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <input
            value={newLastName}
            onChange={e => setNewLastName(e.target.value)}
            placeholder="Cognome"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Numero"
            inputMode="numeric"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </div>

        <button
          onClick={addPlayer}
          disabled={team.players.length >= 16}
          style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {team.players.length >= 16 ? "Rosa completa (16)" : "Aggiungi giocatore"}
        </button>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Scambia numeri di maglia</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={swapA}
            onChange={e => setSwapA(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 220 }}
          >
            <option value="">Giocatore A…</option>
            {sortedPlayers.map(p => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.firstName} {p.lastName}
              </option>
            ))}
          </select>

          <span style={{ fontWeight: 900 }}>↔</span>

          <select
            value={swapB}
            onChange={e => setSwapB(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 220 }}
          >
            <option value="">Giocatore B…</option>
            {sortedPlayers.map(p => (
              <option key={p.id} value={p.id}>
                #{p.number} {p.firstName} {p.lastName}
              </option>
            ))}
          </select>

          <button
            onClick={swapNumbers}
            disabled={!swapA || !swapB || swapA === swapB}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Scambia
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Rosa ({team.players.length}/16)</h2>

        <div style={{ display: "grid", gap: 8 }}>
          {sortedPlayers.map(p => (
            <PlayerEditor
              key={p.id}
              player={p}
              leagueId={leagueId}
              onSave={savePlayer}
              onDelete={deletePlayer}
            />
          ))}
        </div>
      </div>

      {msg && <div style={{ marginTop: 12, color: "green" }}>{msg}</div>}
      {err && <div style={{ marginTop: 12, color: "#b00020" }}>{err}</div>}
    </div>
  );
}

function PlayerEditor({
  player,
  leagueId,
  onSave,
  onDelete,
}: {
  player: Player;
  leagueId: string;
  onSave: (playerId: string, firstName: string, lastName: string, number: string) => void;
  onDelete: (playerId: string, label: string) => void;
}) {
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [number, setNumber] = useState(String(player.number));

  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 10,
        padding: 10,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "90px 1fr 1fr auto auto" }}>
        <input
          value={number}
          onChange={e => setNumber(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc", textAlign: "center", fontWeight: 800 }}
        />

        <input
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder="Nome"
          style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
        />

        <input
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          placeholder="Cognome"
          style={{ padding: 8, borderRadius: 10, border: "1px solid #ccc" }}
        />

        <button
          onClick={() => onSave(player.id, firstName, lastName, number)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Salva
        </button>

        <button
          onClick={() => onDelete(player.id, `${player.firstName} ${player.lastName}`)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Elimina
        </button>
      </div>

      <Link
        href={`/leagues/${leagueId}/players/${player.id}`}
        style={{ textDecoration: "none", color: "inherit", fontSize: 13, opacity: 0.8 }}
      >
        Vai alla scheda giocatore →
      </Link>
    </div>
  );
}