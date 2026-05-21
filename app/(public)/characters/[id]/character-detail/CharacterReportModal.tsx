'use client'

import { AccessibleDialog } from '@/components/AccessibleDialog'

const REPORT_REASONS = [
  'Inappropriate content',
  'Spam / Low quality',
  'Harassment',
  'Other',
] as const

const ROSE = '#e8507a'

export default function CharacterReportModal({
  open,
  characterName,
  reportReason,
  reportDetails,
  reportSubmitting,
  onClose,
  onReasonChange,
  onDetailsChange,
  onSubmit,
}: {
  open: boolean
  characterName: string
  reportReason: string
  reportDetails: string
  reportSubmitting: boolean
  onClose: () => void
  onReasonChange: (reason: string) => void
  onDetailsChange: (details: string) => void
  onSubmit: () => void
}) {
  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      title="Report Character"
      visibleTitle
      showCloseButton
      disabled={reportSubmitting}
      panelClassName="max-w-md max-h-[92dvh] overflow-y-auto mx-4 p-6"
    >
      <p className="text-sm text-white/55 mb-4">
        Why are you reporting <span className="text-white font-medium">{characterName}</span>?
      </p>

      <fieldset className="flex flex-col gap-2 mb-4 border-0 p-0 m-0">
        <legend className="sr-only">Report reason</legend>
        {REPORT_REASONS.map((reason) => (
          <label
            key={reason}
            className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl border cursor-pointer transition-colors ${
              reportReason === reason
                ? 'border-rose/50 bg-rose/10 text-white'
                : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="report-reason"
              value={reason}
              checked={reportReason === reason}
              onChange={() => onReasonChange(reason)}
              className="accent-[#e8507a]"
            />
            <span className="text-sm">{reason}</span>
          </label>
        ))}
      </fieldset>

      {reportReason === 'Other' && (
        <>
          <label htmlFor="report-details" className="sr-only">
            Additional details
          </label>
          <textarea
            id="report-details"
            value={reportDetails}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder="Tell us more..."
            className="w-full mb-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-rose/40 min-h-[88px] resize-y"
          />
        </>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={reportSubmitting}
        className="w-full min-h-[44px] py-3 rounded-xl font-semibold text-white cursor-pointer disabled:opacity-60"
        style={{ background: ROSE }}
      >
        {reportSubmitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </AccessibleDialog>
  )
}

export { REPORT_REASONS }
