import { setAuthTokenGetter, setBaseUrl } from "./api-client-react/custom-fetch";

export type AuthUser = { id: string; name: string; email: string; cash: number };

const TOKEN_KEY = "stocksphere_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
setAuthTokenGetter(() => getToken());
setBaseUrl(import.meta.env.VITE_API_URL || null);

export async function authRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ""}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as { token: string; user: AuthUser };
}
