import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cawl — Web Crawler",
  description: "Scalable AI-powered web crawling",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-surface-base text-content-primary flex">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
