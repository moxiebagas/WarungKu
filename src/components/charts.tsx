"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "@/lib/format";

const GREEN = "#16a34a";
const RED = "#dc2626";
const BLUE = "#2563eb";

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

const rupiahTick = (v: number) =>
  v >= 1_000_000 ? `${v / 1_000_000}jt` : v >= 1000 ? `${v / 1000}rb` : `${v}`;

/** IN vs OUT stock movement, last 7 days. */
export function WeeklyMovementChart({
  data,
}: {
  data: { day: string; IN: number; OUT: number }[];
}) {
  const hasData = data.some((d) => d.IN > 0 || d.OUT > 0);
  if (!hasData) return <Empty label="Belum ada pergerakan stok 7 hari terakhir." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="IN" name="Masuk" fill={GREEN} radius={[4, 4, 0, 0]} />
        <Bar dataKey="OUT" name="Keluar" fill={RED} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Generic revenue bar chart (daily / monthly). */
export function RevenueChart({
  data,
  color = GREEN,
}: {
  data: { label: string; revenue: number }[];
  color?: string;
}) {
  const hasData = data.some((d) => d.revenue > 0);
  if (!hasData) return <Empty label="Belum ada pendapatan pada periode ini." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={rupiahTick} width={44} />
        <Tooltip formatter={(v: number) => [formatRupiah(v), "Pendapatan"]} />
        <Bar dataKey="revenue" name="Pendapatan" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar chart for top products (revenue or quantity). */
export function TopProductsChart({
  data,
  mode,
}: {
  data: { name: string; value: number; unit?: string }[];
  mode: "revenue" | "qty";
}) {
  if (data.length === 0) return <Empty label="Belum ada data penjualan." />;
  const isRevenue = mode === "revenue";
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 34)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={isRevenue ? rupiahTick : undefined}
          allowDecimals={false}
        />
        <YAxis type="category" dataKey="name" width={110} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v: number) =>
            isRevenue ? [formatRupiah(v), "Pendapatan"] : [v, "Qty terjual"]
          }
        />
        <Bar
          dataKey="value"
          name={isRevenue ? "Pendapatan" : "Qty"}
          fill={isRevenue ? GREEN : BLUE}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
