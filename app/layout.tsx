import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
// Validate env vars on first server render — throws if required vars missing
import "@/lib/env";

export const metadata: Metadata = {
  title: "GitHub Analyzer — AI Developer Intelligence",
  description: "AI-powered GitHub profile analysis: repo scoring, heatmaps, resume bullets, developer persona, and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
