'use client'

import React from 'react'
import { inputClass, labelClass, sectionHeadingClass } from './form-styles'
import type { CharacterFormState, CharacterFormUpdate } from './types'

type SoulSectionProps = {
  form: CharacterFormState
  update: CharacterFormUpdate
  addExample: () => void
  removeExample: (index: number) => void
  updateExample: (index: number, field: 'user' | 'char', value: string) => void
}

export function SoulSection({
  form,
  update,
  addExample,
  removeExample,
  updateExample,
}: SoulSectionProps) {
  return (
    <div>
      <h2 className={sectionHeadingClass}>Give them a soul</h2>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-[8px]">
          <div>
            <label className={`${labelClass} mb-1`}>PERSONALITY & RULES</label>
            <div className="text-[11px] text-[rgba(255,255,255,0.4)]">
              Who are they? How do they speak? What are their rules? Be specific.
            </div>
          </div>
          <span className="text-[11px] text-[rgba(255,255,255,0.4)] flex-shrink-0 ml-2 font-body font-medium">
            {form.personality.length}/3000
          </span>
        </div>
        <textarea
          maxLength={3000}
          value={form.personality}
          onChange={(e) => update('personality', e.target.value)}
          placeholder="[Name] is a [description]. They speak in [tone/style]. They [key traits]. They never [rules]. Their deepest desire is [desire]..."
          className={`${inputClass} min-h-[200px] resize-y`}
        />
      </div>

      <div className="mb-6">
        <div className="mb-[8px]">
          <label className={`${labelClass} mb-1`}>SCENARIO</label>
          <div className="text-[11px] text-[rgba(255,255,255,0.4)]">
            Where does the story begin?
          </div>
        </div>
        <textarea
          maxLength={1000}
          value={form.scenario}
          onChange={(e) => update('scenario', e.target.value)}
          placeholder="You've just [how user meets them]. The setting is [place/time]. The tension between you is [dynamic]..."
          className={`${inputClass} min-h-[120px] resize-y`}
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-[8px]">
          <div>
            <label className={`${labelClass} mb-1 !text-[#e8507a]`}>OPENING GREETING ✦</label>
            <div className="text-[11px] text-[#e8507a] font-medium opacity-90">
              This is the first thing they say. Make it unforgettable.
            </div>
          </div>
          <span className="text-[11px] text-[#e8507a] flex-shrink-0 ml-2 font-body font-medium">
            {form.greeting.length}/1000
          </span>
        </div>
        <textarea
          maxLength={1000}
          value={form.greeting}
          onChange={(e) => update('greeting', e.target.value)}
          placeholder="*looks up slowly as you enter*&#10;[Character's first words that set the tone and make the user immediately intrigued]..."
          className={`${inputClass} min-h-[120px] resize-y border-[rgba(232,80,122,0.25)] focus:border-[#e8507a]`}
        />
      </div>

      <div>
        <div className="mb-[12px]">
          <label className={`${labelClass} mb-1`}>EXAMPLE DIALOGUES</label>
          <div className="text-[11px] text-[rgba(255,255,255,0.4)]">
            Show how they respond. 2-3 exchanges teaches the AI their voice.
          </div>
        </div>

        <div className="flex flex-col mb-4">
          {form.exampleDialogs.map((dialog, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div className="h-[1px] bg-[rgba(255,255,255,0.06)] my-6 w-full" />
              )}

              <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-[12px] p-5 relative transition-all hover:border-[rgba(255,255,255,0.08)]">
                <button
                  onClick={() => removeExample(index)}
                  className="absolute top-4 right-4 text-[12px] font-semibold text-[#e8507a] hover:text-white transition-colors"
                >
                  × Remove
                </button>
                <div className="font-label text-[10px] uppercase tracking-widest text-[rgba(255,255,255,0.3)] mb-4 font-bold">
                  Exchange {index + 1}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <span className="font-label text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5 block">
                      User
                    </span>
                    <input
                      type="text"
                      value={dialog.user}
                      onChange={(e) => updateExample(index, 'user', e.target.value)}
                      placeholder="What did you say?"
                      className={`${inputClass} !py-2.5 !px-4`}
                    />
                  </div>
                  <div>
                    <span className="font-label text-[11px] uppercase tracking-wider text-[#e8507a] mb-1.5 block">
                      Character
                    </span>
                    <textarea
                      value={dialog.char}
                      onChange={(e) => updateExample(index, 'char', e.target.value)}
                      placeholder="How they reply..."
                      className={`${inputClass} !py-2.5 !px-4 min-h-[90px] resize-y`}
                    />
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {form.exampleDialogs.length < 3 && (
          <button
            onClick={addExample}
            className="w-full border border-dashed border-[#e8507a]/40 text-[#e8507a] hover:border-[#e8507a] hover:bg-[#e8507a]/5 rounded-[8px] py-3.5 text-[13px] font-semibold tracking-wide transition-all mt-4"
          >
            + Add Example
          </button>
        )}
      </div>
    </div>
  )
}
