"use client";

import { useRef, useState } from "react";
import { CameraIcon, X } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar-image";
import { apiFetch } from "@/lib/api-client";
import {
  MAX_PERSONA_APPEARANCE_LENGTH,
  MAX_PERSONA_NAME_LENGTH,
  MAX_PERSONA_PERSONALITY_LENGTH,
  MAX_PERSONA_SHORT_BIO_LENGTH,
} from "@/lib/api-validation";

type Props = {
  displayName: string;
  onBack: () => void;
  onCreated: (persona: { id: string; name: string }) => void;
};

export function OnboardingPersonaStep({ displayName, onBack, onCreated }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName.trim());
  const [shortBio, setShortBio] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canContinue =
    name.trim().length > 0 &&
    appearance.trim().length > 0 &&
    personality.trim().length > 0;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function handleCreate() {
    if (!canContinue) {
      setError("Name, appearance, and personality are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name.trim().slice(0, MAX_PERSONA_NAME_LENGTH));
      formData.append("short_bio", shortBio.trim().slice(0, MAX_PERSONA_SHORT_BIO_LENGTH));
      formData.append("appearance", appearance.trim().slice(0, MAX_PERSONA_APPEARANCE_LENGTH));
      formData.append("personality", personality.trim().slice(0, MAX_PERSONA_PERSONALITY_LENGTH));
      if (avatarFile) formData.append("avatar", avatarFile);

      const result = await apiFetch<{ persona?: { id?: string; name?: string } }>(
        "/api/personas",
        { method: "POST", body: formData }
      );

      const persona = result.ok ? result.data.persona : undefined;
      const personaId = persona?.id;
      const savedName =
        typeof persona?.name === "string" ? persona.name.trim() : name.trim();
      if (!personaId || !savedName) {
        setError(result.ok ? "Could not create persona." : result.error);
        return;
      }
      onCreated({ id: personaId, name: savedName });
    } catch {
      setError("Could not create persona. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-body text-sm placeholder:text-white/25 focus:border-rose/50 focus:outline-none transition-colors";

  return (
    <div className="w-full max-w-[560px] px-6 text-left max-h-[100dvh] overflow-y-auto py-10">
      <span className="font-label text-rose text-[11px] tracking-[0.15em] mb-4 block uppercase">
        // who are you?
      </span>
      <h2 className="font-heading text-4xl md:text-5xl text-white mb-2">Create your persona</h2>
      <p className="font-body text-[15px] text-muted mb-8 leading-relaxed">
        Characters will see you as this person. You need a persona before you pick who to talk to.
      </p>

      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`relative w-20 h-20 rounded-full flex-shrink-0 overflow-hidden border-2 transition-colors ${
            avatarPreview ? "border-rose" : "border-dashed border-white/20 hover:border-rose/40"
          }`}
        >
          {avatarPreview ? (
            <AvatarImage src={avatarPreview} alt="" fill className="object-cover" sizes="80px" />
          ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <CameraIcon size={20} />
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <label htmlFor="onboarding-persona-name" className="font-label text-[10px] uppercase tracking-[0.15em] text-muted block mb-2">
            Name
          </label>
          <input
            id="onboarding-persona-name"
            type="text"
            value={name}
            maxLength={MAX_PERSONA_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            placeholder="How characters address you"
            className={fieldClass}
          />
        </div>
        {avatarPreview ? (
          <button
            type="button"
            onClick={removeAvatar}
            className="text-muted hover:text-white p-2"
            aria-label="Remove photo"
          >
            <X size={18} />
          </button>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="space-y-5 mb-8">
        <div>
          <label htmlFor="onboarding-persona-bio" className="font-label text-[10px] uppercase tracking-[0.15em] text-muted block mb-2">
            Short bio <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            id="onboarding-persona-bio"
            value={shortBio}
            maxLength={MAX_PERSONA_SHORT_BIO_LENGTH}
            onChange={(e) => setShortBio(e.target.value)}
            rows={2}
            placeholder="A line about who you are…"
            className={`${fieldClass} resize-none`}
          />
        </div>
        <div>
          <label htmlFor="onboarding-persona-appearance" className="font-label text-[10px] uppercase tracking-[0.15em] text-muted block mb-2">
            Appearance
          </label>
          <textarea
            id="onboarding-persona-appearance"
            value={appearance}
            maxLength={MAX_PERSONA_APPEARANCE_LENGTH}
            onChange={(e) => setAppearance(e.target.value)}
            rows={3}
            placeholder="How you look — age, style, presence…"
            className={`${fieldClass} resize-none`}
            required
          />
        </div>
        <div>
          <label htmlFor="onboarding-persona-personality" className="font-label text-[10px] uppercase tracking-[0.15em] text-muted block mb-2">
            Personality
          </label>
          <textarea
            id="onboarding-persona-personality"
            value={personality}
            maxLength={MAX_PERSONA_PERSONALITY_LENGTH}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            placeholder="How you act, speak, and respond…"
            className={`${fieldClass} resize-none`}
            required
          />
        </div>
      </div>

      {error ? <p className="text-error text-sm mb-4">{error}</p> : null}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-6 py-3 rounded-full border border-white/15 text-muted hover:text-white font-body text-sm transition-colors disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canContinue || loading}
          className="flex-1 px-8 py-4 bg-rose text-white rounded-full font-body font-medium text-[13px] tracking-[0.1em] uppercase transition-all disabled:opacity-30 hover:bg-rose/90 shadow-[0_0_20px_rgba(232,80,122,0.2)]"
        >
          {loading ? "Creating persona…" : "Continue to characters →"}
        </button>
      </div>
    </div>
  );
}
