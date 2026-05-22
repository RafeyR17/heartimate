"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs/legacy";
import { capturePostHog } from "@/lib/posthog-browser";
import { apiFetch } from "@/lib/api-client";
import { setNewUserHint } from "@/lib/client-storage";
import { useToast } from "@/components/ToastProvider";
import { OnboardingPersonaStep } from "@/components/onboarding/OnboardingPersonaStep";
import { OnboardingRevealStep } from "@/components/onboarding/OnboardingRevealStep";

const KINKS = [
  "Romance", "Slow Burn", "Forbidden Love", "Childhood Friends", "Hurt/Comfort",
  "Dominant", "Submissive", "Soft Dom", "Possessive", "Mentor/Student",
  "Yandere", "Enemies to Lovers", "Dark Fantasy", "Obsessive", "Age Gap",
  "Supernatural", "Sci-Fi", "Historical", "Horror", "Monster/Non-human"
];

type OnboardingStarter = {
  id: string;
  name: string;
  tag: string;
  img: string;
  teaser: string;
  msg: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();
  const { error: toastError } = useToast();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [isEighteen, setIsEighteen] = useState(false);
  const [shakeConsent, setShakeConsent] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [personaName, setPersonaName] = useState("");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [starters, setStarters] = useState<OnboardingStarter[]>([]);
  const [startersLoading, setStartersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await apiFetch<{ starters?: OnboardingStarter[] }>("/api/onboarding", {
          cache: "no-store",
        });
        if (
          !cancelled &&
          result.ok &&
          Array.isArray(result.data.starters)
        ) {
          setStarters(result.data.starters);
          if (result.data.starters.length > 0) {
            setSelectedChar((prev) => prev ?? result.data.starters![0].id);
          }
        }
      } catch {
        if (!cancelled) toastError("Could not load characters", "Please refresh and try again.");
      } finally {
        if (!cancelled) setStartersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toastError]);

  const [roseFlash, setRoseFlash] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  if (step >= 5 && !personaId) {
    setStep(4);
  }

  const handleOAuth = () => {
    if (!isLoaded) return;
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/onboarding",
    });
  };

  const handleStep2Next = async () => {
    if (!isEighteen) {
      setShakeConsent(true);
      setTimeout(() => setShakeConsent(false), 500);
      return;
    }
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setSavingDisplayName(true);
    try {
      const result = await apiFetch<{ user?: { display_name?: string } }>("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      if (!result.ok) {
        toastError("Could not save your name", result.error);
        return;
      }
      const saved = result.data.user?.display_name?.trim();
      if (saved) setDisplayName(saved);
      setStep(3);
    } catch {
      toastError("Could not save your name", "Please try again.");
    } finally {
      setSavingDisplayName(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };

  const selectedCharData = starters.find(c => c.id === selectedChar);

  const handleFinish = async () => {
    if (!personaId) {
      setSubmitError("Create your persona before continuing.");
      setStep(4);
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    setRoseFlash(true);
    
    try {
      const result = await apiFetch<{ chatId?: string }>("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          kinkPrefs: selectedTags,
          personaId,
          starterCharId: selectedChar,
          characterName: selectedCharData?.name,
          isAdult: isEighteen
        })
      });
      
      setTimeout(() => setRoseFlash(false), 600);

      if (result.ok && result.data.chatId) {
        void capturePostHog('onboarding_completed', {
          starter_character: selectedCharData?.name,
          tags_selected: selectedTags.length,
        });
        setNewUserHint();
        router.push(`/chat/${result.data.chatId}`);
      } else {
        const message = result.ok ? "Something went wrong" : result.error;
        setSubmitError(message);
        toastError("Onboarding failed", message);
        setIsSubmitting(false);
      }
    } catch {
      const message = "Could not finalize onboarding. Please try again.";
      setSubmitError(message);
      toastError("Onboarding failed", message);
      setIsSubmitting(false);
      setRoseFlash(false);
    }
  };

  // Helper for slide transitions
  const getSlideClass = (s: number) => {
    if (step === s) return "opacity-100 translate-x-0 z-10 pointer-events-auto";
    if (step > s) return "opacity-0 -translate-x-[60px] -z-10 pointer-events-none";
    return "opacity-0 translate-x-[60px] -z-10 pointer-events-none";
  };

  return (
    <div className="w-full h-[100dvh] bg-[#080608] text-white overflow-hidden relative font-body">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .char-card-hover .teaser-msg {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .char-card-hover:hover .teaser-msg {
          opacity: 1;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Tiny progress dot */}
      {step < 6 && (
        <div className="absolute top-8 right-8 z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose shadow-[0_0_8px_rgba(232,80,122,0.8)]" />
          <span className="text-[10px] text-white/30 font-label tracking-[0.2em]">{step}/6</span>
        </div>
      )}

      {/* STEP 1: THE HOOK */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${getSlideClass(1)}`}>
        <div className="absolute inset-0 -z-20">
          <Image src="/images/hero/hero-bg.webp" alt="Background" fill className="object-cover object-center" priority />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,6,8,0.3) 0%, rgba(8,6,8,0.7) 50%, rgba(8,6,8,0.95) 100%)' }} />
        </div>
        
        <div className="flex flex-col items-center text-center px-6 mt-20 opacity-0" style={{ animation: 'fadeUp 0.8s ease 0.4s forwards' }}>
          <span className="font-label text-rose text-[11px] tracking-[0.15em] mb-6 block uppercase">// YOU FOUND IT</span>
          <h1 className="font-heading italic text-[clamp(56px,8vw,100px)] leading-[1.1] mb-0 text-rose">Find your</h1>
          <h1 className="font-heading font-bold text-[clamp(56px,8vw,100px)] leading-[1.1] mb-8 text-white">obsession.</h1>
          
          <p className="font-body font-light text-[18px] text-muted max-w-md leading-relaxed mb-12">
            AI companions who remember everything.
            Your desires, your secrets, your story —
            explored without limits.
          </p>

          <div className="w-full max-w-[360px] flex flex-col gap-4 mt-12">
            <button 
              onClick={() => setStep(2)}
              className="w-full bg-rose text-white rounded-full py-4 font-body font-medium text-[13px] tracking-[0.1em] uppercase hover:bg-rose/90 transition-all"
            >
              Start for free →
            </button>
            <button 
              onClick={handleOAuth}
              className="w-full bg-transparent border border-white/20 text-white rounded-full py-4 font-body text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
          <p className="mt-8 font-label text-[11px] text-muted tracking-wide">18+ only · Private · No credit card</p>
        </div>
      </div>

      {/* STEP 2: AGE GATE + NAME */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${getSlideClass(2)}`}>
        <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 70%, rgba(232,80,122,0.12), transparent)' }} />
        
        <span className="font-label text-rose text-[11px] tracking-[0.15em] mb-6 block uppercase">// FIRST THINGS FIRST</span>
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-16 text-center">What should they call you?</h2>
        
        <input
          type="text"
          placeholder="your name..."
          value={displayName}
          maxLength={50}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleStep2Next();
          }}
          className="w-[360px] max-w-full bg-transparent border-none border-b-2 border-white/15 focus:border-rose focus:outline-none text-center text-white font-heading text-[36px] pb-2 transition-colors placeholder:text-white/20"
        />

        <div className={`flex items-center gap-3 mt-[24px] ${shakeConsent ? 'animate-shake' : ''}`}>
          <div 
            onClick={() => setIsEighteen(!isEighteen)}
            className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${
              isEighteen ? 'bg-rose border-rose' : shakeConsent ? 'border-rose bg-rose/10' : 'border-white/30 hover:border-white/50'
            }`}
          >
            {isEighteen && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
          </div>
          <span 
            onClick={() => setIsEighteen(!isEighteen)}
            className={`font-body text-[13px] cursor-pointer select-none transition-colors ${shakeConsent ? 'text-rose' : 'text-muted'}`}
          >
            I confirm I am 18 years or older
          </span>
        </div>

        <div className={`mt-16 transition-all duration-500 ${displayName.trim() && isEighteen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button 
            type="button"
            onClick={() => void handleStep2Next()}
            disabled={savingDisplayName}
            className="px-12 py-4 bg-rose text-white rounded-full font-body font-medium text-[13px] tracking-[0.1em] uppercase hover:bg-rose/90 transition-all shadow-[0_0_20px_rgba(232,80,122,0.3)] disabled:opacity-50"
          >
            {savingDisplayName ? "Saving…" : "That's me →"}
          </button>
        </div>
      </div>

      {/* STEP 3: DESIRE TAGS */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${getSlideClass(3)}`}>
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
        
        <div className="w-full max-w-[680px] px-6 text-left">
          <span className="font-label text-rose text-[11px] tracking-[0.15em] mb-6 block uppercase">// STEP 2</span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-2">What draws you in,</h2>
          <h2 className="font-heading italic text-4xl md:text-5xl text-rose mb-6">{displayName}?</h2>
          <p className="font-body text-[15px] text-muted mb-8">Pick everything that calls to you.</p>

          <div className="flex flex-wrap gap-2 sm:gap-[10px] mt-[32px] mb-8 max-w-full">
            {KINKS.map(kink => {
              const isSel = selectedTags.includes(kink);
              return (
                <button
                  type="button"
                  key={kink}
                  onClick={() => toggleTag(kink)}
                  className={`px-[14px] py-2 md:px-[18px] md:py-[10px] rounded-[50px] font-body font-medium text-[11px] md:text-[12px] transition-all duration-150 ease-out border min-h-[44px] ${
                    isSel 
                      ? 'bg-[rgba(232,80,122,0.12)] border-[rgba(232,80,122,0.4)] text-[#e8507a] scale-[1.04]' 
                      : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {kink}
                </button>
              )
            })}
          </div>

          <div className="h-6 mb-8">
            {selectedTags.length === 0 ? (
              <p className="font-body text-[12px] text-rose">pick at least one</p>
            ) : (
              <p className="font-body text-[12px] text-muted">{selectedTags.length} selected — the more you pick, the better your matches</p>
            )}
          </div>

          <button 
            onClick={() => selectedTags.length > 0 && setStep(4)}
            disabled={selectedTags.length === 0}
            className="px-8 py-4 bg-rose text-white rounded-full font-body font-medium text-[13px] tracking-[0.1em] uppercase transition-all disabled:opacity-30 hover:bg-rose/90 shadow-[0_0_20px_rgba(232,80,122,0.2)] disabled:shadow-none"
          >
            Create your persona →
          </button>
        </div>
      </div>

      {/* STEP 4: CREATE PERSONA */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${getSlideClass(4)}`}>
        <OnboardingPersonaStep
          displayName={displayName}
          onBack={() => setStep(3)}
          onCreated={({ id, name }) => {
            setPersonaId(id);
            setPersonaName(name);
            setStep(5);
          }}
        />
      </div>

      {/* STEP 5: CHOOSE YOUR OBSESSION */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${getSlideClass(5)}`}>
        <div className="w-full flex flex-col items-center pt-10">
          <span className="font-label text-rose text-[11px] tracking-[0.15em] mb-4 block uppercase text-center">// YOUR FIRST OBSESSION</span>
          <h2 className="font-heading italic text-4xl md:text-5xl text-rose mb-1 text-center">Someone has been waiting</h2>
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-white mb-12 md:mb-16 text-center">for exactly you.</h2>

          <div className="flex overflow-x-auto snap-x md:overflow-visible w-full md:justify-center gap-[20px] pb-8 px-6 md:px-0 scrollbar-hide">
            {startersLoading && (
              <p className="font-body text-muted text-sm px-4">Loading characters…</p>
            )}
            {!startersLoading && starters.length === 0 && (
              <p className="font-body text-muted text-sm px-4">No starter characters available yet.</p>
            )}
            {starters.map(char => {
              const isSel = selectedChar === char.id;
              return (
                <div 
                  key={char.id}
                  onClick={() => setSelectedChar(char.id)}
                  className={`char-card-hover relative flex-shrink-0 w-[200px] md:w-[240px] aspect-[2/3] rounded-[20px] overflow-hidden cursor-pointer transition-all duration-300 ease-out snap-center
                    ${isSel 
                      ? 'scale-100 brightness-100 border-2 border-rose shadow-[0_8px_60px_rgba(232,80,122,0.35),0_0_0_1px_rgba(232,80,122,0.2)] z-20' 
                      : 'scale-[0.93] brightness-[0.6] hover:scale-[0.97] hover:brightness-[0.85] z-10'
                    }
                  `}
                >
                  <Image src={char.img} alt={char.name} fill className="object-cover object-top pointer-events-none" sizes="(max-width: 768px) 200px, 240px" />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #080608 0%, rgba(8,6,8,0.9) 35%, transparent 65%)' }} />
                  
                  <div className="absolute bottom-[20px] left-[16px] right-[16px] pointer-events-none">
                    <h3 className="font-heading text-[20px] text-white leading-tight">{char.name}</h3>
                    <p className="font-label text-[9px] uppercase tracking-[0.15em] text-muted mt-[4px]">{char.tag}</p>
                    <p className="teaser-msg font-heading italic text-[12px] text-muted mt-[8px] leading-snug">{char.teaser}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="h-[60px] mt-4 flex items-center justify-center">
            <div className={`transition-all duration-500 ${selectedChar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <button
                onClick={() => {
                  if (selectedChar && selectedCharData) {
                    void capturePostHog('onboarding_character_selected', {
                      character_id: selectedChar,
                      character_name: selectedCharData.name,
                      character_tag: selectedCharData.tag,
                    });
                    setStep(6);
                  }
                }}
                className="px-10 py-4 bg-rose text-white rounded-full font-heading italic text-[18px] transition-all hover:bg-rose/90 shadow-[0_0_20px_rgba(232,80,122,0.3)] flex items-center gap-2"
              >
                Meet {selectedCharData?.name.split(' ')[0]} <span className="font-body font-normal text-sm ml-1">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 6: THE REVEAL */}
      {step === 6 && selectedCharData && (
        <OnboardingRevealStep
          key={selectedCharData.id}
          character={selectedCharData}
          personaName={personaName}
          displayName={displayName}
          slideClassName={getSlideClass(6)}
          roseFlash={roseFlash}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onFinish={() => void handleFinish()}
        />
      )}

    </div>
  );
}
