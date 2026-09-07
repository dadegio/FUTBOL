export const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function passwordPolicyError(password: string, minLength = 8): string | null {
  if (password.length < minLength) return `Password minimo ${minLength} caratteri`;
  if (password.length > 128) return "Password troppo lunga";
  return null;
}
