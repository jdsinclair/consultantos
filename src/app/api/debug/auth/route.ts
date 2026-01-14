import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Debug endpoint - remove after fixing auth issue
export async function GET() {
  try {
    const authObj = await auth();
    const user = await currentUser();
    
    return NextResponse.json({
      auth: {
        userId: authObj.userId,
        sessionId: authObj.sessionId,
        orgId: authObj.orgId,
      },
      user: user ? {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
