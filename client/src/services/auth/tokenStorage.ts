const ACCESS_KEY = "access_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(tokens: { access: string }): void {
  localStorage.setItem(ACCESS_KEY, tokens.access);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
}
