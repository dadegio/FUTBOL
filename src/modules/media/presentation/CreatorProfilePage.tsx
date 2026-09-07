"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, ExternalLink, Instagram, Mail, Play, UserRound, Video } from "lucide-react";
import DashboardShell from "src/app/_components/dashboard-shell";
import Card, { CardHeader } from "src/app/_components/ui/card";
import Badge from "src/app/_components/ui/badge";
import Button from "src/app/_components/ui/button";

type Creator = {
  id: string;
  displayName: string;
  roleLabel: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  primaryColor: string | null;
  showEmail: boolean;
  showInstagram: boolean;
  showTikTok: boolean;
  showYoutube: boolean;
  showPhone: boolean;
};

type MediaItem = {
  id: string;
  type: string;
  title: string | null;
  caption: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  socialUrl: string | null;
  featured: boolean;
};

function isVideo(item: MediaItem) {
  return ["VIDEO", "REEL", "HIGHLIGHT", "INTERVIEW"].includes(item.type) || /\.(mp4|webm|mov)(\?|$)/i.test(item.fileUrl);
}

function canPlayVideo(item: MediaItem) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(item.fileUrl) || item.fileUrl.startsWith("/media/");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CreatorProfilePage() {
  const { leagueId, creatorId } = useParams<{ leagueId: string; creatorId: string }>();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const [creatorsRes, mediaRes] = await Promise.all([
          fetch(`/api/leagues/${leagueId}/creators`, { cache: "no-store" }),
          fetch(`/api/leagues/${leagueId}/media?creatorId=${creatorId}`, { cache: "no-store" }),
        ]);
        const creatorsData = await creatorsRes.json().catch(() => ({}));
        const mediaData = await mediaRes.json().catch(() => ({}));
        if (!creatorsRes.ok) throw new Error(creatorsData?.error ?? "Errore caricamento creator");
        if (!mediaRes.ok) throw new Error(mediaData?.error ?? "Errore caricamento media");
        const found = Array.isArray(creatorsData) ? creatorsData.find((item: Creator) => item.id === creatorId) : null;
        if (!found) throw new Error("Creator non trovato");
        setCreator(found);
        setMedia(Array.isArray(mediaData) ? mediaData : []);
      } catch (error) {
        setErr(getErrorMessage(error, "Errore caricamento creator"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [creatorId, leagueId]);

  return (
    <DashboardShell leagueId={leagueId}>
      <div className="space-y-5 pb-8">
        <Link href={`/leagues/${leagueId}/media`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={16} /> Torna al Media Center</Link>
        {err && <Badge variant="error">{err}</Badge>}
        {loading && <p className="text-sm text-[var(--muted)]">Caricamento…</p>}
        {creator && (
          <Card className="overflow-hidden !p-0">
            <div className="relative p-6 md:p-8" style={{ background: `radial-gradient(circle at 12% 0%, ${creator.primaryColor || "var(--accent-soft)"}, transparent 24rem), var(--card)` }}>
              <div className="grid gap-5 md:grid-cols-[150px_1fr] md:items-center">
                {creator.avatarUrl ? <img src={creator.avatarUrl} alt="" loading="lazy" decoding="async" className="h-32 w-32 rounded-[34px] object-cover md:h-36 md:w-36" /> : <div className="grid h-32 w-32 place-items-center rounded-[34px] bg-[var(--card-2)] text-[var(--accent)] md:h-36 md:w-36"><UserRound size={48} /></div>}
                <div>
                  <CardHeader tag={creator.roleLabel || "Creator"} title={creator.displayName} description={creator.bio || "Foto, video e contenuti dal campo."} level={1} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {creator.showInstagram && creator.instagramUrl && <a href={creator.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 text-xs font-black text-[var(--foreground)]"><Instagram size={15} /> Instagram</a>}
                    {creator.showEmail && creator.email && <a href={`mailto:${creator.email}`} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 text-xs font-black text-[var(--foreground)]"><Mail size={15} /> Email</a>}
                    {creator.websiteUrl && <a href={creator.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-4 text-xs font-black text-[var(--foreground)]"><ExternalLink size={15} /> Portfolio</a>}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">Contenuti pubblicati</h2>
          {media.length === 0 && !loading ? (
            <Card className="py-10 text-center"><Camera className="mx-auto text-[var(--muted)]" size={34} /><p className="mt-3 text-sm text-[var(--muted)]">Nessun contenuto pubblicato da questo creator.</p></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {media.map((item) => (
                <a key={item.id} href={item.fileUrl} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]">
                  <div className="relative aspect-[4/5] bg-black">
                    {isVideo(item) ? (
                      item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-80" /> : <div className="grid h-full place-items-center text-[var(--accent)]"><Video size={44} /></div>
                    ) : <img src={item.thumbnailUrl || item.fileUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />}
                    {isVideo(item) && <span className="absolute inset-0 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white"><Play size={24} fill="currentColor" /></span></span>}
                  </div>
                  <div className="p-4"><p className="line-clamp-2 text-base font-black text-[var(--foreground)]">{item.title || item.caption || "Contenuto"}</p></div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
