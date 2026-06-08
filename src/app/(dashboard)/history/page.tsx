import { HistoryFilters } from "@/components/history/history-filters";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProducts } from "@/lib/queries";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { formatDateTime, formatQty, MOVEMENT_LABEL } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/types";
import type { MovementWithProduct } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface SearchParams {
  product?: string;
  type?: string;
  source?: string;
  payment?: string;
  from?: string;
  to?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("stock_movements")
    .select("*, products(name, unit)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (sp.product) query = query.eq("product_id", sp.product);
  if (sp.type) query = query.eq("movement_type", sp.type);
  if (sp.source) query = query.eq("source", sp.source);
  if (sp.payment) query = query.eq("payment_method", sp.payment);
  if (sp.from) query = query.gte("created_at", `${sp.from}T00:00:00+07:00`);
  if (sp.to) query = query.lte("created_at", `${sp.to}T23:59:59+07:00`);

  const [{ data }, products] = await Promise.all([query, getProducts()]);
  const movements = (data ?? []) as MovementWithProduct[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Stok</h1>
        <p className="text-sm text-muted-foreground">
          Semua pergerakan stok yang tercatat ({movements.length} data terbaru).
        </p>
      </div>

      <HistoryFilters products={products} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Sebelum</TableHead>
              <TableHead className="text-right">Sesudah</TableHead>
              <TableHead>Bayar</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Tidak ada data sesuai filter.
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(m.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{m.products?.name ?? "-"}</TableCell>
                  <TableCell>{MOVEMENT_LABEL[m.movement_type]}</TableCell>
                  <TableCell className="text-right">
                    {formatQty(m.qty)} {m.products?.unit ?? ""}
                  </TableCell>
                  <TableCell className="text-right">{formatQty(m.stock_before)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatQty(m.stock_after)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {m.payment_method ? PAYMENT_LABEL[m.payment_method] : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.source === "WHATSAPP" ? "default" : "secondary"}>
                      {m.source === "WHATSAPP" ? "WhatsApp" : m.source === "ADMIN" ? "Admin" : m.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {m.note ?? m.raw_message ?? "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
