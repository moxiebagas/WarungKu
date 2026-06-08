import { Wallet, ShoppingCart } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButton } from "@/components/reports/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProducts } from "@/lib/queries";
import {
  getRevenueByDate,
  getRevenueByProduct,
  getRevenueByPaymentMethod,
  periodToRange,
  type DateRange,
  type Period,
} from "@/lib/revenue";
import { PaymentMethodChart } from "@/components/charts";
import { formatQty, formatRupiah, formatDate } from "@/lib/format";
import { shortDateLabel } from "@/lib/datetime";
import { PAYMENT_METHODS } from "@/lib/types";
import type { PaymentMethod } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["today", "week", "month", "3month", "6month", "year"];

interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
  product?: string;
  payment?: string;
}

function resolveRange(sp: SearchParams): { range: DateRange; label: string } {
  if (sp.from || sp.to) {
    const start = sp.from ? new Date(`${sp.from}T00:00:00+07:00`) : new Date(0);
    const end = sp.to ? new Date(`${sp.to}T23:59:59+07:00`) : new Date();
    return {
      range: { start, end },
      label: `${sp.from ? formatDate(start.toISOString()) : "Awal"} – ${
        sp.to ? formatDate(end.toISOString()) : "Sekarang"
      }`,
    };
  }
  const period = (VALID_PERIODS as string[]).includes(sp.period ?? "")
    ? (sp.period as Period)
    : "month";
  const range = periodToRange(period);
  return { range, label: `${formatDate(range.start.toISOString())} – Sekarang` };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { range, label } = resolveRange(sp);
  const productId = sp.product;
  const paymentMethod = (PAYMENT_METHODS as string[]).includes(sp.payment ?? "")
    ? (sp.payment as PaymentMethod)
    : undefined;

  const [products, byProduct, byDate, byPayment] = await Promise.all([
    getProducts(),
    getRevenueByProduct(range, productId, paymentMethod),
    getRevenueByDate(range, productId, paymentMethod),
    getRevenueByPaymentMethod(range, productId),
  ]);

  const totalRevenue = byProduct.reduce((s, r) => s + r.revenue, 0);
  const totalQty = byProduct.reduce((s, r) => s + r.qty, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan Pendapatan</h1>
        <p className="text-sm text-muted-foreground">
          Berdasarkan penjualan (pergerakan keluar). Periode: {label}
        </p>
      </div>

      <ReportFilters products={products} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Total Pendapatan" value={formatRupiah(totalRevenue)} icon={Wallet} />
        <StatCard title="Total Qty Terjual" value={formatQty(totalQty)} icon={ShoppingCart} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan per Metode Bayar</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodChart
              data={byPayment.map((p) => ({ label: p.label, revenue: p.revenue }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rincian Metode Bayar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPayment.map((r) => (
                  <TableRow key={r.method}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">{formatQty(r.qty)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Pendapatan per Barang</CardTitle>
          <ExportButton
            filename="pendapatan-per-barang.csv"
            headers={["Barang", "Qty Terjual", "Satuan", "Pendapatan"]}
            rows={byProduct.map((r) => [r.name, r.qty, r.unit, r.revenue])}
          />
        </CardHeader>
        <CardContent>
          {byProduct.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada penjualan pada periode ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barang</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byProduct.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">
                      {formatQty(r.qty)} {r.unit}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Pendapatan per Tanggal</CardTitle>
          <ExportButton
            filename="pendapatan-per-tanggal.csv"
            headers={["Tanggal", "Qty Terjual", "Pendapatan"]}
            rows={byDate.map((r) => [r.date, r.qty, r.revenue])}
          />
        </CardHeader>
        <CardContent>
          {byDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada penjualan pada periode ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Qty Terjual</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDate.map((r) => (
                  <TableRow key={r.date}>
                    <TableCell>{shortDateLabel(r.date)}</TableCell>
                    <TableCell className="text-right">{formatQty(r.qty)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
