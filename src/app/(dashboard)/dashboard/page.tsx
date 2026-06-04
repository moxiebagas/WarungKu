import { Package, AlertTriangle, Activity, Clock } from "lucide-react";
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
  TopProductsChart,
  LowStockChart,
  InOutChart,
} from "@/components/charts";
import { getDashboardData } from "@/lib/queries";
import { formatDateTime, formatQty, MOVEMENT_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan</h1>
        <p className="text-sm text-muted-foreground">
          Pantauan stok toko secara keseluruhan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Barang" value={d.totalProducts} icon={Package} />
        <StatCard
          title="Stok Menipis"
          value={d.lowStockCount}
          icon={AlertTriangle}
          accent={d.lowStockCount > 0 ? "warning" : "default"}
        />
        <StatCard title="Pergerakan Hari Ini" value={d.movementsToday} icon={Activity} />
        <StatCard
          title="Update Terakhir"
          value={d.lastUpdate ? formatDateTime(d.lastUpdate) : "-"}
          icon={Clock}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pergerakan Stok 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyMovementChart data={d.weekly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Masuk vs Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <InOutChart data={d.inOutTotals} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Barang Paling Sering Diupdate</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProductsChart data={d.topProducts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Barang Stok Menipis</CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockChart data={d.lowStockChart} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Stok Menipis</CardTitle>
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
            <CardTitle>Pergerakan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pergerakan stok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recentMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{m.products?.name ?? "-"}</TableCell>
                      <TableCell>{MOVEMENT_LABEL[m.movement_type]}</TableCell>
                      <TableCell className="text-right">
                        {formatQty(m.qty)} {m.products?.unit ?? ""}
                      </TableCell>
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
