import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getHistory, parseHistoryParams } from "@/lib/historyQuery";

// Session-guarded read endpoint — the SWR fetcher for the history table.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const params = parseHistoryParams(new URL(request.url).searchParams);
  const page = await getHistory(params);
  return NextResponse.json(page);
}
