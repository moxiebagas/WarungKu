import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/wa/handler";
import { sendWhatsappMessage } from "@/lib/fonnte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = Record<string, unknown>;

function pick(obj: Payload, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

/**
 * Parse the body once, regardless of how Fonnte labels the content type.
 * Fonnte may send application/json OR application/x-www-form-urlencoded, and
 * sometimes with a generic/empty Content-Type. We read the raw text and try
 * JSON first, then urlencoded.
 */
async function readPayload(req: Request): Promise<Payload> {
  const raw = await req.text().catch(() => "");
  if (!raw) return {};

  // Try JSON.
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Payload;
  } catch {
    /* not JSON, fall through */
  }

  // Try x-www-form-urlencoded.
  try {
    const params = new URLSearchParams(raw);
    const obj: Payload = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    if (Object.keys(obj).length > 0) return obj;
  } catch {
    /* ignore */
  }

  return {};
}

/** Normalize a phone to digits only (international format, no `+`). */
function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function POST(req: Request) {
  // Sender/message fields, in priority order. Note: `text` is intentionally
  // NOT used for the message — Fonnte puts a marker like "non-button message"
  // there. The real text is in `message` / `pesan`.
  const SENDER_KEYS = ["sender", "from", "phone", "pengirim", "username"];
  const MESSAGE_KEYS = ["message", "pesan", "body"];

  try {
    const payload = await readPayload(req);
    console.log("[fonnte webhook] raw payload", JSON.stringify(payload));

    const rawSender = pick(payload, SENDER_KEYS);
    const rawMessage = pick(payload, MESSAGE_KEYS);

    console.log(
      "[fonnte webhook] extracted",
      JSON.stringify({ rawSender, rawMessage })
    );

    if (!rawSender || typeof rawMessage !== "string") {
      console.warn("[fonnte webhook] missing sender/message");
      return NextResponse.json(
        { ok: false, error: "missing sender or message", keys: Object.keys(payload) },
        { status: 200 }
      );
    }

    const phone = normalizePhone(rawSender);
    if (!phone) {
      return NextResponse.json({ ok: false, error: "invalid sender" }, { status: 200 });
    }

    const reply = await handleIncomingMessage(phone, rawMessage);
    console.log("[fonnte webhook] reply", JSON.stringify({ phone, reply }));

    let sendOk: boolean | null = null;
    if (reply) {
      const result = await sendWhatsappMessage(phone, reply);
      sendOk = result.ok;
    }

    return NextResponse.json({ ok: true, replied: reply !== null, sendOk, reply });
  } catch (err) {
    // Log the real error so it shows up in Vercel logs. Still return 200 so
    // Fonnte does not retry-storm on a server-side bug.
    console.error("[fonnte webhook] error", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "internal error" },
      { status: 200 }
    );
  }
}

// Convenience GET for a quick "is it alive?" check + config sanity.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "fonnte-webhook",
    config: {
      hasFonnteToken: Boolean(process.env.FONNTE_TOKEN),
      hasSupabaseUrl: Boolean(
        process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
      ),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
