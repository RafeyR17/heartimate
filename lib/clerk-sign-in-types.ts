/**
 * Clerk sign-in MFA / Client Trust factors (`SignInSecondFactor` in @clerk/shared).
 * Used when `SignInResource.status === 'needs_second_factor'`.
 */
export type ClerkSignInEmailCodeFactor = {
  strategy: 'email_code'
  emailAddressId: string
  safeIdentifier?: string
}

export type ClerkSignInSecondFactor =
  | ClerkSignInEmailCodeFactor
  | { strategy: 'phone_code'; safePhoneNumber?: string }
  | { strategy: 'totp' }
  | { strategy: 'backup_code' }

export function isEmailCodeFactor(
  factor: ClerkSignInSecondFactor
): factor is ClerkSignInEmailCodeFactor {
  return factor.strategy === 'email_code'
}
