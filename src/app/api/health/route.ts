import { NextResponse } from "next/server";
import { getActiveProvider, type Provider } from "@/lib/ai/provider";

/**
 * GET /api/health
 *
 * Public health-check endpoint. Returns service status and AI provider configuration.
 * No authentication required — used by monitoring, load balancers, and deployment checks.
 */
export async function GET(): Promise<NextResponse> {
  const provider: Provider = getActiveProvider();

  const aiConfigured = !!(
    process.env.DEEPSEEK_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );

  const body = {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    ai: {
      provider,
      configured: aiConfigured,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
