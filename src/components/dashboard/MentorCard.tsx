"use client";
import { Check, Heart, MessageCircleMore, Quote, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import type { MentorMatch } from "@/lib/engine";
import { Avatar, CardHeader } from "./shared";

/** Card "Mentora recomendada": melhor afinidade calculada pelo motor de match. */
export default function MentorCard({ match }: { match: MentorMatch }) {
  const { mentorRequests, requestMentor } = useStore();
  const { mentor, score } = match;
  const [role, company] = mentor.mentor_role.split(" · ");
  const requested = mentorRequests.includes(mentor.id);

  return (
    <section className="panel flex flex-col p-6">
      <CardHeader icon={Users} title="Mentora recomendada" href="/mentoria" />
      <div className="mt-5 flex items-center gap-5">
        <Avatar src={mentor.photo_url} name={mentor.mentor_name} className="h-[88px] w-[88px] text-2xl" ring />
        <div className="min-w-0">
          <p className="text-base font-bold text-navy-950">{mentor.mentor_name}</p>
          <p className="mt-0.5 text-sm leading-snug text-slate-500">{role}{company && <><br />{company}</>}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2.5 py-1 text-sm font-semibold text-pink-600">
            <Heart size={14} className="fill-pink-100" /> {score}% afinidade
          </span>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Especialidades">
        {[mentor.specialty, ...mentor.match_tags].slice(0, 3).map((t) => (
          <li key={t} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{t}</li>
        ))}
      </ul>
      {mentor.quote && (
        <blockquote className="mt-4 flex gap-2 rounded-xl bg-pink-50/70 px-3.5 py-3 text-sm leading-snug text-slate-600">
          <Quote size={14} className="mt-0.5 shrink-0 fill-pink-200 text-pink-300" aria-hidden />
          “{mentor.quote}”
        </blockquote>
      )}
      <div className="mt-auto pt-5">
        <button onClick={() => requestMentor(mentor.id, score)} disabled={requested} className="btn-outline-pink">
          {requested ? <><Check size={18} /> Conversa solicitada</> : <><MessageCircleMore size={18} /> Agendar conversa</>}
        </button>
      </div>
    </section>
  );
}
