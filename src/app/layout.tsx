import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

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
    <html lang="id" className={outfit.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
