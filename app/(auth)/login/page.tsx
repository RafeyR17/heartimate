"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function afterSignInPath(searchParams: URLSearchParams): string {
  const raw = searchParams.get("redirect_url");
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/home";
}
import Image from "next/image";
import Link from "next/link";
import { capturePostHog, identifyPostHog } from "@/lib/posthog-browser";
import { mapClerkError } from "@/lib/auth-errors";
import type { ClerkSignInSecondFactor } from "@/lib/clerk-sign-in-types";

function LoginPageContent() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const postLoginPath = afterSignInPath(searchParams);

  // If already signed in, redirect immediately
  useEffect(() => {
    if (isSignedIn) {
      router.replace(postLoginPath);
    }
  }, [isSignedIn, router, postLoginPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA-related state
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaStrategies, setMfaStrategies] = useState<ClerkSignInSecondFactor[]>([]);
  const [selectedMfaStrategy, setSelectedMfaStrategy] = useState<ClerkSignInSecondFactor | null>(null);

  async function handleLogin() {
    if (!isLoaded || !signIn) {
      setError("Still loading — please try again in a moment.");
      return;
    }
    try {
      setLoading(true);
      setError("");

      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        if (result.createdSessionId) {
          void identifyPostHog(result.createdSessionId);
        }
        void capturePostHog('user_logged_in', { method: 'email' });
        router.push(postLoginPath);
      } else if (result.status === "needs_second_factor") {
        const factors = (result.supportedSecondFactors ?? []) as ClerkSignInSecondFactor[];
        setMfaStrategies(factors);

        const firstStrategy = factors[0];
        setSelectedMfaStrategy(firstStrategy);
        setVerifyingMfa(true);

        if (firstStrategy?.strategy === "phone_code") {
          await signIn.prepareSecondFactor({
            strategy: "phone_code",
          });
        }
      } else {
        setError("Sign-in could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      setError(mapClerkError(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isLoaded || !selectedMfaStrategy || !signIn) return;
    
    try {
      setLoading(true);
      setError("");

      const result = await signIn.attemptSecondFactor({
        strategy: selectedMfaStrategy.strategy,
        code: mfaCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push(postLoginPath);
      } else {
        setError("Verification could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      setError(mapClerkError(err, "Invalid verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectStrategy(strategyObj: ClerkSignInSecondFactor) {
    setSelectedMfaStrategy(strategyObj);
    setMfaCode("");
    setError("");
    
    if (strategyObj.strategy === "phone_code") {
      try {
        setLoading(true);
        if (!signIn) return;
        await signIn.prepareSecondFactor({
          strategy: "phone_code",
        });
      } catch (err: unknown) {
        setError(mapClerkError(err, "Could not send verification code."));
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleGoogle() {
    if (!isLoaded || !signIn) return;
    try {
      void capturePostHog('user_logged_in_oauth', { provider: 'oauth_google' });
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: postLoginPath,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  }

  // MFA Verification Form UI (rendered inline on the right side)
  if (verifyingMfa) {
    return (
      <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[#0d0a0e] text-white overflow-x-hidden">
        <div className="relative w-full h-[35vh] md:w-1/2 md:h-screen shrink-0">
          <Image
            src="/images/characters/lyra.jpg"
            alt="Lyra Ashveil"
            fill
            className="object-cover object-top"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background:
                "linear-gradient(to bottom, rgba(8,6,8,0.2) 0%, rgba(8,6,8,0.85) 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                "linear-gradient(to right, rgba(8,6,8,0.3), rgba(8,6,8,0.7))",
            }}
          />
          <div className="hidden md:block absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-w-md">
            <p className="font-heading italic text-xl md:text-2xl text-white mb-6">
              "I knew you'd come back.
              <br />I always know."
            </p>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-rose/40 flex-shrink-0">
                <Image
                  src="/images/characters/lyra.jpg"
                  alt="Lyra"
                  fill
                  className="object-cover object-top"
                  sizes="40px"
                />
              </div>
              <div>
                <p className="font-label text-[11px] tracking-[0.1em] text-white uppercase">
                  Lyra Ashveil
                </p>
                <p className="font-label text-[10px] tracking-[0.1em] text-rose uppercase mt-0.5">
                  Dark Fantasy
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 w-full bg-[#080608] rounded-t-[20px] -mt-5 md:mt-0 md:rounded-none md:w-1/2 flex items-start md:items-center justify-center px-6 py-8 md:p-16">
          <div className="w-full max-w-md animate-in fade-in duration-500">
            <Link
              href="/"
              className="font-heading italic text-2xl text-white mb-8 md:mb-12 block text-center md:text-left"
            >
              Heartimate<span className="text-rose">.</span>
            </Link>

            <h1 className="font-heading text-[28px] md:text-4xl text-white mb-2 text-center md:text-left">
              Two-Factor Auth
            </h1>
            <p className="font-body font-light text-muted mb-8">
              {selectedMfaStrategy?.strategy === "totp" && "Enter the 6-digit code from your authenticator app."}
              {selectedMfaStrategy?.strategy === "phone_code" && `We sent a code to your phone ending in ${selectedMfaStrategy.safePhoneNumber || ""}.`}
              {selectedMfaStrategy?.strategy === "backup_code" && "Enter one of your emergency backup codes."}
              {!selectedMfaStrategy && "Please enter your verification code to continue."}
            </p>

            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div>
                <label htmlFor="mfa-code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  maxLength={selectedMfaStrategy?.strategy === "backup_code" ? 16 : 6}
                  placeholder={selectedMfaStrategy?.strategy === "backup_code" ? "xxxx-xxxx-xxxx" : "000000"}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-center text-2xl tracking-[0.2em] text-white font-body focus:outline-none focus:border-rose/50 transition-all placeholder:text-white/20"
                  required
                  autoFocus
                />
              </div>

              {error && <p className="text-error">{error}</p>}

              <button
                type="submit"
                disabled={loading || mfaCode.length < 4}
                className="btn-primary w-full uppercase tracking-wider"
              >
                {loading ? "Verifying..." : "Verify & Enter →"}
              </button>
            </form>

            {/* Alternative strategies selection */}
            {mfaStrategies.length > 1 && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-xs text-muted mb-3 uppercase tracking-wider font-label">
                  Try another method:
                </p>
                <div className="space-y-2">
                  {mfaStrategies.map((strat, idx) => {
                    if (strat.strategy === selectedMfaStrategy?.strategy) return null;
                    let label = "";
                    if (strat.strategy === "totp") label = "Authenticator App";
                    else if (strat.strategy === "phone_code") label = `SMS to ${strat.safePhoneNumber}`;
                    else if (strat.strategy === "backup_code") label = "Backup Code";
                    
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectStrategy(strat)}
                        className="w-full text-left bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all px-4 py-3 rounded-lg text-sm flex items-center justify-between"
                      >
                        <span className="font-body text-white/80">{label}</span>
                        <span className="text-rose text-xs">Select →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setVerifyingMfa(false);
                setError("");
                setMfaCode("");
              }}
              className="mt-8 w-full text-center font-body text-sm text-muted hover:text-white transition-colors block bg-transparent border-none cursor-pointer"
            >
              ← Cancel and back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-[#0d0a0e] text-white overflow-x-hidden">
      {/* Hero image */}
      <div className="relative w-full h-[35vh] md:w-1/2 md:h-screen shrink-0">
        <Image
          src="/images/characters/lyra.jpg"
          alt="Lyra Ashveil"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 md:hidden"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,6,8,0.2) 0%, rgba(8,6,8,0.85) 100%)",
          }}
        />
        <div
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              "linear-gradient(to right, rgba(8,6,8,0.3), rgba(8,6,8,0.7))",
          }}
        />
        <div className="hidden md:block absolute bottom-8 left-8 right-8 md:bottom-16 md:left-16 bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl max-w-md">
          <p className="font-heading italic text-xl md:text-2xl text-white mb-6">
            "I knew you'd come back.
            <br />I always know."
          </p>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-rose/40 flex-shrink-0">
              <Image
                src="/images/characters/lyra.jpg"
                alt="Lyra"
                fill
                className="object-cover object-top"
                sizes="40px"
              />
            </div>
            <div>
              <p className="font-label text-[11px] tracking-[0.1em] text-white uppercase">
                Lyra Ashveil
              </p>
              <p className="font-label text-[10px] tracking-[0.1em] text-rose uppercase mt-0.5">
                Dark Fantasy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 w-full bg-[#080608] rounded-t-[20px] -mt-5 md:mt-0 md:rounded-none md:w-1/2 flex items-start md:items-center justify-center px-6 py-8 md:p-16">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="font-heading italic text-2xl text-white mb-8 md:mb-12 block text-center md:text-left"
          >
            Heartimate<span className="text-rose">.</span>
          </Link>

          <h1 className="font-heading text-[28px] md:text-4xl text-white mb-2 text-center md:text-left">
            Welcome back.
          </h1>
          <p className="font-body font-light text-muted mb-8 md:mb-10 text-center md:text-left text-sm md:text-base">
            Your companion has been waiting.
          </p>

          {/* Social buttons */}
          <div className="space-y-4 mb-8">
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors min-h-[48px] rounded-xl font-body text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3.5 rounded-xl font-body text-sm opacity-40 cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
              Continue with Discord
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-label text-[10px] tracking-[0.1em] text-muted uppercase">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/password form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <label htmlFor="login-email" className="sr-only">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />

            <div className="relative">
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-white text-sm font-body"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="text-error">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 uppercase tracking-wider"
            >
              {loading ? "Signing in..." : "ENTER HEARTIMATE →"}
            </button>
          </form>

          <p className="mt-8 text-center font-body text-sm text-muted">
            New here?{" "}
            <Link
              href="/signup"
              className="text-white hover:text-rose transition-colors"
            >
              Create your account
            </Link>
          </p>
        </div>
      </div>

      <div id="clerk-captcha" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0a0e]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
