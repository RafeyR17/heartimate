import { AppShellFromAuth } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellFromAuth>{children}</AppShellFromAuth>;
}
