import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Debug endpoint - remove after fixing auth issue
export async function GET(request: NextRequest) {
  try {
    const authObj = await auth();
    const user = await currentUser();
    
    // Get cookies for debugging
    const cookies = request.cookies.getAll();
    const clerkCookies = cookies.filter(c => 
      c.name.includes('clerk') || c.name.includes('session') || c.name.includes('__client')
    );
    
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
      cookies: clerkCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
      env: {
        hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
