import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/wa/handler";
import { sendWhatsappMessage, sendWhatsappToGroup } from "@/lib/fonnte";

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

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Payload;
  } catch {
    /* not JSON, fall through */
  }

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

/** Loose group-id comparison (tolerates the `@g.us` suffix / formatting). */
function normalizeGroupId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/@g\.us$/i, "")
    .replace(/[^0-9a-z-]/g, "");
}

interface Extracted {
  isGroup: boolean;
  groupId: string | null;
  sender: string | null; // the participant who sent the message
  message: string | undefined;
}

/**
 * Map a Fonnte payload to { isGroup, groupId, sender, message }.
 *
 * Per Fonnte's webhook docs, GROUP messages carry:
 *   - sender  = the group id (e.g. 120363429064888611@g.us)
 *   - member  = the group participant who actually sent the message
 *   - message = the text
 * PERSONAL messages carry the person in `sender` and no `member`.
 *
 * The presence of a non-empty `member` is therefore the most reliable
 * group signal (the inbound `sender` may or may not include the `@g.us`
 * suffix). `text` is NOT the message — Fonnte uses it for markers like
 * "non-button message"; the real text is in `message` / `pesan`.
 */
function extract(payload: Payload): Extracted {
  const member = pick(payload, ["member", "participant", "author"]);
  const senderField = pick(payload, ["sender", "from", "phone"]);
  const message = pick(payload, ["message", "pesan", "body"]);

  const isGroup =
    payload.isgroup === true ||
    payload.isgroup === "true" ||
    Boolean(member) ||
    (typeof senderField === "string" && senderField.includes("@g.us")) ||
    Boolean(pick(payload, ["group"]));

  if (isGroup) {
    // group id from `sender` (fall back to an explicit `group` field)
    const groupId = pick(payload, ["group"]) ?? senderField ?? null;
    // participant from `member` (never from `sender`, which is the group)
    const sender = member ?? pick(payload, ["pengirim"]) ?? null;
    return { isGroup: true, groupId, sender, message };
  }

  // personal chat
  const sender = senderField ?? pick(payload, ["pengirim", "username"]) ?? null;
  return { isGroup: false, groupId: null, sender, message };
}

export async function POST(req: Request) {
  try {
    const payload = await readPayload(req);
    console.log("[wa webhook] raw payload", JSON.stringify(payload));

    const { isGroup, groupId, sender, message } = extract(payload);
    const phone = sender ? normalizePhone(sender) : null;
    console.log(
      "[wa webhook] extracted",
      JSON.stringify({ isGroup, groupId, senderPhone: phone, messageText: message })
    );

    const configuredGroup = process.env.WHATSAPP_GROUP_ID || null;

    // ---- Group gating: only the configured group is processed ----
    if (configuredGroup) {
      const reason = !isGroup
        ? "personal_chat"
        : !groupId || normalizeGroupId(groupId) !== normalizeGroupId(configuredGroup)
          ? "other_group"
          : null;
      if (reason) {
        console.log(
          "[wa webhook] validation",
          JSON.stringify({ result: "ignored", reason, groupId })
        );
        return NextResponse.json({ ok: true, ignored: true, reason });
      }
    }

    if (!phone || typeof message !== "string") {
      console.log(
        "[wa webhook] validation",
        JSON.stringify({ result: "ignored", reason: "missing_sender_or_message" })
      );
      return NextResponse.json({ ok: true, ignored: true, reason: "missing_sender_or_message" });
    }

    console.log(
      "[wa webhook] validation",
      JSON.stringify({ result: "accepted", groupId, senderPhone: phone })
    );

    // Authorization (registered + active sender) happens inside the handler.
    const reply = await handleIncomingMessage(phone, message);

    let sendOk: boolean | null = null;
    let responseTarget: string | null = null;
    if (reply) {
      // Replies always go to the configured group; only legacy personal mode
      // (no group configured) replies to the sender directly.
      if (configuredGroup) {
        responseTarget = configuredGroup;
        sendOk = (await sendWhatsappToGroup(configuredGroup, reply)).ok;
      } else {
        responseTarget = phone;
        sendOk = (await sendWhatsappMessage(phone, reply)).ok;
      }
    }

    console.log(
      "[wa webhook] result",
      JSON.stringify({ replied: reply !== null, responseTarget, sendOk })
    );

    return NextResponse.json({ ok: true, replied: reply !== null, sendOk, responseTarget });
  } catch (err) {
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
      hasGroupId: Boolean(process.env.WHATSAPP_GROUP_ID),
      groupOnlyMode: Boolean(process.env.WHATSAPP_GROUP_ID),
    },
  });
}
