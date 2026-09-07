import { NextResponse } from "next/server";
import { getServerSession, requireAdmin } from "@/lib/server-auth";
import { apiErrorResponse, readJsonBody } from "@/modules/core/api";
import { createLeague, listLeaguesForSession } from "@/modules/leagues/application/league-service";

export async function GET() {
  const session = await getServerSession();

  try {
    return NextResponse.json(await listLeaguesForSession(session));
  } catch (error) {
    return apiErrorResponse(error, "Errore caricamento tornei");
  }
}

export async function POST(req: Request) {
  const err = await requireAdmin();
  if (err) return err;

  try {
    const body = await readJsonBody(req);
    return NextResponse.json(await createLeague(body));
  } catch (error) {
    return apiErrorResponse(error, "Errore creazione torneo");
  }
}
