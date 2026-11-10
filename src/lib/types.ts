export type Track = "A" | "B";

export type Area =
  | "Asset Management"
  | "Investment Banking"
  | "Crédito"
  | "Research"
  | "Tech & Dados";

export type Modality = "Remoto" | "Híbrido" | "Presencial";
export type JobLevel = "Estágio" | "Júnior" | "Pleno" | "Transição";

export interface Profile {
  id: string;
  name: string;
  email: string;
  track_type: Track | null;
  level: number; // 1..5
  xp: number;
  interests: Area[];
  skills: string[];
  bio: string;
  avatar_url: string | null;
  linkedin_url: string;
  cv_url: string | null;
  goal: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // índice da correta
  explain: string;
}

export interface ContentSlot {
  type: "video" | "texto" | "link";
  title: string;
  url: string; // placeholder editável
}

export interface LessonAsset {
  id: string;
  module_id: string;
  asset_kind: "pdf" | "pptx" | "quiz_pdf" | "avatar_video";
  original_filename: string;
  storage_path: string | null;
  external_url: string | null;
  content_type: string | null;
}

export interface Module {
  id: string;
  stage: 2 | 4 | 5;
  track: Track | "all";
  title: string;
  description: string;
  durationMin: number;
  partner?: string; // IBooster, Modu...
  skillsGranted: string[]; // usado na % de compatibilidade das vagas
  content: ContentSlot[];
  quiz: QuizQuestion[];
  slides?: { order: number; title: string; body: string }[];
  reviewRequired?: boolean;
  assets?: LessonAsset[];
  videoSummary?: string | null;
  videoTranscript?: string | null;
  videoStatus?: string;
}

export interface ModuleProgress {
  module_id: string;
  quiz_score: number;
  completed_at: string;
}

export interface Mentor {
  id: string;
  mentor_name: string;
  mentor_role: string;
  specialty: Area;
  bio: string;
  match_tags: string[];
  tracks: Track[];
  goals: string[];
  initials: string;
  photo_url?: string;
  quote?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  area: Area;
  modality: Modality;
  level_required: JobLevel;
  skills_tags: string[];
  description: string;
  location: string;
  source: string;
  source_url: string;
  is_exclusive: boolean;
  created_at: string;
}

export interface EventItem {
  id: string;
  title: string;
  host: string;
  kind: "Networking" | "Bate-papo" | "Liga Universitária" | "Empresa Parceira";
  starts_at: string;
  location: string;
  url: string;
  tracks: Track[];
  image_url?: string;
  duration_min?: number;
}

export interface MarketPill {
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  explain: string;
}
