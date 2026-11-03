"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_PROFILE, DEMO_PROGRESS, JOBS, MODULES } from "./mock-data";
import {
  computeJourney, effectiveSkills, isFinanceJob, isPassed, levelFromXp, modulesForTrack, PASS_SCORE, quizXp, type JourneyState,
} from "./engine";
import * as repo from "./repo";
import { isDemoMode } from "./supabase";
import type { Job, Module, ModuleProgress, Profile } from "./types";

export type ViewMode = "aluna" | "admin";

interface PersistedState {
  profile: Profile;
  progress: ModuleProgress[];
  onboarded: boolean;
  mentorRequests: string[];
  appliedJobs: string[];
  customJobs: Job[];
  eventRegistrations: string[];
  view: ViewMode;
}

export interface Celebration { title: string; subtitle: string; xp: number; levelUp: number | null }

interface Store extends PersistedState {
  hydrated: boolean;
  isDemo: boolean;
  modules: Module[];
  jobs: Job[];
  journey: JourneyState;
  skills: Set<string>;
  celebration: Celebration | null;
  setView: (v: ViewMode) => void;
  updateProfile: (p: Partial<Profile>) => void;
  completeOnboarding: (p: Profile, extra?: Record<string, unknown>) => void;
  submitQuiz: (moduleId: string, score: number) => { passed: boolean; xp: number };
  requestMentor: (mentorId: string, affinity: number) => void;
  connectLinkedin: (url: string) => void;
  registerEvent: (eventId: string) => void;
  profileBoostOpen: boolean;
  setProfileBoostOpen: (open: boolean) => void;
  applyJob: (jobId: string, pct: number) => void;
  addJob: (job: Job) => void;
  mergeJobs: (jobs: Job[]) => void;
  dismissCelebration: () => void;
  resetDemo: () => void;
}

const KEY = "herway-state-v1";
const initial: PersistedState = {
  profile: DEMO_PROFILE,
  progress: DEMO_PROGRESS,
  onboarded: true, // demo começa com a Etapa 1 concluída; "Refazer onboarding" no perfil
  mentorRequests: [],
  appliedJobs: [],
  customJobs: [],
  eventRegistrations: [],
  view: "aluna",
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initial);
  const [hydrated, setHydrated] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [remoteJobs, setRemoteJobs] = useState<Job[] | null>(null);
  const [profileBoostOpen, setProfileBoostOpen] = useState(false);

  // Hidratação do localStorage (evita mismatch SSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch { /* estado corrompido -> usa initial */ }
    setHydrated(true);
    repo.fetchJobs().then((j) => j && j.length && setRemoteJobs(j));
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(KEY, JSON.stringify(state)); }, [state, hydrated]);

  const modules = useMemo(() => modulesForTrack(MODULES, state.profile.track_type), [state.profile.track_type]);
  const journey = useMemo(
    () => computeJourney(modules, state.progress, state.onboarded, state.mentorRequests.length > 0),
    [modules, state.progress, state.onboarded, state.mentorRequests.length]);
  const skills = useMemo(() => effectiveSkills(state.profile, modules, journey.passed), [state.profile, modules, journey.passed]);
  const jobs = useMemo(() => {
    const base = remoteJobs ?? JOBS;
    const ids = new Set(base.map((j) => j.id));
    return [...state.customJobs.filter((j) => !ids.has(j.id)), ...base].filter(isFinanceJob);
  }, [remoteJobs, state.customJobs]);

  const gainXp = useCallback((profile: Profile, xp: number) => {
    const newXp = profile.xp + xp;
    const newLevel = levelFromXp(newXp);
    return { profile: { ...profile, xp: newXp, level: newLevel }, levelUp: newLevel > profile.level ? newLevel : null };
  }, []);

  const submitQuiz = useCallback((moduleId: string, score: number) => {
    const prevEntry = state.progress.find((p) => p.module_id === moduleId);
    const already = isPassed(prevEntry);
    const passed = score >= PASS_SCORE;
    const xp = passed && !already ? quizXp(score) : 0;
    const best = Math.max(score, prevEntry?.quiz_score ?? 0);
    const entry: ModuleProgress = { module_id: moduleId, quiz_score: best, completed_at: best >= PASS_SCORE ? new Date().toISOString() : "" };
    const progress = [...state.progress.filter((p) => p.module_id !== moduleId), entry];
    const g = xp ? gainXp(state.profile, xp) : null;

    setState((s) => ({ ...s, progress, profile: g ? g.profile : s.profile }));
    repo.saveModuleProgress(moduleId, score, passed);
    if (g) {
      repo.saveProfile(g.profile);
      const mod = MODULES.find((m) => m.id === moduleId);
      setCelebration({
        title: g.levelUp ? `Nível ${g.levelUp} desbloqueado!` : "Conquista desbloqueada!",
        subtitle: `Você concluiu "${mod?.title}" com ${score}%. O próximo passo da jornada foi liberado.`,
        xp, levelUp: g.levelUp,
      });
    }
    return { passed, xp };
  }, [state.progress, state.profile, gainXp]);

  const requestMentor = useCallback((mentorId: string, affinity: number) => {
    if (state.mentorRequests.includes(mentorId)) return;
    const first = state.mentorRequests.length === 0;
    const g = first ? gainXp(state.profile, 100) : null; // primeira conexão = +100 XP
    setState((s) => ({ ...s, mentorRequests: [...s.mentorRequests, mentorId], profile: g ? g.profile : s.profile }));
    repo.saveMentorRequest(mentorId, affinity);
    if (g) {
      repo.saveProfile(g.profile);
      setCelebration({
        title: g.levelUp ? `Nível ${g.levelUp} desbloqueado!` : "Medalha: Conexão Feita!",
        subtitle: "Primeira mentoria solicitada! Com a formação básica concluída, a Etapa 4 é liberada.",
        xp: 100, levelUp: g.levelUp,
      });
    }
  }, [state.mentorRequests, state.profile, gainXp]);

  const connectLinkedin = useCallback((url: string) => {
    const first = !state.profile.linkedin_url;
    const g = first ? gainXp(state.profile, 50) : null; // primeira conexão do LinkedIn = +50 XP
    const profile = { ...(g ? g.profile : state.profile), linkedin_url: url };
    setState((s) => ({ ...s, profile }));
    repo.saveProfile(profile);
    setProfileBoostOpen(false);
    if (g) {
      setCelebration({
        title: g.levelUp ? `Nível ${g.levelUp} desbloqueado!` : "Perfil profissional conectado!",
        subtitle: "Seu LinkedIn agora faz parte do seu perfil privado.",
        xp: 50, levelUp: g.levelUp,
      });
    }
  }, [state.profile, gainXp]);

  const value: Store = {
    ...state, hydrated, isDemo: isDemoMode, modules, jobs, journey, skills, celebration,
    setView: (view) => setState((s) => ({ ...s, view })),
    updateProfile: (p) => setState((s) => {
      const profile = { ...s.profile, ...p };
      repo.saveProfile(profile);
      return { ...s, profile };
    }),
    completeOnboarding: (profile, extra) => {
      setState((s) => ({ ...s, profile, onboarded: true, progress: [], mentorRequests: [], appliedJobs: [] }));
      repo.saveProfile(profile, extra);
      setTimeout(() => setCelebration({
        title: "Etapa 1 concluída!",
        subtitle: `Bem-vinda à Trilha ${profile.track_type}. Sua jornada de 5 etapas começa agora.`,
        xp: 0, levelUp: null,
      }), 0);
    },
    submitQuiz,
    requestMentor,
    connectLinkedin,
    registerEvent: (eventId) =>
      setState((s) => (s.eventRegistrations.includes(eventId) ? s : { ...s, eventRegistrations: [...s.eventRegistrations, eventId] })),
    profileBoostOpen,
    setProfileBoostOpen,
    applyJob: (jobId, pct) => {
      setState((s) => (s.appliedJobs.includes(jobId) ? s : { ...s, appliedJobs: [...s.appliedJobs, jobId] }));
      repo.saveApplication(jobId, pct);
    },
    addJob: (job) => { setState((s) => ({ ...s, customJobs: [job, ...s.customJobs] })); repo.insertJob(job); },
    mergeJobs: (incoming) => setState((s) => {
      const known = new Set([...s.customJobs, ...JOBS].map((j) => j.source_url + j.title));
      return { ...s, customJobs: [...incoming.filter((j) => !known.has(j.source_url + j.title)), ...s.customJobs] };
    }),
    dismissCelebration: () => setCelebration(null),
    resetDemo: () => { localStorage.removeItem(KEY); setState(initial); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
