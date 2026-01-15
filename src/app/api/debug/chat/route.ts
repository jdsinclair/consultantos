import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateText } from "ai";
import { models } from "@/lib/ai";

// Prevent static caching - auth routes must be dynamic
export const dynamic = "force-dynamic";

interface DiagnosticResult {
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: unknown;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const diagnostics: DiagnosticResult[] = [];

    // Check 1: Environment variables
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    diagnostics.push({
      check: "ANTHROPIC_API_KEY",
      status: hasAnthropicKey ? "pass" : "fail",
      message: hasAnthropicKey
        ? `Set (starts with: ${process.env.ANTHROPIC_API_KEY?.slice(0, 10)}...)`
        : "Missing - required for chat",
    });

    diagnostics.push({
      check: "OPENAI_API_KEY",
      status: hasOpenAIKey ? "pass" : "warning",
      message: hasOpenAIKey
        ? `Set (starts with: ${process.env.OPENAI_API_KEY?.slice(0, 10)}...)`
        : "Missing - optional, used for GPT models",
    });

    // Check 2: Model configuration
    diagnostics.push({
      check: "Default Model",
      status: "pass",
      message: "claude-3-5-sonnet-20241022 (Anthropic)",
    });

    // Check 3: Test API call (if key exists)
    if (hasAnthropicKey) {
      try {
        const startTime = Date.now();
        const result = await generateText({
          model: models.fast, // Use fast model for quick test
          prompt: "Say 'OK' and nothing else.",
          maxTokens: 10,
        });
        const duration = Date.now() - startTime;

        diagnostics.push({
          check: "API Connection Test",
          status: "pass",
          message: `Success in ${duration}ms`,
          details: {
            response: result.text,
            usage: result.usage,
          },
        });
      } catch (apiError) {
        diagnostics.push({
          check: "API Connection Test",
          status: "fail",
          message: apiError instanceof Error ? apiError.message : "Unknown API error",
          details: {
            error: apiError instanceof Error ? {
              name: apiError.name,
              message: apiError.message,
              stack: apiError.stack?.split("\n").slice(0, 5),
            } : apiError,
          },
        });
      }
    } else {
      diagnostics.push({
        check: "API Connection Test",
        status: "fail",
        message: "Skipped - no API key",
      });
    }

    // Check 4: Database connection (for context fetching)
    try {
      const { db } = await import("@/db");
      const { clients } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const testQuery = await db.query.clients.findFirst({
        where: eq(clients.userId, user.id),
        columns: { id: true },
      });

      diagnostics.push({
        check: "Database Connection",
        status: "pass",
        message: "Connected successfully",
        details: { hasClients: !!testQuery },
      });
    } catch (dbError) {
      diagnostics.push({
        check: "Database Connection",
        status: "fail",
        message: dbError instanceof Error ? dbError.message : "Database error",
      });
    }

    // Summary
    const failCount = diagnostics.filter(d => d.status === "fail").length;
    const warningCount = diagnostics.filter(d => d.status === "warning").length;

    return NextResponse.json({
      summary: {
        status: failCount > 0 ? "unhealthy" : warningCount > 0 ? "degraded" : "healthy",
        failures: failCount,
        warnings: warningCount,
        timestamp: new Date().toISOString(),
      },
      diagnostics,
      troubleshooting: failCount > 0 ? [
        "Ensure ANTHROPIC_API_KEY is set in your .env.local file",
        "Check that the API key is valid and has credits",
        "Verify DATABASE_URL is correct and database is accessible",
        "Check server logs for detailed error messages",
      ] : [],
    });
  } catch (error) {
    console.error("Chat diagnostics error:", error);
    return NextResponse.json({
      error: "Failed to run diagnostics",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// POST: Test a simple chat completion
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { message = "Hello, respond with a single word." } = await req.json();

    const startTime = Date.now();

    try {
      const result = await generateText({
        model: models.default,
        prompt: message,
        maxTokens: 100,
      });

      return NextResponse.json({
        success: true,
        response: result.text,
        duration: Date.now() - startTime,
        usage: result.usage,
      });
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : "API call failed",
        errorType: apiError instanceof Error ? apiError.name : "Unknown",
        duration: Date.now() - startTime,
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: "Request failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
