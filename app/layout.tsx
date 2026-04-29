import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

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
