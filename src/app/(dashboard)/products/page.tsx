import { ProductsManager } from "@/components/products/products-manager";
import { getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Barang</h1>
        <p className="text-sm text-muted-foreground">
          Kelola daftar barang, satuan, dan stok minimum.
        </p>
      </div>
      <ProductsManager products={products} />
    </div>
  );
}
