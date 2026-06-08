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
 * Fonnte group payloads put the GROUP id in `sender` and the actual
 * participant in `member`/`pengirim`. Personal payloads put the person in
 * `sender`/`pengirim`. `text` is NOT the message (Fonnte uses it for markers
 * like "non-button message"); the real text is in `message`/`pesan`.
 */
function extract(payload: Payload): Extracted {
  const isGroup =
    payload.isgroup === true ||
    payload.isgroup === "true" ||
    (typeof payload.sender === "string" && payload.sender.includes("@g.us")) ||
    Boolean(pick(payload, ["group"]));

  const senderField = pick(payload, ["sender"]);
  const groupId = pick(payload, ["group"]) ?? (isGroup ? senderField ?? null : null);

  // The participant: prefer fields that are always the human sender.
  let sender = pick(payload, ["pengirim", "member", "participant", "author"]);
  if (!sender && !isGroup) sender = pick(payload, ["sender", "from", "phone", "username"]);

  const message = pick(payload, ["message", "pesan", "body"]);

  return { isGroup, groupId: groupId ?? null, sender: sender ?? null, message };
}

export async function POST(req: Request) {
  try {
    const payload = await readPayload(req);
    console.log("[fonnte webhook] raw payload", JSON.stringify(payload));

    const { isGroup, groupId, sender, message } = extract(payload);
    console.log(
      "[fonnte webhook] extracted",
      JSON.stringify({ isGroup, groupId, sender, message })
    );

    const configuredGroup = process.env.WHATSAPP_GROUP_ID || null;

    // ---- Group gating: only the configured group is processed ----
    if (configuredGroup) {
      if (!isGroup || !groupId || normalizeGroupId(groupId) !== normalizeGroupId(configuredGroup)) {
        console.log(
          JSON.stringify({
            event: "ignored_wrong_source",
            isGroup,
            groupId,
            reason: !isGroup ? "personal_chat" : "other_group",
            action: "ignored",
          })
        );
        return NextResponse.json({ ok: true, ignored: true });
      }
    }

    if (!sender || typeof message !== "string") {
      console.warn("[fonnte webhook] missing sender/message", JSON.stringify({ sender, message }));
      return NextResponse.json(
        { ok: false, error: "missing sender or message", keys: Object.keys(payload) },
        { status: 200 }
      );
    }

    const phone = normalizePhone(sender);
    if (!phone) {
      return NextResponse.json({ ok: false, error: "invalid sender" }, { status: 200 });
    }

    // Authorization (registered + active sender) happens inside the handler.
    const reply = await handleIncomingMessage(phone, message);
    console.log("[fonnte webhook] reply", JSON.stringify({ phone, fromGroup: isGroup, reply }));

    let sendOk: boolean | null = null;
    if (reply) {
      // Replies go back to the group when the command came from the group;
      // otherwise (legacy personal mode, no group configured) reply to sender.
      const result =
        configuredGroup && isGroup
          ? await sendWhatsappToGroup(configuredGroup, reply)
          : await sendWhatsappMessage(phone, reply);
      sendOk = result.ok;
    }

    return NextResponse.json({ ok: true, replied: reply !== null, sendOk });
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
