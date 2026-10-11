import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { WalletProvider } from "@/components/providers/wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuctionVault — Bid Beyond Limits",
  description: "Next-generation global premium auction platform. Discover, bid, and win luxury items from around the world.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#fafafa]">
        <WalletProvider>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <MobileNav />
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
