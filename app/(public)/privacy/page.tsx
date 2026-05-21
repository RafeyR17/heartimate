import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Heartimate collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How we handle your information when you use Heartimate."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={[...PRIVACY_SECTIONS]}
    />
  )
}
