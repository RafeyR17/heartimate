export const inputClass =
  'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[14px_16px] text-white font-body text-[14px] focus:border-[rgba(232,80,122,0.4)] focus:outline-none transition-all duration-200 placeholder:text-[rgba(255,255,255,0.25)] w-full'

export const labelClass =
  'font-label text-[11px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] mb-[8px] block font-medium'

export const sectionHeadingClass =
  'font-heading italic text-[22px] text-[rgba(255,255,255,0.9)] border-b border-[rgba(255,255,255,0.06)] pb-[12px] mb-[24px]'

export const characterFormScrollbarCss = `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
        
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `
