"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Goal, Handshake, Pencil, Shield, WalletCards } from "lucide-react";
import DashboardShell from "src/app/_components/dashboard-shell";
import Card from "src/app/_components/ui/card";
import Button from "src/app/_components/ui/button";
import Badge from "src/app/_components/ui/badge";
import Input from "src/app/_components/ui/input";
import Select from "src/app/_components/ui/select";
import { useAuth } from "@/lib/client-auth";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position?: string | null;
  photoUrl?: string | null;
  birthDate?: string | null;
  documentSigned?: boolean;
  signedAt?: string | null;
  mediaConsent?: boolean;
  wildcardUsed?: boolean;
  status?: string;
  statusNote?: string | null;
  registrationStatus?: string;
  isEligibleForMatchSheet?: boolean;
  adminMissingItems?: string[];
  teamId?: string | null;
  team?: {
    id: string;
    name: string;
    badgeUrl?: string | null;
    leagueId: string;
    league?: { id: string; name: string } | null;
  } | null;
};

type PlayerStatsResponse = {
  goals?: number;
  assists?: number;
  appearances?: number;
  feeCents?: number;
  recentMatches?: Array<{
    matchId: string;
    date: string | null;
    homeTeamName: string;
    awayTeamName: string;
    homeGoals: number | null;
    awayGoals: number | null;
    goals: number;
    assists: number;
  }>;
};

const POSITIONS = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];

const PLAYER_STATUS_OPTIONS = [
  ["PENDING", "Da completare"],
  ["IN_REVIEW", "In verifica"],
  ["AUTHORIZED", "Autorizzato"],
  ["BLOCKED", "Bloccato"],
  ["SUSPENDED", "Squalificato"],
  ["RETIRED", "Ritirato"],
] as const;

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("futbol-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function playerStatusLabel(player: Player | null) {
  if (!player) return "Da completare";
  if (player.registrationStatus) return player.registrationStatus;
  if (player.isEligibleForMatchSheet) return "Iscrizione OK";
  return PLAYER_STATUS_OPTIONS.find(([value]) => value === player.status)?.[1] ?? "Da completare";
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", headers: getAuthHeaders(), body: formData });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error((data as any)?.error ?? "Errore upload immagine");
  if (!(data as any)?.url) throw new Error("Upload completato ma URL immagine mancante");

  return (data as any).url as string;
}

export default function PlayerPage() {
  const { leagueId, playerId } = useParams<{ leagueId: string; playerId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [player, setPlayer] = useState<Player | null>(null);
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [appearances, setAppearances] = useState(0);
  const [feeCents, setFeeCents] = useState<number | null>(null);
  const [recentMatches, setRecentMatches] = useState<PlayerStatsResponse["recentMatches"]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [documentSigned, setDocumentSigned] = useState(false);
  const [signedAt, setSignedAt] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [wildcardUsed, setWildcardUsed] = useState(false);
  const [status, setStatus] = useState("PENDING");
  const [statusNote, setStatusNote] = useState("");

  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const playerRes = await fetch(`/api/players/${playerId}`, { cache: "no-store", headers: getAuthHeaders() });
      const playerData = await playerRes.json().catch(() => ({}));
      if (!playerRes.ok) throw new Error((playerData as any)?.error ?? "Errore caricamento giocatore");

      const statsRes = await fetch(`/api/players/${playerId}/stats`, { cache: "no-store", headers: getAuthHeaders() });
      const statsData: PlayerStatsResponse = await statsRes.json().catch(() => ({}));

      setPlayer(playerData);
      setGoals(statsRes.ok ? (statsData.goals ?? 0) : 0);
      setAssists(statsRes.ok ? (statsData.assists ?? 0) : 0);
      setAppearances(statsRes.ok ? (statsData.appearances ?? 0) : 0);
      setFeeCents(statsRes.ok && typeof statsData.feeCents === "number" ? statsData.feeCents : null);
      setRecentMatches(statsRes.ok ? (statsData.recentMatches ?? []) : []);

      setFirstName(playerData.firstName ?? "");
      setLastName(playerData.lastName ?? "");
      setNumber(String(playerData.number ?? ""));
      setPosition(playerData.position ?? "");
      setPhotoUrl(playerData.photoUrl ?? "");
      setPhotoFile(null);
      setRemovePhoto(false);
      setBirthDate(playerData.birthDate ? String(playerData.birthDate).slice(0, 10) : "");
      setDocumentSigned(Boolean(playerData.documentSigned));
      setSignedAt(playerData.signedAt ? String(playerData.signedAt).slice(0, 10) : "");
      setMediaConsent(Boolean(playerData.mediaConsent));
      setWildcardUsed(Boolean(playerData.wildcardUsed));
      setStatus(playerData.status ?? "PENDING");
      setStatusNote(playerData.statusNote ?? "");
    } catch (e: any) {
      setErr(e.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!leagueId || !playerId) return;
    load();
  }, [leagueId, playerId]);

  const photoPreview = useMemo(() => {
    if (removePhoto) return "";
    if (photoFile) return URL.createObjectURL(photoFile);
    return photoUrl || "";
  }, [photoFile, photoUrl, removePhoto]);

  async function savePlayer() {
    setErr(null);
    setMsg(null);

    const n = Number(number);
    if (!firstName.trim() || !lastName.trim()) return setErr("Inserisci nome e cognome");
    if (!Number.isInteger(n) || n <= 0 || n > 99) return setErr("Numero maglia non valido");

    try {
      setSaving(true);
      let finalPhotoUrl: string | null = removePhoto ? null : photoUrl.trim() || null;

      if (photoFile) {
        if (!photoFile.type.startsWith("image/")) throw new Error("Seleziona un'immagine valida");
        if (photoFile.size > 5 * 1024 * 1024) throw new Error("La foto deve essere massimo 5 MB");
        finalPhotoUrl = await uploadImage(photoFile);
      }

      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        number: n,
        position: position || null,
        photoUrl: finalPhotoUrl,
      };

      if (isAdmin) {
        Object.assign(body, {
          birthDate: birthDate || null,
          documentSigned,
          signedAt: signedAt || null,
          mediaConsent,
          wildcardUsed,
          status,
          statusNote: statusNote.trim() || null,
        });
      }

      const res = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error ?? "Errore aggiornamento giocatore");

      setMsg("Profilo aggiornato");
      setEditing(false);
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Errore");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell leagueId={leagueId}>
        <div className="text-[var(--foreground)]/60">Caricamento…</div>
      </DashboardShell>
    );
  }

  if (!player) {
    return (
      <DashboardShell leagueId={leagueId}>
        <Badge variant="error">{err ?? "Giocatore non trovato"}</Badge>
      </DashboardShell>
    );
  }

  const fullName = `${player.firstName} ${player.lastName}`;
  const canEditSport = isAdmin || (user?.role === "CAPTAIN" && user.teamId === player.team?.id);

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="w-full space-y-5 pb-8">
        <Link href={player.team ? `/leagues/${leagueId}/teams/${player.team.id}` : `/leagues/${leagueId}/players`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft size={15} /> Torna alla squadra
        </Link>

        {msg && <Badge variant="success">{msg}</Badge>}
        {err && <Badge variant="error">{err}</Badge>}

        <Card className="overflow-hidden !p-0">
          <div className="matchroom-hero grid gap-5 p-4 sm:p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-black/20 p-3 text-center sm:min-h-[280px]">
              <PlayerAvatar firstName={player.firstName} lastName={player.lastName} number={player.number} photoUrl={player.photoUrl ?? null} />
              <p className="mt-2 text-sm text-[var(--muted)]">{player.position || "Ruolo non impostato"}</p>
            </div>

            <div className="flex flex-col justify-between gap-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--accent)]">Player Passport</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-0.08em] text-[var(--foreground)] sm:text-6xl">{fullName}</h1>
                <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{player.team?.name ?? "Squadra non disponibile"}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <PassportPill label="Stato" value={playerStatusLabel(player)} positive={player.isEligibleForMatchSheet} />
                <PassportPill label="Presenze" value={appearances} />
                {isAdmin && <PassportPill label="Quota" value={formatEuro(feeCents ?? appearances * 50)} />}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Squadra" value={player.team?.name ?? "—"} icon={<Shield size={16} />} />
          <MiniStat label="Gol" value={goals} icon={<Goal size={16} />} />
          <MiniStat label="Assist" value={assists} icon={<Handshake size={16} />} />
          <MiniStat label="Presenze" value={appearances} icon={<CalendarDays size={16} />} />
          {isAdmin && <MiniStat label="Quote" value={formatEuro(feeCents ?? appearances * 50)} icon={<WalletCards size={16} />} />}
        </div>

        <div className={isAdmin ? "grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] 2xl:grid-cols-[minmax(0,1.45fr)_420px]" : "grid gap-5"}>
          <Card className={!isAdmin ? "xl:col-span-2" : undefined}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[var(--foreground)]">Profilo sportivo</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Dati pubblici e stato sintetico iscrizione.</p>
              </div>
              {canEditSport && (
                <button onClick={() => setEditing((v) => !v)} className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--card-2)] text-[var(--muted)] hover:text-[var(--foreground)]">
                  <Pencil size={16} />
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoRow label="Nome" value={fullName} />
              <InfoRow label="Numero" value={`#${player.number}`} />
              <InfoRow label="Ruolo" value={player.position || "Non impostato"} />
              <InfoRow label="Iscrizione" value={playerStatusLabel(player)} />
            </div>
          </Card>

          {isAdmin && (
            <Card>
              <h2 className="text-xl font-black text-[var(--foreground)]">Area admin</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Dettagli tecnici visibili solo all'amministratore.</p>
              <div className="mt-5 space-y-3">
                <CheckLine ok={Boolean(player.documentSigned)} label="Modulo unico firmato" />
                <CheckLine ok={Boolean(player.mediaConsent)} label="Liberatoria video/foto" />
                <CheckLine ok={player.status === "AUTHORIZED"} label={`Stato: ${playerStatusLabel(player)}`} />
                <CheckLine ok={!player.wildcardUsed} label={player.wildcardUsed ? "Wildcard usata" : "Wildcard non usata"} />
                {player.statusNote && <p className="rounded-2xl bg-[var(--card-2)] p-3 text-sm text-[var(--muted)]">{player.statusNote}</p>}
              </div>
            </Card>
          )}
        </div>

        {editing && canEditSport && (
          <Card>
            <h2 className="mb-4 text-lg font-black text-[var(--foreground)]">Modifica giocatore</h2>
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)] lg:items-start">
                <div>{photoPreview ? <img src={photoPreview} alt="Preview" className="h-28 w-28 rounded-[1.5rem] border border-[var(--border)] object-cover md:h-36 md:w-36" /> : <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-white/5 text-xs font-bold text-[var(--foreground)]/35 md:h-36 md:w-36">N/A</div>}</div>
                <div className="space-y-3">
                  <input type="file" accept="image/*" aria-label="Carica foto giocatore" onChange={(e) => { const file = e.target.files?.[0] ?? null; setPhotoFile(file); if (file) setRemovePhoto(false); }} className="block w-full rounded-xl border border-[var(--border)] bg-white/5 px-3.5 py-2.5 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black" />
                  <Button variant="destructive" size="sm" onClick={() => { setPhotoFile(null); setPhotoUrl(""); setRemovePhoto(true); }}>Rimuovi foto</Button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Input aria-label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" />
                <Input aria-label="Cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Cognome" />
                <Input aria-label="Numero maglia" value={number} onChange={(e) => setNumber(e.target.value.replace(/[^\d]/g, ""))} placeholder="Numero" inputMode="numeric" />
                <Select aria-label="Ruolo" value={position} onChange={(e) => setPosition(e.target.value)}>
                  <option value="" className="text-black">Ruolo</option>
                  {POSITIONS.map((p) => <option key={p} value={p} className="text-black">{p}</option>)}
                </Select>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-[var(--foreground)]/70">Documenti e autorizzazioni FUTPOLI</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Input aria-label="Data di nascita" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                    <Input aria-label="Data firma" type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
                    <Select aria-label="Stato admin" value={status} onChange={(e) => setStatus(e.target.value)}>{PLAYER_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value} className="text-black">{label}</option>)}</Select>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[["Modulo firmato", documentSigned, setDocumentSigned], ["Liberatoria video/foto", mediaConsent, setMediaConsent], ["Wildcard", wildcardUsed, setWildcardUsed]].map(([label, value, setter]) => (
                      <label key={label as string} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]/80"><input type="checkbox" checked={value as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} />{label as string}</label>
                    ))}
                  </div>
                  <Input aria-label="Note stato" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Note admin opzionali" className="mt-3" />
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={savePlayer} disabled={saving}>{saving ? "Salvataggio…" : "Salva modifiche"}</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Annulla</Button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-black text-[var(--foreground)]">Ultime presenze</h2>
          {recentMatches?.length === 0 ? <p className="text-sm text-[var(--foreground)]/55">Nessuna presenza registrata per questo giocatore.</p> : (
            <div className="space-y-3">{recentMatches?.map((match) => (
              <Link key={match.matchId} href={`/leagues/${leagueId}/matches/${match.matchId}`} className="block rounded-2xl border border-[var(--border)] bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><div className="break-words font-semibold text-[var(--foreground)]">{match.homeTeamName} vs {match.awayTeamName}</div><div className="mt-1 text-sm text-[var(--foreground)]/55">{match.date ? new Date(match.date).toLocaleDateString("it-IT") : "Data da definire"}</div></div>
                  <div className="flex items-center gap-4"><div className="text-sm font-bold text-[var(--foreground)]">{match.homeGoals ?? "-"} - {match.awayGoals ?? "-"}</div><div className="text-xs text-[var(--foreground)]/60">{match.goals} gol · {match.assists} assist</div></div>
                </div>
              </Link>
            ))}</div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

function PlayerAvatar({ firstName, lastName, number, photoUrl }: { firstName: string; lastName: string; number: number; photoUrl?: string | null }) {
  const fullName = `${firstName} ${lastName}`;
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  const frameClass =
    "relative aspect-[4/5] h-[220px] w-full max-w-[210px] shrink-0 overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--background)] shadow-sm sm:h-[235px] sm:max-w-[225px]";

  if (photoUrl) {
    return (
      <div className={frameClass}>
        <img src={photoUrl} alt={`Foto ${fullName}`} className="absolute inset-0 h-full w-full object-cover object-center" />
        <span className="absolute bottom-0 right-0 flex h-12 min-w-12 items-center justify-center rounded-tl-3xl bg-[var(--accent)] px-3 text-base font-black text-black">{number}</span>
      </div>
    );
  }

  return (
    <div className={`${frameClass} flex items-center justify-center text-4xl font-black text-[var(--accent)]`}>
      {initials || "?"}
      <span className="absolute bottom-0 right-0 flex h-12 min-w-12 items-center justify-center rounded-tl-3xl bg-[var(--accent)] px-3 text-base font-black text-black">{number}</span>
    </div>
  );
}

function PassportPill({ label, value, positive }: { label: string; value: string | number; positive?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p><p className={["mt-1 text-base font-black", positive ? "text-[var(--accent)]" : "text-[var(--foreground)]"].join(" ")}>{value}</p></div>;
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <Card variant="inner"><div className="flex items-center gap-2 text-[var(--foreground)]/50">{icon}<p className="text-xs font-medium uppercase tracking-widest">{label}</p></div><p className="mt-3 text-2xl font-black text-[var(--foreground)]">{value}</p></Card>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[var(--card-2)] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p><p className="mt-1 font-black text-[var(--foreground)]">{value}</p></div>;
}

function CheckLine({ ok, label }: { ok: boolean; label: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--card-2)] px-4 py-3 text-sm"><span className="font-semibold text-[var(--foreground)]">{label}</span><span className={ok ? "text-[var(--accent)]" : "text-amber-300"}>{ok ? "OK" : "NO"}</span></div>;
}
