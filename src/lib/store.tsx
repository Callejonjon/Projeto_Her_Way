"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_PROFILE, DEMO_PROGRESS, JOBS, MODULES } from "./mock-data";
import {
  computeJourney, effectiveSkills, isFinanceJob, isPassed, levelFromXp, modulesForTrack, PASS_SCORE, quizXp, type JourneyState,
} from "./engine";
import * as repo from "./repo";
import { isDemoMode, supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";
import type { EventItem, Job, Mentor, Module, ModuleProgress, Profile } from "./types";

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
  authUser: User | null;
  authLoading: boolean;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  modules: Module[];
  catalogModules: Module[];
  jobs: Job[];
  mentors: Mentor[];
  events: EventItem[];
  journey: JourneyState;
  skills: Set<string>;
  celebration: Celebration | null;
  setView: (v: ViewMode) => void;
  updateProfile: (p: Partial<Profile>) => void;
  completeOnboarding: (p: Profile, extra?: Record<string, unknown>) => void;
  submitQuiz: (moduleId: string, score: number) => { passed: boolean; xp: number };
  completeReading: (moduleId: string) => void;
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
const emptyProfile: Profile = { id: "", name: "", email: "", track_type: null, level: 1, xp: 0, interests: [], skills: [], bio: "", avatar_url: null, linkedin_url: "", cv_url: null, goal: "" };

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
  const [state, setState] = useState<PersistedState>(isDemoMode ? initial : { ...initial, profile: emptyProfile, progress: [], onboarded: false });
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(!isDemoMode);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [remoteJobs, setRemoteJobs] = useState<Job[] | null>(null);
  const [remoteMentors, setRemoteMentors] = useState<Mentor[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<EventItem[]>([]);
  const [remoteModules, setRemoteModules] = useState<Module[] | null>(null);
  const [profileBoostOpen, setProfileBoostOpen] = useState(false);

  // Demo state is browser-only. Real accounts are always isolated by Supabase Auth + RLS.
  useEffect(() => {
    if (isDemoMode) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) setState({ ...initial, ...JSON.parse(raw) });
      } catch { /* ignore corrupted demo state */ }
      setHydrated(true);
      setAuthLoading(false);
      return;
    }
    if (!supabase) return;
    let active = true;
    const client = supabase;
    async function load(user: User | null) {
      if (!active) return;
      setAuthLoading(true);
      setAuthUser(user);
      setIsAdmin(false);
      if (!user) {
        setState({ ...initial, profile: emptyProfile, progress: [], onboarded: false, view: "aluna" });
        setHydrated(true);
        setAuthLoading(false);
        return;
      }
      const [profileResult, progressResult, matchesResult, applicationsResult] = await Promise.all([
        client.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        client.from("modules_progress").select("*").eq("user_id", user.id),
        client.from("mentorship_matches").select("mentor_id").eq("user_id", user.id),
        client.from("applications").select("job_id").eq("user_id", user.id),
      ]);
      if (!active) return;
      if (profileResult.error) console.error("[auth] profile", profileResult.error.message);
      const p = profileResult.data;
      setIsAdmin(p?.is_admin === true);
      const profile: Profile = {
        ...emptyProfile,
        id: user.id,
        email: user.email ?? "",
        name: p?.name ?? String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? ""),
        track_type: p?.track_type ?? null,
        xp: p?.xp ?? 0, level: p?.level ?? 1,
        interests: p?.interests ?? [], skills: p?.skills ?? [],
        bio: p?.bio ?? "", linkedin_url: p?.linkedin_url ?? "",
        cv_url: p?.cv_url ?? null, avatar_url: p?.avatar_url ?? null,
      };
      setState({
        ...initial, profile, onboarded: Boolean(profile.track_type),
        progress: (progressResult.data ?? []).map((v) => ({ module_id: v.module_id, quiz_score: v.quiz_score ?? 0, completed_at: v.completed_at ?? "" })),
        mentorRequests: (matchesResult.data ?? []).map((v) => v.mentor_id),
        appliedJobs: (applicationsResult.data ?? []).map((v) => v.job_id),
        view: "aluna",
        customJobs: [], eventRegistrations: [],
      });
      setHydrated(true);
      setAuthLoading(false);
    }
    // Read the authenticated user from Supabase; never trust previous localStorage state.
    client.auth.getUser().then(({ data }) => load(data.user)).catch(() => load(null));
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        // Defer queries outside the auth callback to avoid auth-lock deadlocks.
        setTimeout(() => { if (active) void load(session?.user ?? null); }, 0);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isDemoMode && hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!isDemoMode && authUser && supabase) {
      repo.fetchJobs().then((j) => setRemoteJobs(j ?? []));
      supabase.from("mentorships").select("*").eq("active",true).then(({data,error}) => {
        if(error){console.warn("[mentorships]",error.message);return;}
        const blockedDemoNames=new Set(["Carla Menezes","Juliana Prado","Renata Okada","Fernanda Lima"]);
        setRemoteMentors((data??[]).filter(m=>!blockedDemoNames.has(m.mentor_name)).map(m=>({
          id:m.id, mentor_name:m.mentor_name, mentor_role:m.mentor_role,
          specialty:m.specialty, bio:m.bio??"", match_tags:m.match_tags??[],
          tracks:["A","B"], goals:[], initials:m.mentor_name.split(/\s+/).slice(0,2).map((x:string)=>x[0]).join("").toUpperCase(),
        } as Mentor)));
      });
      supabase.from("events").select("*").gte("starts_at",new Date().toISOString()).order("starts_at").then(({data,error})=>{
        if(error){console.warn("[events]",error.message);return;}
        setRemoteEvents((data??[]) as EventItem[]);
      });
      // Public catalog: all published A, B, and shared courses for every account.
      // RLS hides unpublished courses from students.
      const client = supabase;
      void Promise.all([
        client.from("learning_modules").select("*").order("stage").order("sort_order"),
        client.from("learning_assets").select("*"),
      ]).then(([catalog, assetsResult]) => {
        if (catalog.error) {
          console.warn("[learning_modules]",catalog.error.message);
          setRemoteModules([]);
          return;
        }
        if (assetsResult.error) console.warn("[learning_assets]",assetsResult.error.message);
        const assets = assetsResult.data ?? [];
        setRemoteModules((catalog.data ?? []).map(row => ({
          id:row.id,title:row.title,stage:row.stage,track:row.track,
          description:(row.slides?.[0]?.body ?? "").slice(0,185) || "Material produzido pela equipe Her Way.",
          durationMin:row.duration_min ?? 30,skillsGranted:row.skills_granted ?? [],
          content:[],quiz:row.quiz ?? [],slides:row.slides ?? [],
          reviewRequired:Boolean(row.review_required),
          assets:assets.filter(a=>a.module_id===row.id),
          videoSummary:row.video_summary ?? null,videoTranscript:row.video_transcript ?? null,
          videoStatus:row.video_status ?? "not_started",
        } as Module)));
      });
    }
  }, [authUser]);

  const catalogModules = useMemo(() => isDemoMode ? MODULES : (remoteModules ?? []), [remoteModules]);
  // Only the gamified journey uses the chosen track; course browsing uses catalogModules.
  const modules = useMemo(() => modulesForTrack(catalogModules, state.profile.track_type), [catalogModules, state.profile.track_type]);
  const journey = useMemo(
    () => computeJourney(modules, state.progress, state.onboarded, state.mentorRequests.length > 0),
    [modules, state.progress, state.onboarded, state.mentorRequests.length]);
  const skills = useMemo(() => effectiveSkills(state.profile, modules, journey.passed), [state.profile, modules, journey.passed]);
  const jobs = useMemo(() => {
    const base = isDemoMode ? (remoteJobs ?? JOBS) : (remoteJobs ?? []);
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
      const mod = modules.find((m) => m.id === moduleId);
      setCelebration({
        title: g.levelUp ? `Nível ${g.levelUp} desbloqueado!` : "Conquista desbloqueada!",
        subtitle: `Você concluiu "${mod?.title}" com ${score}%. O próximo passo da jornada foi liberado.`,
        xp, levelUp: g.levelUp,
      });
    }
    return { passed, xp };
  }, [state.progress, state.profile, gainXp, modules]);

  const completeReading = useCallback((moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || mod.quiz.length || state.progress.some((p) => p.module_id === moduleId && p.completed_at)) return;
    const entry: ModuleProgress = { module_id: moduleId, quiz_score: 100, completed_at: new Date().toISOString() };
    const gained = gainXp(state.profile, 30);
    setState((prev) => ({
      ...prev,
      progress: [...prev.progress.filter((p) => p.module_id !== moduleId), entry],
      profile: gained.profile,
    }));
    // Quiz score 100 is a temporary progress marker for completion of non-quiz lessons.
    // Replace with a dedicated completion_type column before high-stakes assessments.
    void repo.saveModuleProgress(moduleId, 100, true);
    void repo.saveProfile(gained.profile);
    setCelebration({ title: "Aula concluída!", subtitle: `Você concluiu "${mod.title}" e ganhou 30 XP.`, xp: 30, levelUp: gained.levelUp });
  }, [modules, state.progress, state.profile, gainXp]);

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

  const handleRefresh = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) setState((s) => ({ ...s, profile: { ...s.profile, name: p.name, track_type: p.track_type, xp: p.xp, level: p.level, interests: p.interests, skills: p.skills, bio: p.bio ?? "", linkedin_url: p.linkedin_url ?? "", cv_url: p.cv_url ?? null }, onboarded: !!p.track_type }));
    }
  };

  const value: Store = {
    ...state, hydrated, isDemo: isDemoMode, authUser, authLoading, isAdmin, refreshProfile: handleRefresh,
    modules, catalogModules, jobs, mentors: isDemoMode ? [] : remoteMentors, events: isDemoMode ? [] : remoteEvents, journey, skills, celebration,
    setView: (view) => setState((s) => ({ ...s, view: !isDemoMode && !isAdmin ? "aluna" : view })),
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
    completeReading,
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
    resetDemo: () => { if (isDemoMode) { localStorage.removeItem(KEY); setState(initial); } },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}
