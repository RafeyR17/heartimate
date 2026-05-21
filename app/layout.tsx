import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { QueryProvider } from '@/components/QueryProvider'
import { ToastProvider } from '@/components/ToastProvider'
import { PostHogDeferred } from '@/components/PostHogDeferred'
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Heartimate",
    template: "%s · Heartimate",
  },
  description: "NSFW AI roleplay web app",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="font-body min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] text-[16px] leading-[1.75]">
        <QueryProvider>
          <ToastProvider>
            <PostHogDeferred />
            {children}
          </ToastProvider>
        </QueryProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
