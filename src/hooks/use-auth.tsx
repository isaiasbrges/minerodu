import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithProfile: (nome: string, funcao: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// Deterministic credentials derived from the operator's full name.
// This lets us reuse Supabase Auth (so RLS keeps working) while exposing
// a passwordless UX: "nome + função" only.
function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function credsFromName(nome: string) {
  const slug = slugify(nome) || "operador";
  const email = `${slug}@operacao.mineroduto.local`;
  // Stable secret per name — never shown to the user.
  const password = `op_${slug}_mineroduto_2026!`;
  return { email, password };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithProfile: AuthCtx["signInWithProfile"] = async (nome, funcao) => {
    const cleanNome = nome.trim();
    const cleanFuncao = funcao.trim();
    if (cleanNome.length < 3) return { error: "Informe o nome completo" };
    if (!cleanFuncao) return { error: "Informe a função" };

    const { email, password } = credsFromName(cleanNome);

    // Try sign-in first; if the account doesn't exist, register it.
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error) {
      // Keep função atualizada caso tenha mudado.
      await supabase.auth.updateUser({ data: { nome: cleanNome, funcao: cleanFuncao } });
      await supabase
        .from("operadores")
        .update({ funcao: cleanFuncao, nome: cleanNome })
        .eq("user_id", signIn.data.user!.id);
      return { error: null };
    }

    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome: cleanNome, funcao: cleanFuncao },
      },
    });
    if (signUp.error) return { error: signUp.error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, loading, signInWithProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
