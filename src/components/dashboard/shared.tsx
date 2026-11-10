import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

const initialsOf = (name: string) => name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

/** Foto redonda com fallback para iniciais (aceita caminho público, URL do Supabase ou data URL). */
export function Avatar({ src, name, className = "h-12 w-12", ring = false }: { src?: string | null; name: string; className?: string; ring?: boolean }) {
  const base = `${className} shrink-0 rounded-full ${ring ? "ring-4 ring-pink-50" : ""}`;
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" className={`${base} object-cover`} />
    : <span className={`${base} grid place-items-center bg-pink-100 font-bold text-pink-600`} aria-hidden>{initialsOf(name)}</span>;
}

/** Cabeçalho padrão dos cards do Dashboard: ícone rosa + título + link "Ver todas". */
export function CardHeader({ icon: Icon, title, href, linkLabel = "Ver todas", aside }: {
  icon?: LucideIcon; title: string; href?: string; linkLabel?: string; aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-navy-950">
          {Icon && <Icon size={22} strokeWidth={1.8} className="text-pink-500" aria-hidden />} {title}
        </h2>
        {aside}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-pink-600 hover:underline">
          {linkLabel} <ChevronRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}
