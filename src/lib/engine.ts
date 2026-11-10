import type { Area, Job, JobLevel, Mentor, Module, ModuleProgress, Profile, Track } from "./types";

export const PASS_SCORE = 70;
export const XP_LEVELS = [0, 200, 500, 900, 1400]; // XP mínimo para níveis 1..5

export const LEVEL_NAMES = ["Exploradora", "Aprendiz", "Analista", "Estrategista", "Protagonista"];

/** Nome da jornada exibido no Dashboard para cada trilha. */
export const TRACK_NAMES: Record<Track, string> = { A: "Primeiros Passos", B: "Novos Horizontes" };

export function levelFromXp(xp: number): number {
  let level = 1;
  XP_LEVELS.forEach((min, i) => { if (xp >= min) level = i + 1; });
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const cur = XP_LEVELS[level - 1];
  const next = XP_LEVELS[level] ?? cur;
  const pct = next === cur ? 100 : Math.round(((xp - cur) / (next - cur)) * 100);
  return { level, cur, next, pct, isMax: level === 5 };
}

/** XP de um quiz aprovado: 150 base + bônus proporcional à nota acima do mínimo. */
export function quizXp(score: number) {
  return 150 + Math.round(Math.max(0, score - PASS_SCORE));
}

export const isPassed = (p?: ModuleProgress) => !!p && p.quiz_score >= PASS_SCORE;

/* ---------------------------------------------------------------------------
   Jornada: módulos visíveis por trilha, desbloqueio sequencial e etapas
   --------------------------------------------------------------------------- */
export function modulesForTrack(all: Module[], track: Track | null) {
  return all.filter((m) => m.track === "all" || m.track === track);
}

export interface JourneyState {
  stagesDone: Record<1 | 2 | 3 | 4 | 5, boolean>;
  unlocked: Set<string>;
  passed: Set<string>;
  currentStage: number;
}

export function computeJourney(
  modules: Module[],
  progress: ModuleProgress[],
  onboarded: boolean,
  hasMentor: boolean,
): JourneyState {
  const passed = new Set(progress.filter(isPassed).map((p) => p.module_id));
  const byStage = (s: number) => modules.filter((m) => m.stage === s);
  const allPassed = (s: number) => byStage(s).length > 0 && byStage(s).every((m) => passed.has(m.id));

  const stagesDone = {
    1: onboarded,
    2: onboarded && allPassed(2),
    3: onboarded && allPassed(2) && hasMentor,
    4: false,
    5: false,
  } as JourneyState["stagesDone"];
  stagesDone[4] = stagesDone[3] && allPassed(4);
  stagesDone[5] = stagesDone[4] && allPassed(5);

  // Desbloqueio: sequencial dentro da trilha. Etapa 4 exige a Etapa 3 (mentoria) concluída.
  const unlocked = new Set<string>();
  const ordered = [...modules].sort((a, b) => a.stage - b.stage);
  for (let i = 0; i < ordered.length; i++) {
    const m = ordered[i];
    const prevOk = i === 0 || passed.has(ordered[i - 1].id);
    const stageGate = m.stage === 2 ? onboarded : m.stage === 4 ? stagesDone[3] : stagesDone[4];
    if (onboarded && prevOk && stageGate) unlocked.add(m.id);
  }

  const currentStage = ([1, 2, 3, 4, 5] as const).find((s) => !stagesDone[s]) ?? 5;
  return { stagesDone, unlocked, passed, currentStage };
}

/* ---------------------------------------------------------------------------
   Match de Mentoras (afinidade 0–100)
   --------------------------------------------------------------------------- */
export const AREA_SKILLS: Record<Area, string[]> = {
  "Asset Management": ["Excel", "CPA-20", "Python", "Inglês"],
  "Investment Banking": ["Excel", "Valuation", "Inglês"],
  "Crédito": ["Excel", "Análise de Balanço", "SQL"],
  "Research": ["Excel", "Valuation", "Análise de Balanço", "Inglês"],
  "Tech & Dados": ["Python", "SQL", "Power BI"],
};

export interface MentorMatch { mentor: Mentor; score: number; reasons: string[] }

/**
 * Pesos: Área de interesse 40 · Competências que ela ainda não tem e a mentora ensina 25 ·
 * Trilha (A/B) 20 · Objetivo de carreira 15.
 */
export function mentorAffinity(profile: Profile, mentor: Mentor, skills: Set<string>): MentorMatch {
  const reasons: string[] = [];
  let score = 0;

  const areaHit = profile.interests.includes(mentor.specialty);
  if (areaHit) { score += 40; reasons.push(`Atua em ${mentor.specialty}, sua área de interesse`); }

  const gaps = new Set(profile.interests.flatMap((a) => AREA_SKILLS[a]).filter((s) => !skills.has(s)));
  const teaches = mentor.match_tags.filter((t) => gaps.has(t));
  const compScore = gaps.size ? Math.min(1, teaches.length / Math.min(gaps.size, 3)) : 0.5;
  score += Math.round(25 * compScore);
  if (teaches.length) reasons.push(`Pode te ensinar ${teaches.join(", ")}`);

  if (profile.track_type && mentor.tracks.includes(profile.track_type)) {
    score += 20;
    reasons.push(profile.track_type === "A" ? "Experiente com universitárias" : "Especialista em transição de carreira");
  }
  if (mentor.goals.includes(profile.goal)) { score += 15; reasons.push(`Apoia o objetivo "${profile.goal}"`); }

  return { mentor, score, reasons };
}

/* ---------------------------------------------------------------------------
   Compatibilidade com vagas (baseada nos módulos concluídos + skills declaradas)
   --------------------------------------------------------------------------- */
const LEVEL_FIT: Record<Track, Record<JobLevel, number>> = {
  A: { "Estágio": 1, "Júnior": 0.6, "Transição": 0.3, "Pleno": 0.2 },
  B: { "Transição": 1, "Júnior": 0.8, "Pleno": 0.5, "Estágio": 0.3 },
};

export interface JobMatch { pct: number; have: string[]; missing: string[] }

/** 70% cobertura de habilidades exigidas + 30% aderência do nível à trilha. */
export function jobCompatibility(job: Job, skills: Set<string>, track: Track | null): JobMatch {
  const have = job.skills_tags.filter((s) => skills.has(s));
  const missing = job.skills_tags.filter((s) => !skills.has(s));
  const coverage = job.skills_tags.length ? have.length / job.skills_tags.length : 1;
  const fit = track ? LEVEL_FIT[track][job.level_required] : 0.5;
  return { pct: Math.round(100 * (0.7 * coverage + 0.3 * fit)), have, missing };
}

/** Mural de Vagas: somente vagas de finanças — vagas de dados/BI/tecnologia ficam fora da plataforma. */
const DATA_ROLE = /(dados|\bdata\b|cientista|scientist|\bBI\b|business intelligence|engineer|engenheir)/i;
export function isFinanceJob(job: Job) {
  return job.area !== "Tech & Dados" && !DATA_ROLE.test(job.title);
}

/** Skills efetivas = declaradas no perfil + concedidas pelos módulos aprovados. */
export function effectiveSkills(profile: Profile, modules: Module[], passed: Set<string>) {
  const s = new Set(profile.skills);
  modules.filter((m) => passed.has(m.id)).forEach((m) => m.skillsGranted.forEach((k) => s.add(k)));
  return s;
}

/** Módulo que ensina uma habilidade (para o CTA "aprenda na plataforma"). */
export function moduleForSkill(modules: Module[], skill: string) {
  return modules.find((m) => m.skillsGranted.includes(skill));
}

/* ---------------------------------------------------------------------------
   Diagnóstico inicial -> bifurcação de trilha
   --------------------------------------------------------------------------- */
export interface DiagnosticAnswers {
  situacao: "universitaria" | "recem_formada" | "profissional_outra_area" | "retorno_mercado";
  experienciaAnos: number;
  horasSemana: number;
  conhecimento: number; // 0..3 autoavaliação
  motivacao: string;
}

export function decideTrack(a: DiagnosticAnswers): { track: Track; reason: string; commitment: number } {
  const isStudent = a.situacao === "universitaria" || (a.situacao === "recem_formada" && a.experienciaAnos < 2);
  const track: Track = isStudent ? "A" : "B";
  // Comprometimento/potencial (não exclui iniciantes: conhecimento prévio pesa pouco)
  const commitment = Math.min(100, Math.round(
    (Math.min(a.horasSemana, 10) / 10) * 50 + Math.min(a.motivacao.trim().length, 200) / 200 * 35 + (a.conhecimento / 3) * 15));
  const reason = isStudent
    ? "Você está na universidade ou começando: a Trilha A foca em estágios, ligas e programas de férias."
    : "Você já tem bagagem profissional: a Trilha B valoriza suas competências transferíveis e foca em vagas de transição.";
  return { track, reason, commitment };
}

/* ---------------------------------------------------------------------------
   Competências (Dashboard): agrupam módulos da trilha e refletem o progresso real
   --------------------------------------------------------------------------- */
export type CompetencyStatus = "concluida" | "em_progresso" | "bloqueada";

export const COMPETENCIES = [
  { id: "mercado", name: "Mercado Financeiro", moduleIds: ["m2-mercado", "m2-areas"] },
  { id: "investimentos", name: "Investimentos", moduleIds: ["m2-excel"] },
  { id: "riscos", name: "Análise de Riscos", moduleIds: ["m2-balanco", "m2-dados"] },
  { id: "produtos", name: "Produtos Financeiros", moduleIds: ["m4-cpa"] },
  { id: "lideranca", name: "Liderança", moduleIds: ["m2-soft", "m2-transferiveis", "m4-entrevista"] },
] as const;

export type CompetencyId = (typeof COMPETENCIES)[number]["id"];

export function competencyProgress(moduleIds: readonly string[], modules: Module[], journey: JourneyState) {
  const ids = moduleIds.filter((id) => modules.some((m) => m.id === id));
  const done = ids.filter((id) => journey.passed.has(id)).length;
  const pct = ids.length ? Math.round((done / ids.length) * 100) : 0;
  const status: CompetencyStatus = ids.length && done === ids.length ? "concluida"
    : done > 0 || ids.some((id) => journey.unlocked.has(id)) ? "em_progresso" : "bloqueada";
  return { done, total: ids.length, pct, status };
}
