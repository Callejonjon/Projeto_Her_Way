"use client";
import { useMemo, useState } from "react";
import MentorBookingCalendar from "@/components/MentorBookingCalendar";

import MentorApplicationForm from "@/components/MentorApplicationForm";
import MentorApplicationReview from "@/components/MentorApplicationReview";
import { CalendarDays, CheckCircle2, ExternalLink, Info, MapPin, Sparkles, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { mentorAffinity } from "@/lib/engine";
import { MatchBadge, PageHeader, ProgressBar } from "@/components/ui";
import type { EventItem } from "@/lib/types";
import { fmtDay, fmtMonth, fmtTime } from "@/lib/format";

const KINDS: (EventItem["kind"] | "Todos")[] = ["Todos", "Networking", "Bate-papo", "Liga Universitária", "Empresa Parceira"];

export default function Mentoria() {
  const { profile, skills, journey, mentors, events: upcomingEvents, isAdmin } = useStore();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("Todos");
  const [showRule, setShowRule] = useState(false);
  const [calendarMentorId,setCalendarMentorId] = useState<string|null>(null);

  const ranked = useMemo(
    () => mentors.map((m) => mentorAffinity(profile, m, skills)).sort((a, b) => b.score - a.score),
    [profile, skills, mentors]);
  const events = upcomingEvents.filter((e) => (kind === "Todos" || e.kind === kind));

  return (
    <>
      <PageHeader eyebrow="Etapa 3 · Mentoria e networking" title="Sua rede de apoio"
        subtitle="Pareamento por critérios objetivos de afinidade: área de interesse, competências, trilha e objetivo de carreira." />

      <section className="card mb-6 flex flex-col gap-4 border border-pink-100 bg-gradient-to-r from-pink-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Inscrição de novas mentoras">
        <div><h2 className="flex items-center gap-2 text-lg font-extrabold text-navy-950"><UserPlus className="text-pink-500" size={20}/> Compartilhe sua trajetória como mentora</h2>
         <p className="mt-1 text-sm text-slate-600">Profissionais podem se candidatar. A Her Way avalia currículo e experiência antes de aprovar qualquer participação.</p></div>
        <a href="#quero-ser-mentora" className="btn-primary shrink-0 justify-center"><UserPlus size={17}/> Quero ser mentora</a>
      </section>

      {!journey.stagesDone[2] && (
        <p className="mb-6 flex items-start gap-2 rounded-xl bg-solar-400/15 p-3 text-sm text-slate-700">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-600" />
          Você já pode consultar as agendas das mentoras aprovadas. Para reservar, complete sua foto no perfil; os horários disponíveis são reais.
        </p>
      )}

      <section aria-labelledby="match-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="match-title" className="text-lg font-bold">Mentoras com maior afinidade</h2>
          <button onClick={() => setShowRule((s) => !s)} className="flex items-center gap-1 text-sm font-semibold text-navy-800 hover:underline" aria-expanded={showRule}>
            <Info size={16} /> Como calculamos?
          </button>
        </div>
        {showRule && (
          <div className="card mb-4 grid gap-3 p-4 text-sm sm:grid-cols-4">
            {[["40 pts", "Área de interesse = especialidade da mentora"], ["25 pts", "Competências que você ainda não tem e ela ensina"], ["20 pts", "Experiência com a sua trilha (A ou B)"], ["15 pts", "Apoio ao seu objetivo de carreira"]].map(([p, t]) => (
              <div key={p} className="rounded-xl bg-slate-50 p-3"><p className="font-extrabold text-pink-600">{p}</p><p className="text-slate-600">{t}</p></div>
            ))}
          </div>
        )}

        {ranked.length === 0 && <p className="card mb-4 p-6 text-sm text-slate-600">Ainda não há mentoras verificadas disponíveis. Em breve divulgaremos as profissionais participantes.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map(({ mentor, score, reasons }, i) => {
            return (
              <article key={mentor.id} className={`card flex flex-col p-5 ${i === 0 ? "ring-2 ring-pink-400" : ""}`}>
                {i === 0 && <span className="chip mb-3 w-fit bg-pink-500 text-white">★ Melhor match</span>}
                <div className="flex items-center gap-3">
                  {mentor.photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={mentor.photo_url} alt={`Foto de ${mentor.mentor_name}`} className="h-14 w-14 shrink-0 rounded-full border-2 border-pink-100 object-cover"/>
                  : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-pink-600 text-lg font-bold text-white">{mentor.initials}</span>}
                  <div className="min-w-0">
                    <h3 className="font-bold">{mentor.mentor_name}</h3>
                    <p className="text-xs text-slate-500">{mentor.mentor_role}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={score} label={`Afinidade com ${mentor.mentor_name}`} className="flex-1" />
                  <MatchBadge pct={score} label="" />
                </div>
                <p className="mt-3 text-sm text-slate-600">{mentor.bio}</p>
                <ul className="mt-3 flex-1 space-y-1">
                  {reasons.map((r) => <li key={r} className="flex gap-1.5 text-xs text-slate-700"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-solar-500" /> {r}</li>)}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="chip bg-navy-800/10 text-navy-800">{mentor.specialty}</span>
                  {mentor.match_tags.map((t) => <span key={t} className="chip bg-slate-100 text-slate-600">{t}</span>)}
                </div>
                <button className="btn-primary mt-4 justify-center" onClick={() => setCalendarMentorId(mentor.id)}>
                  <CalendarDays size={16}/> Ver disponibilidade e agendar
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-10"><MentorApplicationForm/></div>
      {isAdmin && <MentorApplicationReview/>}


      {calendarMentorId && mentors.find(m=>m.id===calendarMentorId) && <MentorBookingCalendar mentor={mentors.find(m=>m.id===calendarMentorId)!} onClose={()=>setCalendarMentorId(null)}/>}

      <section aria-labelledby="ev-title" className="mt-12">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="ev-title" className="text-lg font-bold">Agenda e comunidade</h2>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar eventos">
            {KINDS.map((k) => (
              <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
                className={`chip border ${kind === k ? "border-navy-800 bg-navy-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{k}</button>
            ))}
          </div>
        </div>
        {events.length === 0 && <p className="card mb-4 p-6 text-sm text-slate-600">Ainda não existem eventos futuros confirmados.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const recommended = profile.track_type ? e.tracks.includes(profile.track_type) : true;
            return (
              <article key={e.id} className="card flex gap-4 p-5">
                <div className="grid h-16 w-14 shrink-0 place-content-center rounded-xl bg-navy-950 text-center text-white">
                  <span className="text-xl font-extrabold leading-none">{fmtDay(e.starts_at)}</span>
                  <span className="text-[10px] uppercase">{fmtMonth(e.starts_at)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    <span className="chip bg-pink-100 text-pink-600">{e.kind}</span>
                    {recommended && <span className="chip bg-solar-400/25 text-amber-700">Para sua trilha</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-bold">{e.title}</h3>
                  <p className="text-xs text-slate-500">{e.host}</p>
                  <p className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmtTime(e.starts_at)}</span>
                    <span className="flex items-center gap-1 truncate"><MapPin size={12} /> {e.location}</span>
                  </p>
                  <a href={e.url} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:underline">Inscrever-se <ExternalLink size={12} /></a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
