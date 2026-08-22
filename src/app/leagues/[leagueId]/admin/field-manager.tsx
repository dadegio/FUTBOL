"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "src/app/_components/ui/card";
import Badge from "src/app/_components/ui/badge";
import Button from "src/app/_components/ui/button";
import Input from "src/app/_components/ui/input";
import { authFetch } from "@/lib/client-auth";

type FieldRow = {
  id: string;
  name: string;
  address: string;
  active: boolean;
};

export default function FieldManager({ leagueId }: { leagueId: string }) {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const response = await authFetch(`/api/leagues/${leagueId}/fields`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore caricamento campi");
      }
      setFields(Array.isArray(data) ? data : []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Errore caricamento campi");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addField() {
    if (!newName.trim() || !newAddress.trim()) return;
    setSaving(true);
    setErr(null);

    try {
      const response = await authFetch(`/api/leagues/${leagueId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, address: newAddress }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore aggiunta campo");
      }
      setNewName("");
      setNewAddress("");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Errore aggiunta campo");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(field: FieldRow) {
    setSaving(true);
    setErr(null);

    try {
      const response = await authFetch(`/api/leagues/${leagueId}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: field.id, active: !field.active }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error ?? "Errore aggiornamento campo");
      }
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Errore aggiornamento campo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Impianti
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--foreground)]">
          Campi disponibili
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Aggiungi i campi utilizzabili nel torneo. Sono sufficienti nome del campo e via; i campi attivi vengono proposti negli orari standard del torneo.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nome campo"
        />
        <Input
          value={newAddress}
          onChange={(event) => setNewAddress(event.target.value)}
          placeholder="Via / indirizzo"
        />
        <Button
          onClick={addField}
          disabled={saving || !newName.trim() || !newAddress.trim()}
        >
          Aggiungi campo
        </Button>
      </div>

      {err && <Badge variant="error" className="mt-3">{err}</Badge>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Caricamento campi…</p>
        ) : fields.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nessun campo inserito.</p>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-black text-[var(--foreground)]">{field.name}</p>
                <p className="mt-0.5 break-words text-xs text-[var(--muted)]">
                  {field.address}{!field.active ? " · non selezionabile" : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleActive(field)}
                disabled={saving}
              >
                {field.active ? "Disattiva" : "Riattiva"}
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
