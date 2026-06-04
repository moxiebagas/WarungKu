import { Badge } from "@/components/ui/badge";
import { getStockStatus } from "@/lib/format";

export function StatusBadge({
  stock,
  minStock,
}: {
  stock: number;
  minStock: number;
}) {
  const status = getStockStatus(stock, minStock);
  if (status === "Habis") return <Badge variant="danger">Habis</Badge>;
  if (status === "Menipis") return <Badge variant="warning">Menipis</Badge>;
  return <Badge variant="success">Aman</Badge>;
}
