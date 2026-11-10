"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { EVENTS, MENTORS } from "@/lib/mock-data";
import { jobCompatibility, mentorAffinity, TRACK_NAMES } from "@/lib/engine";
import JourneyStepper from "@/components/JourneyStepper";
import TopBar from "@/components/dashboard/TopBar";
import JourneyHero from "@/components/dashboard/JourneyHero";
import MentorCard from "@/components/dashboard/MentorCard";
import JobsCard from "@/components/dashboard/JobsCard";
import EventCard from "@/components/dashboard/EventCard";
import CompetenciesSection from "@/components/dashboard/CompetenciesSection";
import { CardHeader } from "@/components/dashboard/shared";

export default function Dashboard() {
  const { profile, skills, jobs, onboarded, hydrated } = useStore();

  const topMentor = useMemo(
    () => MENTORS.map((m) => mentorAffinity(profile, m, skills)).sort((a, b) => b.score - a.score)[0],
    [profile, skills]);
  const topJobs = useMemo(
    () => jobs.map((j) => ({ job: j, m: jobCompatibility(j, skills, profile.track_type) })).sort((a, b) => b.m.pct - a.m.pct).slice(0, 3),
    [jobs, skills, profile.track_type]);
  // Próximo evento da trilha (depende do relógio: calculado só após a hidratação para evitar mismatch SSR)
  const nextEvent = useMemo(() => {
    if (!hydrated) return null;
    const mine = EVENTS.filter((e) => !profile.track_type || e.tracks.includes(profile.track_type))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return mine.find((e) => new Date(e.starts_at).getTime() >= Date.now()) ?? mine[mine.length - 1] ?? null;
  }, [hydrated, profile.track_type]);

  return (
    <div className="space-y-4 lg:space-y-5">
      <TopBar />

      {!onboarded && (
        <div className="panel flex flex-col items-start gap-3 border-pink-200 bg-pink-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-navy-950"><strong>Comece pela Etapa 1:</strong> faça seu diagnóstico para descobrir sua trilha.</p>
          <Link href="/onboarding" className="btn-primary">Fazer diagnóstico <ArrowRight size={16} /></Link>
        </div>
      )}

      <JourneyHero />

      <section className="panel px-6 pb-6 pt-5">
        <CardHeader title={`Sua jornada: ${profile.track_type ? TRACK_NAMES[profile.track_type] : "5 etapas"}`}
          href="/jornada" linkLabel="Ver jornada completa" />
        <div className="mt-6"><JourneyStepper /></div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 2xl:grid-cols-3">
        <MentorCard match={topMentor} />
        <JobsCard items={topJobs} />
        <EventCard event={nextEvent} />
      </div>

      <CompetenciesSection />
    </div>
  );
}
