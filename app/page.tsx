import type { Metadata } from "next";
import { LandingPageContent } from "@/components/landing/landing-page-content";

export const metadata: Metadata = {
  title: "Heartimate — AI companions who remember you",
  description:
    "Meet AI companions with deep memory and no boundaries. Browse characters, start free, and explore private roleplay.",
  openGraph: {
    title: "Heartimate",
    description: "AI companions who remember everything about you.",
    type: "website",
  },
};

export default function LandingPage() {
  return <LandingPageContent />;
}
