import {
  Wallet,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Boxes,
  AlertTriangle,
  TrendingUp,
  Tag,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WeeklyMovementChart,
  RevenueChart,
  TopProductsChart,
  PaymentMethodChart,
} from "@/components/charts";
import { getDashboardData } from "@/lib/queries";
import { formatDateTime, formatQty, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan</h1>
        <p className="text-sm text-muted-foreground">
          Pantauan pendapatan dan stok toko.
        </p>
      </div>

      {/* Revenue + stock summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Pendapatan Hari Ini" value={formatRupiah(d.revenue.today)} icon={Wallet} />
        <StatCard title="Pendapatan Minggu Ini" value={formatRupiah(d.revenue.week)} icon={CalendarDays} />
        <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(d.revenue.month)} icon={CalendarRange} />
        <StatCard title="Pendapatan 3 Bulan" value={formatRupiah(d.revenue["3month"])} icon={CalendarClock} />
        <StatCard title="Pendapatan 6 Bulan" value={formatRupiah(d.revenue["6month"])} icon={CalendarClock} />
        <StatCard title="Pendapatan Tahun Ini" value={formatRupiah(d.revenue.year)} icon={TrendingUp} />
        <StatCard title="Nilai Stok Saat Ini" value={formatRupiah(d.totalStockValue)} icon={Boxes} />
        <StatCard
          title="Stok Menipis"
          value={d.lowStockCount}
          icon={AlertTriangle}
          accent={d.lowStockCount > 0 ? "warning" : "default"}
          hint={`${d.totalProducts} barang aktif`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan Harian (30 Hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={d.dailyRevenue} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan Bulanan (12 Bulan)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={d.monthlyRevenue} color="#2563eb" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Barang — Pendapatan (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductsChart
              mode="revenue"
              data={d.topByRevenue.map((p) => ({ name: p.name, value: p.revenue }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Barang — Qty Terjual (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductsChart
              mode="qty"
              data={d.topByQuantity.map((p) => ({ name: p.name, value: p.qty }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Penjualan per Metode Bayar (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodChart
              data={d.paymentBreakdown.map((p) => ({ label: p.label, revenue: p.revenue }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pergerakan Masuk vs Keluar (7 Hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyMovementChart data={d.weekly} />
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Penjualan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada penjualan.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recentSales.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{m.products?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {formatQty(m.qty)} {m.products?.unit ?? ""}
                      </TableCell>
                      <TableCell className="text-right">{formatRupiah(m.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(m.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok Menipis</CardTitle>
          </CardHeader>
          <CardContent>
            {d.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua stok aman. 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        {formatQty(p.current_stock)} {p.unit}
                      </TableCell>
                      <TableCell>
                        <StatusBadge stock={p.current_stock} minStock={p.min_stock} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" /> Barang Tanpa Harga
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.missingPriceProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Semua barang sudah punya harga. 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.missingPriceProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell className="text-right">{formatQty(p.current_stock)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
