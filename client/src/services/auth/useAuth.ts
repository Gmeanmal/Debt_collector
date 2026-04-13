import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMeApi, loginApi, logoutApi } from "./authApi";
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

  return { user, isAuthenticated, isLoading, login, logout };
}
