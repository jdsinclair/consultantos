import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getClientsForCRM, updateClientStatus, updateClientDealValue } from "@/lib/db/clients";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

// GET /api/crm - Get all clients for CRM board
export async function GET() {
  try {
    const user = await requireUser();
    const clients = await getClientsForCRM(user.id);
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// PATCH /api/crm - Update client status or deal value
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { clientId, status, dealValue } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    let result;

    if (status !== undefined) {
      result = await updateClientStatus(clientId, user.id, status);
    }

    if (dealValue !== undefined) {
      result = await updateClientDealValue(clientId, user.id, dealValue);
    }

    if (!result) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("CRM update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
