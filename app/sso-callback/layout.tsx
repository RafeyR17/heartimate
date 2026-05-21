import { ClerkProviders } from '@/components/ClerkProviders'

export default function SsoCallbackLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviders>{children}</ClerkProviders>
}
