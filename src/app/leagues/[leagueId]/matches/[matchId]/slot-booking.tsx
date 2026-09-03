"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import Card from "src/app/_components/ui/card";
import Button from "src/app/_components/ui/button";
import Badge from "src/app/_components/ui/badge";
import Select from "src/app/_components/ui/select";
import { authFetch } from "@/lib/client-auth";

type Slot = {
  key: string;
  venueKey: string;
  venueName: string;
  address: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  isCurrentMatch: boolean;
};

type Booking = {
  startsAt: string;
  endsAt: string | null;
  venueKey: string;
  venueName: string | null;
  address: string | null;
};

type SlotsResponse = {
  currentBooking: Booking | null;
  matchWeek: {
    round: number;
    startsAt: string;
    endsAt: string;
  };
  bookingWindow: {
    opensAt: string;
    closesAt: string;
    isOpen: boolean;
    adminBypass: boolean;
  };
  slots: Slot[];
};

function formatSlotDate(date: string) {
  return new Date(date).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slotValue(slot: Pick<Slot, "venueKey" | "startsAt">) {
  return `${slot.venueKey}|${slot.startsAt}`;
}

function formatMatchWeek(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(new Date(endsAt).getTime() - 1);

  return `${start.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  })} – ${end.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export default function MatchSlotBooking({
  leagueId,
  matchId,
  canBook,
  initialBooking,
}: {
  leagueId: string;
  matchId: string;
  canBook: boolean;
  initialBooking: Booking | null;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentBooking, setCurrentBooking] = useState(initialBooking);
  const [selected, setSelected] = useState("");
  const [matchWeek, setMatchWeek] =
    useState<SlotsResponse["matchWeek"] | null>(null);
  const [bookingWindow, setBookingWindow] = useState<SlotsResponse["bookingWindow"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentBooking(initialBooking);
  }, [initialBooking]);

  const loadSlots = useCallback(async () => {
    if (!canBook) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await authFetch(
        `/api/leagues/${leagueId}/slots?matchId=${encodeURIComponent(matchId)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Errore caricamento slot");

      const response = data as SlotsResponse;
      setSlots(response.slots);
      setCurrentBooking(response.currentBooking);
      setMatchWeek(response.matchWeek);
      setBookingWindow(response.bookingWindow);

      const current = response.slots.find((slot) => slot.isCurrentMatch);
      if (current) setSelected(slotValue(current));
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Errore caricamento slot"
      );
    } finally {
      setLoading(false);
    }
  }, [canBook, leagueId, matchId]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const bookingAllowed = bookingWindow?.isOpen !== false;

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.available),
    [slots]
  );

  async function book() {
    const slot = availableSlots.find(
      (candidate) => slotValue(candidate) === selected
    );
    if (!slot) return;

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await authFetch(`/api/matches/${matchId}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueKey: slot.venueKey,
          startsAt: slot.startsAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Errore prenotazione");

      setMsg("Campo prenotato");
      await loadSlots();
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Errore prenotazione");
    } finally {
      setSaving(false);
    }
  }

  async function release() {
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await authFetch(`/api/matches/${matchId}/booking`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Errore liberazione slot");

      setCurrentBooking(null);
      setSelected("");
      setMsg("Slot liberato");
      await loadSlots();
      router.refresh();
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Errore liberazione slot"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            Prenotazione campo
          </p>
          {matchWeek && (
            <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
              Giornata {matchWeek.round} · settimana{" "}
              {formatMatchWeek(matchWeek.startsAt, matchWeek.endsAt)}
            </p>
          )}

          {currentBooking ? (
            <div className="mt-2 space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-black text-[var(--foreground)]">
                <CalendarDays size={15} className="text-[var(--accent)]" />
                {formatSlotDate(currentBooking.startsAt)}
              </p>
              <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <MapPin size={15} className="text-[var(--accent)]" />
                {currentBooking.venueName ?? "Campo"}
                {currentBooking.address
                  ? ` · ${currentBooking.address}`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Nessun campo prenotato per questa partita.
            </p>
          )}
        </div>

        {canBook && (
          <div className="flex w-full flex-col gap-2 lg:max-w-[620px] lg:flex-row">
            <Select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={loading || saving || !bookingAllowed}
              className="min-w-0 flex-1"
            >
              <option value="" className="text-black">
                {loading ? "Caricamento slot…" : "Scegli campo e orario"}
              </option>
              {availableSlots.map((slot) => (
                <option
                  key={slotValue(slot)}
                  value={slotValue(slot)}
                  className="text-black"
                >
                  {formatSlotDate(slot.startsAt)} · {slot.venueName}
                  {slot.address ? ` · ${slot.address}` : ""}
                </option>
              ))}
            </Select>
            <Button onClick={book} disabled={!selected || loading || saving || !bookingAllowed}>
              {saving ? "…" : currentBooking ? "Cambia slot" : "Prenota"}
            </Button>
            {currentBooking && (
              <Button
                variant="secondary"
                onClick={release}
                disabled={saving || !bookingAllowed}
              >
                Libera
              </Button>
            )}
          </div>
        )}
      </div>


      {canBook && bookingWindow && !bookingWindow.isOpen && (
        <div className="mt-3 rounded-2xl border border-amber-300/40 bg-amber-50/70 px-4 py-3 text-xs font-semibold text-amber-900">
          Prenotazioni bloccate. Per i capitani si aprono mercoledì e si chiudono sabato della settimana precedente alla partita.
          <div className="mt-1 font-normal opacity-80">
            Finestra: {new Date(bookingWindow.opensAt).toLocaleString("it-IT")} – {new Date(new Date(bookingWindow.closesAt).getTime() - 1).toLocaleString("it-IT")}
          </div>
        </div>
      )}
      {canBook && bookingWindow?.adminBypass && (
        <p className="mt-3 text-xs font-semibold text-[var(--accent)]">Override admin attivo: puoi modificare la prenotazione in qualsiasi momento.</p>
      )}

      {canBook && bookingAllowed && !loading && availableSlots.length === 0 && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Nessuno slot libero nella settimana assegnata a questa giornata.
        </p>
      )}
      {msg && <Badge variant="success" className="mt-3">{msg}</Badge>}
      {err && <Badge variant="error" className="mt-3">{err}</Badge>}
    </Card>
  );
}
