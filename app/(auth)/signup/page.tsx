"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { stripCredentialQueryFromUrl } from "@/lib/auth-query-strip";
import { useSignUp } from "@clerk/nextjs/legacy";
import { capturePostHog, identifyPostHog } from "@/lib/posthog-browser";
import { mapClerkError } from "@/lib/auth-errors";
import { validateSignupEmail } from "@/lib/signup-email";

export default function SignupPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ageChecked, setAgeChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [shakeConsent, setShakeConsent] = useState(false);

  const getPasswordStrength = () => {
    if (password.length === 0) return 0;
    if (password.length < 6) return 1;
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 3;
    return 2;
  };
  const strength = getPasswordStrength();

  useEffect(() => {
    const clean = stripCredentialQueryFromUrl(new URL(window.location.href));
    if (!clean) return;
    window.history.replaceState(null, "", `${clean.pathname}${clean.search}`);
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!isLoaded || !signUp) {
      setError('Still loading — please try again in a moment.');
      return;
    }
    if (!ageChecked) {
      setShakeConsent(true);
      setError('You must confirm you are 18 or older.');
      setTimeout(() => setShakeConsent(false), 500);
      return;
    }
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    const emailCheck = validateSignupEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.message);
      return;
    }

    try {
      setLoading(true);
      setError('');

      await signUp.create({
        emailAddress: emailCheck.normalized,
        password: password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setVerifying(true);
    } catch (err: unknown) {
      setError(mapClerkError(err, 'Could not create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isLoaded) return;
    try {
      setLoading(true);
      setError('');
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        if (result.createdUserId) {
          void identifyPostHog(result.createdUserId, { email });
        }
        void capturePostHog('user_signed_up', { method: 'email' });
        router.push('/onboarding');
      }
    } catch (err: unknown) {
      setError(mapClerkError(err, 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  }

  const handleOAuth = (strategy: "oauth_google" | "oauth_discord") => {
    if (!isLoaded) return;
    const method = strategy === "oauth_google" ? "google" : "discord";
    void capturePostHog('user_signed_up', { method });
    signUp.authenticateWithRedirect({
      strategy,
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/onboarding",
    });
  };

  // VERIFICATION SCREEN
  if (verifying) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg)] flex flex-col items-center justify-center gap-6 p-6">
        <div id="clerk-captcha" />
        <h2 className="heading-accent text-4xl">Check your email.</h2>
        <p className="text-muted-on-dark text-[15px] text-center">
          We sent a 6-digit code to {email}
        </p>
        <label htmlFor="signup-verify-code" className="sr-only">
          Verification code
        </label>
        <input
          id="signup-verify-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          placeholder="000000"
          className="input-field max-w-[240px] text-center text-[32px] tracking-[0.3em] border-rose/40"
        />
        {error && <p className="text-error">{error}</p>}
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || code.length < 6}
          className="btn-primary px-10"
        >
          {loading ? 'Verifying...' : 'Verify & Enter →'}
        </button>
        <button
          type="button"
          onClick={() => setVerifying(false)}
          className="text-muted-on-dark text-[13px] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
        >
          ← Wrong email? Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[#0d0a0e] text-white overflow-x-hidden">
      <div id="clerk-captcha"></div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
      
      {/* Left side: Image & Quote */}
      <div className="relative w-full h-[35vh] md:w-1/2 md:h-screen shrink-0">
        <Image
          src="/images/characters/aria.jpg"
          alt="Aria"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: 'linear-gradient(to bottom, rgba(8,6,8,0.2) 0%, rgba(8,6,8,0.85) 100%)' }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: 'linear-gradient(to right, rgba(8,6,8,0.3), rgba(8,6,8,0.7))' }}
        />
        <div className="hidden md:block absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-w-md">
          <p className="font-heading italic text-xl md:text-2xl text-white mb-6">
            "Tell me your name.<br/>I want to remember it."
          </p>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-rose/40 flex-shrink-0">
              <Image src="/images/characters/aria.jpg" alt="Aria" fill className="object-cover object-top" sizes="40px" />
            </div>
            <div>
              <p className="font-label text-[11px] tracking-[0.1em] text-white uppercase">Aria</p>
              <p className="font-label text-[10px] tracking-[0.1em] text-rose uppercase mt-0.5">Submissive · Waiting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="relative z-10 flex-1 w-full bg-[#080608] rounded-t-[20px] -mt-5 md:mt-0 md:rounded-none md:w-1/2 flex items-start md:items-center justify-center px-6 py-8 md:p-16">
        <div className="w-full max-w-md animate-in fade-in duration-500">
          <Link href="/" className="font-heading italic text-2xl text-white mb-8 md:mb-12 block text-center md:text-left w-fit mx-auto md:mx-0">
            Heartimate<span className="text-rose">.</span>
          </Link>
          
          <h1 className="font-heading text-[28px] md:text-4xl text-white mb-2 text-center md:text-left">Create your sanctuary.</h1>
          <p className="font-body font-light text-muted mb-8 md:mb-10 text-center md:text-left text-sm md:text-base">Free forever. No credit card.</p>

          <div className="space-y-4 mb-8">
            <button 
              onClick={() => handleOAuth("oauth_google")}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors py-3.5 rounded-xl font-body text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.6.22 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button 
              onClick={() => handleOAuth("oauth_discord")}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors py-3.5 rounded-xl font-body text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 11-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
              </svg>
              Continue with Discord
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="font-label text-[10px] tracking-[0.1em] text-muted uppercase">or continue with email</span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="sr-only">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="sr-only">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
              {password && (
                <div className="mt-2 flex h-1 gap-1">
                  {[1, 2, 3].map((level) => (
                    <div 
                      key={level} 
                      className={`flex-1 rounded-full transition-colors ${
                        strength >= level ? (strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={`flex items-start gap-3 mt-6 p-4 rounded-xl border transition-all ${shakeConsent ? 'animate-shake border-red-500/50 bg-red-500/10' : 'border-white/5 bg-white/5'}`}>
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  id="consent"
                  checked={ageChecked}
                  onChange={(e) => setAgeChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-rose focus:ring-rose focus:ring-offset-bg bg-white/5 cursor-pointer"
                />
              </div>
              <label htmlFor="consent" className="font-body text-xs text-muted leading-relaxed cursor-pointer select-none">
                I confirm I am 18+ and consent to viewing unmoderated, explicit and{' '}
                <span className="text-rose font-medium">NSFW content</span>. I agree to the{' '}
                <Link
                  href="/terms"
                  onClick={(e) => e.stopPropagation()}
                  className="text-white hover:text-rose underline-offset-2 hover:underline"
                >
                  Terms
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  onClick={(e) => e.stopPropagation()}
                  className="text-white hover:text-rose underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            {error && (
              <p className="text-error mt-2">{error}</p>
            )}

            <button
              type="button"
              disabled={loading || !isLoaded}
              onClick={() => void handleSubmit()}
              className="btn-primary w-full uppercase tracking-wider mt-4"
            >
              {!isLoaded ? "Loading..." : loading ? "Creating..." : "BEGIN →"}
            </button>
          </form>

          <p className="mt-8 text-center font-body text-sm text-muted">
            Already have an account? <Link href="/login" className="text-white hover:text-rose transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
