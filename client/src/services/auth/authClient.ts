import { apiClient } from "@/api/client";
import { clearTokens, getAccessToken, setTokens } from "./tokenStorage";
import { refreshApi } from "./authApi";

export const AUTH_EXPIRED_EVENT = "auth:expired";

let refreshInFlight: Promise<string> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshApi()
      .then((pair) => {
        setTokens({ access: pair.access_token });
        return pair.access_token;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  try {
    return await refreshInFlight;
  } catch {
    clearTokens();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    return null;
  }
}

apiClient.use({
  async onRequest({ request }) {
    const token = getAccessToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },

  async onResponse({ response, request }) {
    if (response.status !== 401) return response;
    if (new URL(request.url).pathname.endsWith("/auth/refresh")) return response;

    const newToken = await tryRefresh();
    if (!newToken) return response;

    request.headers.set("Authorization", `Bearer ${newToken}`);
    return fetch(request);
  },
});
