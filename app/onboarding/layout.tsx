import { ClerkProviders } from '@/components/ClerkProviders'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviders>{children}</ClerkProviders>
}
