import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  email?: string;
  fullName: string | null;
  isAdmin: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: isAdmin }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", authUser.id).single(),
      supabase.rpc("has_role", { _user_id: authUser.id, _role: "admin" }),
    ]);

    setUser({
      id: authUser.id,
      email: authUser.email,
      fullName: profile?.full_name ?? null,
      isAdmin: Boolean(isAdmin),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!mounted) return;
      await loadUser();
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (mounted) loadUser();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const logout = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [queryClient, navigate]);

  return { user, loading, logout };
}
