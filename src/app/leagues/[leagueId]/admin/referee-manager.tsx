"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "src/app/_components/ui/card";
import Badge from "src/app/_components/ui/badge";
import Button from "src/app/_components/ui/button";
import Input from "src/app/_components/ui/input";
import { authFetch } from "@/lib/client-auth";

type RefereeRow = {
  id: string;
  name: string;
  active: boolean;
  account?: {
    id: string;
    username: string;
  } | null;
};

type GeneratedCredentials = {
  refereeId: string;
  username: string;
  password: string;
};

export default function RefereeManager({ leagueId }: { leagueId: string }) {
  const [referees, setReferees] = useState<RefereeRow[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [credentials, setCredentials] =
    useState<GeneratedCredentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const response = await authFetch(
        `/api/leagues/${leagueId}/referees`,
        { cache: "no-store" }
      );
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore caricamento arbitri");
      }
      setReferees(Array.isArray(data) ? data : []);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Errore caricamento arbitri"
      );
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addReferee() {
    if (!newName.trim()) return;
    setSaving(true);
    setErr(null);

    try {
      const response = await authFetch(
        `/api/leagues/${leagueId}/referees`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore aggiunta arbitro");
      }
      setNewName("");
      await load();
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Errore aggiunta arbitro"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(referee: RefereeRow) {
    setSaving(true);
    setErr(null);

    try {
      const response = await authFetch(
        `/api/leagues/${leagueId}/referees`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: referee.id,
            active: !referee.active,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore aggiornamento arbitro");
      }
      await load();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Errore aggiornamento arbitro"
      );
    } finally {
      setSaving(false);
    }
  }

  async function createCredentials(referee: RefereeRow) {
    setSaving(true);
    setErr(null);
    setCredentials(null);

    try {
      const response = await authFetch(
        `/api/leagues/${leagueId}/referees/${referee.id}/credentials`,
        { method: "POST" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore creazione credenziali");
      }
      setCredentials({
        refereeId: referee.id,
        username: data.account.username,
        password: data.password,
      });
      await load();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Errore creazione credenziali"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Direzione di gara
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--foreground)]">
          Elenco arbitri
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Ogni partita ha un solo arbitro. L&apos;account Arbitro può aggiornare
          risultato, distinta, gol e assist soltanto nelle gare che gli sono
          assegnate.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome e cognome arbitro"
          className="flex-1"
        />
        <Button
          onClick={addReferee}
          disabled={saving || newName.trim().length < 3}
        >
          Aggiungi arbitro
        </Button>
      </div>

      {err && <Badge variant="error" className="mt-3">{err}</Badge>}

      {credentials && (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
            Credenziali generate · copiale ora
          </p>
          <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
            Username: <b>{credentials.username}</b>
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--foreground)]">
            Password: <b>{credentials.password}</b>
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            La password non verrà mostrata di nuovo; potrai comunque
            reimpostarla dalla gestione utenti.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Caricamento arbitri…</p>
        ) : (
          referees.map((referee) => (
            <div
              key={referee.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-[var(--foreground)]">
                  {referee.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {referee.account
                    ? `Account: ${referee.account.username}`
                    : "Nessun account collegato"}
                  {!referee.active ? " · non selezionabile" : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!referee.account && (
                  <Button
                    size="sm"
                    onClick={() => createCredentials(referee)}
                    disabled={saving}
                  >
                    Genera credenziali
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleActive(referee)}
                  disabled={saving}
                >
                  {referee.active ? "Disattiva" : "Riattiva"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
