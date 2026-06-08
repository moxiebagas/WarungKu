import { NextResponse } from "next/server";
import { buildDailySummaryMessage } from "@/lib/summary";
import { notifyGroup, getGroupId } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily sales summary, sent to the configured WhatsApp group.
 * Triggered by Vercel Cron (see vercel.json) at 22:00 WIB.
 *
 * Auth: when CRON_SECRET is set, Vercel attaches `Authorization: Bearer <secret>`
 * automatically. We reject requests without it so the endpoint can't be abused.
 * A manual run is possible via `?secret=<CRON_SECRET>` for testing.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured -> allow (e.g. local dev)

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    console.warn("[cron daily-summary] unauthorized");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!getGroupId()) {
    console.warn("[cron daily-summary] WHATSAPP_GROUP_ID belum di-set");
    return NextResponse.json({ ok: false, error: "WHATSAPP_GROUP_ID not configured" });
  }

  try {
    const message = await buildDailySummaryMessage();
    console.log("[cron daily-summary] sending summary");
    await notifyGroup(message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron daily-summary] error", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

// Vercel Cron issues GET, but allow POST too for flexibility.
export async function POST(req: Request) {
  return run(req);
}
