export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function LeagueHome({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, _count: { select: { teams: true, matches: true } } },
  });

  if (!league) return notFound();

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{league.name}</h1>
      <div style={{ opacity: 0.75 }}>
        Squadre: <b>{league._count.teams}</b> • Partite: <b>{league._count.matches}</b>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 900 }}>Cosa puoi fare</div>
        <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.85 }}>
          <li>Vai su <b>Calendario</b> per vedere match e inserire risultati</li>
          <li>Vai su <b>Squadre</b> per modificare le rose</li>
          <li>Vai su <b>Stats</b> per top marcatori/assist</li>
          <li>Usa la barra <b>Cerca giocatore</b> in alto</li>
        </ul>
      </div>
    </div>
  );
}