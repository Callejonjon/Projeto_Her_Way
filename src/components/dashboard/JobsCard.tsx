"use client";
import Link from "next/link";
import { Briefcase, ExternalLink, MapPin, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import type { JobMatch } from "@/lib/engine";
import type { Job } from "@/lib/types";
import { CardHeader } from "./shared";

/** "Vagas para você": a única seção de vagas do Dashboard (vagas de finanças mais compatíveis). */
export default function JobsCard({ items }: { items: { job: Job; m: JobMatch }[] }) {
  const { applyJob, appliedJobs } = useStore();

  return (
    <section className="panel flex flex-col p-6">
      <CardHeader icon={Briefcase} title="Vagas para você" href="/vagas" />
      <ul className="mt-4 flex-1 divide-y divide-slate-100">
        {items.map(({ job, m }) => {
          const external = job.source_url.startsWith("http");
          const applied = appliedJobs.includes(job.id);
          const body = (
            <>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-bold text-navy-950 group-hover:text-pink-600">
                  <span className="truncate">{job.title}</span>
                  {external && <ExternalLink size={13} className="shrink-0 opacity-0 transition group-hover:opacity-100" aria-hidden />}
                </p>
                <p className="truncate text-sm text-slate-500">{job.company}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><MapPin size={13} aria-hidden /> {job.location.split(",")[0]} ({job.modality})</span>
                  <span className="flex items-center gap-1"><UserRound size={13} aria-hidden /> {job.level_required}</span>
                  {applied && <span className="font-semibold text-emerald-600">Candidatura enviada</span>}
                </p>
              </div>
              <span className="grid h-14 w-[72px] shrink-0 place-items-center rounded-xl bg-pink-50 text-center leading-tight text-pink-600">
                <span><span className="block text-lg font-bold">{m.pct}%</span><span className="text-xs font-medium">Match</span></span>
              </span>
            </>
          );
          const cls = "group flex items-center gap-3";
          return (
            <li key={job.id} className="py-3.5 first:pt-0 last:pb-0">
              {external ? (
                <a href={job.source_url} target="_blank" rel="noreferrer" onClick={() => applyJob(job.id, m.pct)} className={cls}
                  aria-label={`${job.title} na ${job.company}, ${m.pct}% de compatibilidade. Abre a página oficial de candidatura`}>{body}</a>
              ) : (
                <Link href="/vagas" className={cls}>{body}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
