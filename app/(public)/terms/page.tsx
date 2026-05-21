import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from '@/lib/legal-content'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for Heartimate — adults-only AI character roleplay.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Rules for using Heartimate. Please read them before you create an account or chat with characters."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={[...TERMS_SECTIONS]}
    />
  )
}
