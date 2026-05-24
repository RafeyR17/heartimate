/**
 * Clerk bot-protection mount — must be in the DOM before signIn.create / signUp.create.
 * @see https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection
 */
export function ClerkCaptcha() {
  return (
    <div
      id="clerk-captcha"
      className="flex min-h-[65px] w-full items-center justify-center empty:min-h-0 [&:not(:empty)]:min-h-[65px]"
      data-cl-theme="dark"
    />
  )
}
