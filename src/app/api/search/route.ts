import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { searchClients } from "@/lib/db/clients";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const results = await searchClients(user.id, query);

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
