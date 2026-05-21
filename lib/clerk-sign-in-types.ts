/**
 * Clerk sign-in MFA factors (`SignInSecondFactor` in @clerk/shared).
 * Used when `SignInResource.status === 'needs_second_factor'`.
 */
export type ClerkSignInSecondFactor =
  | { strategy: 'phone_code'; safePhoneNumber?: string }
  | { strategy: 'totp' }
  | { strategy: 'backup_code' }
