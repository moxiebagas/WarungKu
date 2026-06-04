import { StockForm } from "@/components/stock/stock-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = (await getProducts()).filter((p) => p.is_active);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Koreksi Stok</h1>
        <p className="text-sm text-muted-foreground">
          Khusus untuk koreksi manual oleh admin. Update harian sebaiknya tetap lewat WhatsApp.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Update Stok Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <StockForm products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
