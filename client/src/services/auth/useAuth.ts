import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMeApi, impersonateApi, loginApi, logoutApi, refreshApi } from "./authApi";
import { clearTokens, getRefreshToken, setTokens } from "./tokenStorage";
import type { components } from "@/types/api.generated";

type UserOut = components["schemas"]["UserOut"];

const ME_KEY = ["auth", "me"] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery<UserOut | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await getMeApi();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const isAuthenticated = user != null;

  async function login(email: string, password: string): Promise<void> {
    const pair = await loginApi({ email, password });
    setTokens({ access: pair.access_token, refresh: pair.refresh_token });
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
  }

  async function logout(): Promise<void> {
    const raw = getRefreshToken();
    if (raw) {
      try {
        await logoutApi(raw);
      } catch {
        // swallow — server-side revocation is best-effort
      }
    }
    clearTokens();
    queryClient.setQueryData(ME_KEY, null);
    navigate("/login", { replace: true });
  }

  async function impersonate(userId: string): Promise<void> {
    const { access_token } = await impersonateApi(userId);
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("Missing refresh token");
    setTokens({ access: access_token, refresh });
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
    navigate("/", { replace: true });
  }

  async function stopImpersonating(): Promise<void> {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error("Missing refresh token");
    const pair = await refreshApi(refresh);
    setTokens({ access: pair.access_token, refresh: pair.refresh_token });
    await queryClient.invalidateQueries({ queryKey: ME_KEY });
    navigate("/admin", { replace: true });
  }

  return { user, isAuthenticated, isLoading, login, logout, impersonate, stopImpersonating };
}
