import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WarungKu",
  description: "Manajemen stok toko WarungKu via WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-muted/30 antialiased">{children}</body>
    </html>
  );
}
