import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/services/auth/useAuth";
import { PorchLayout } from "@/components/layout/PorchLayout";

export function PorchRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.status === "active") {
      navigate("/sub/dashboard", { replace: true });
    }
  }, [user?.status, navigate]);

  if (!user) return null;

  const entryAmount = user.entry_tribute_amount ?? null;

  return <PorchLayout entryTributeAmount={entryAmount} />;
}
