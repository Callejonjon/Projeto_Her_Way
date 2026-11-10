import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isFinanceJob } from "@/lib/engine";
import type { Area, Job, JobLevel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =============================================================================
   /api/jobs/sync — Automação híbrida de vagas
   1. Busca vagas em APIs abertas (Remotive) e feeds RSS configuráveis
   2. Filtra por relevância (somente finanças; vagas de dados/tecnologia são descartadas) e PADRONIZA no formato da tabela `jobs`
   3. Faz upsert no Supabase (dedupe por source_url) quando a SERVICE_ROLE_KEY existe
   Disparo: Vercel Cron (GET diário, vercel.json) ou botão "Sincronizar feeds" (POST).
   Escrita no banco exige CRON_SECRET (se configurado) para evitar abuso.
   ============================================================================= */

const API_SOURCES = [
  { name: "remotive", url: "https://remotive.com/api/remote-jobs?category=finance&limit=25" },
];
const RSS_FEEDS: { name: string; url: string }[] = [
  // Adicione feeds RSS de vagas aqui (ex.: portais de vagas, páginas de carreira com RSS)
  { name: "rss:weworkremotely-finance", url: "https://weworkremotely.com/categories/remote-finance-and-legal-jobs.rss" },
];

const RELEVANT = /(financ|finance|invest|asset|credit|crédito|credito|risk|risco|bank|banc|treasury|tesour|research|equity|analyst|analista|accounting|contab|fp&a|controller|quant)/i;

const AREA_RULES: [RegExp, Area][] = [
  [/(credit|crédito|credito|risk|risco|loan|underwrit)/i, "Crédito"],
  [/(m&a|investment bank|ib\b|corporate finance|capital markets)/i, "Investment Banking"],
  [/(research|equity analyst|economist)/i, "Research"],
  [/(asset|portfolio|wealth|invest|fund|private)/i, "Asset Management"],
];
const SKILL_RULES: [RegExp, string][] = [
  [/excel/i, "Excel"], [/python/i, "Python"], [/power\s?bi/i, "Power BI"], [/\bsql\b/i, "SQL"],
  [/cpa-?20|anbima/i, "CPA-20"], [/english|inglês|ingles/i, "Inglês"], [/valuation|dcf/i, "Valuation"],
  [/financial statements|balance sheet|balanço|accounting/i, "Análise de Balanço"],
];

const stripHtml = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

function normalize(raw: { title: string; company: string; description: string; url: string; location?: string; date?: string }, source: string): Job {
  const text = `${raw.title} ${raw.description}`;
  const area = AREA_RULES.find(([r]) => r.test(text))?.[1] ?? "Asset Management";
  const level: JobLevel = /intern|estágio|estagio|trainee/i.test(raw.title) ? "Estágio"
    : /senior|sênior|sr\.?|lead|manager|pleno|mid/i.test(raw.title) ? "Pleno" : "Júnior";
  return {
    id: `sync-${Buffer.from(raw.url).toString("base64url").slice(-16)}`,
    title: raw.title.trim(),
    company: raw.company?.trim() || "Empresa não informada",
    area,
    modality: "Remoto",
    level_required: level,
    skills_tags: SKILL_RULES.filter(([r]) => r.test(text)).map(([, s]) => s),
    description: stripHtml(raw.description).slice(0, 400),
    location: raw.location || "Remoto",
    source,
    source_url: raw.url,
    is_exclusive: false,
    created_at: raw.date ? new Date(raw.date).toISOString() : new Date().toISOString(),
  };
}

async function fromApis(): Promise<Job[]> {
  const out: Job[] = [];
  for (const src of API_SOURCES) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "HerWay-JobSync/1.0" } });
      if (!res.ok) continue;
      const data = (await res.json()) as { jobs?: { title: string; company_name: string; description: string; url: string; candidate_required_location?: string; publication_date?: string }[] };
      for (const j of data.jobs ?? []) {
        out.push(normalize({ title: j.title, company: j.company_name, description: j.description, url: j.url, location: j.candidate_required_location, date: j.publication_date }, src.name));
      }
    } catch (e) { console.warn(`[jobs/sync] ${src.url} falhou`, (e as Error).message); }
  }
  return out;
}

async function fromRss(): Promise<Job[]> {
  const out: Job[] = [];
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "HerWay-JobSync/1.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
        const tag = (t: string) => stripHtml(item.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "");
        const rawTitle = tag("title");
        const [company, ...rest] = rawTitle.includes(":") ? rawTitle.split(":") : ["", rawTitle];
        out.push(normalize({ title: rest.join(":") || rawTitle, company, description: tag("description"), url: tag("link"), location: tag("region"), date: tag("pubDate") }, feed.name));
      }
    } catch (e) { console.warn(`[jobs/sync] RSS ${feed.url} falhou`, (e as Error).message); }
  }
  return out;
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = !secret || req.headers.get("authorization") === `Bearer ${secret}`;

  const all = [...(await fromApis()), ...(await fromRss())];
  const unique = [...new Map(all.filter((j) => j.source_url && RELEVANT.test(`${j.title} ${j.description}`) && isFinanceJob(j)).map((j) => [j.source_url, j])).values()];

  let saved = 0;
  const db = createServiceClient();
  if (db && authorized && unique.length) {
    const rows = unique.map(({ id: _id, ...r }) => r);
    const { error, count } = await db.from("jobs").upsert(rows, { onConflict: "source_url", count: "exact" });
    if (error) console.error("[jobs/sync] upsert", error.message);
    else saved = count ?? rows.length;
  }

  return NextResponse.json({
    fetched: unique.length,
    saved,
    persisted: saved > 0,
    sources: [...new Set(unique.map((j) => j.source))],
    jobs: unique.slice(0, 30),
  });
}

export const GET = handler;
export const POST = handler;
