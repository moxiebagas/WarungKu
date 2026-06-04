import { NumbersManager } from "@/components/whatsapp/numbers-manager";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AllowedWhatsappNumber } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WhatsappSettingsPage() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("allowed_whatsapp_numbers")
    .select("*")
    .order("created_at", { ascending: true });

  const numbers = (data ?? []) as AllowedWhatsappNumber[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nomor WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Hanya nomor terdaftar dan aktif yang boleh mengirim perintah update stok.
        </p>
      </div>
      <NumbersManager numbers={numbers} />
    </div>
  );
}
