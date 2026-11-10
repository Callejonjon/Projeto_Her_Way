"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { isDemoMode, supabase } from "@/lib/supabase";
import Brand from "@/components/Brand";

const PUBLIC = ["/login", "/cadastro", "/recuperar-senha", "/auth/callback", "/auth/reset"];
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { authUser, authLoading, hydrated, onboarded, isAdmin } = useStore();
  const publicPage = PUBLIC.some((route) => path === route || path.startsWith(route + "/"));
  useEffect(() => {
    if (isDemoMode || authLoading || !hydrated) return;
    if (!authUser && !publicPage) router.replace("/login");
    else if (authUser && publicPage && path !== "/auth/reset" && path !== "/auth/callback") router.replace(onboarded ? "/" : "/onboarding");
    else if (authUser && !onboarded && !publicPage && path !== "/onboarding") router.replace("/onboarding");
    else if (authUser && path.startsWith("/admin") && !isAdmin) router.replace("/");
  }, [authUser, authLoading, hydrated, onboarded, publicPage, path, router, isAdmin]);
  if (isDemoMode) return <div className="mx-auto mt-20 max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold">Conexão indisponível</h1><p className="mt-3 text-slate-600">Configure as variáveis públicas do Supabase no ambiente Preview e gere um novo deployment. O cadastro real não funciona no modo demonstração.</p></div>;
  if (authLoading || !hydrated) return <div className="grid min-h-screen place-items-center text-slate-600">Carregando sua conta...</div>;
  if ((!authUser && !publicPage) || (authUser && !onboarded && !publicPage && path !== "/onboarding") || (authUser && publicPage && !path.startsWith("/auth/")) || (authUser && path.startsWith("/admin") && !isAdmin)) return <div className="grid min-h-screen place-items-center text-slate-600">Redirecionando...</div>;
  if (publicPage) return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-white to-pink-50 p-4"><div className="w-full max-w-md"><div className="mb-8 flex justify-center"><Brand /></div>{children}<p className="mt-8 text-center text-xs text-slate-500">Her Way · Sua jornada no mercado financeiro</p></div></div>;
  return <>{children}</>;
}
