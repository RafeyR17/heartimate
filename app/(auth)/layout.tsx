import { ClerkProviders } from '@/components/ClerkProviders'
import { SiteFooter } from '@/components/legal/site-footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviders>
      <div className="min-h-[100dvh] flex flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
    </ClerkProviders>
  )
}
