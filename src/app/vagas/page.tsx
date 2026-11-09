"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Check, Filter, GraduationCap, MapPin, Plus, RefreshCw, Search, Send, Sparkles, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { JOB_AREAS, SKILL_TAGS } from "@/lib/mock-data";
import { jobCompatibility, moduleForSkill } from "@/lib/engine";
import { timeAgo } from "@/lib/format";
import { MatchBadge, PageHeader } from "@/components/ui";
import type { Area, Job, JobLevel, Modality } from "@/lib/types";

const TRILHAS = { Todas: [] as JobLevel[], "Estágio": ["Estágio"] as JobLevel[], "Transição/Júnior/Pleno": ["Transição", "Júnior", "Pleno"] as JobLevel[] };
const MODALITIES: Modality[] = ["Remoto", "Híbrido", "Presencial"];

function sourceLabel(s: string) {
  if (s === "manual") return { label: "Curadoria", cls: "bg-pink-100 text-pink-600" };
  if (s.startsWith("rss")) return { label: "RSS", cls: "bg-slate-100 text-slate-600" };
  return { label: "API aberta", cls: "bg-slate-100 text-slate-600" };
}

export default function Vagas() {
  const { jobs, skills, profile, appliedJobs, applyJob, view, mergeJobs, modules } = useStore();
  const [q, setQ] = useState("");
  const [trilha, setTrilha] = useState<keyof typeof TRILHAS>("Todas");
  const [areas, setAreas] = useState<Area[]>([]);
  const [mods, setMods] = useState<Modality[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sync, setSync] = useState<{ loading: boolean; msg?: string }>({ loading: false });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggle = <T,>(l: T[], v: T, set: (x: T[]) => void) => set(l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return jobs
      .filter((j) => !term || `${j.title} ${j.company} ${j.description} ${j.skills_tags.join(" ")}`.toLowerCase().includes(term))
      .filter((j) => !TRILHAS[trilha].length || TRILHAS[trilha].includes(j.level_required))
      .filter((j) => !areas.length || areas.includes(j.area))
      .filter((j) => !mods.length || mods.includes(j.modality))
      .filter((j) => !tags.length || tags.every((t) => j.skills_tags.includes(t)))
      .map((j) => ({ job: j, m: jobCompatibility(j, skills, profile.track_type) }))
      .sort((a, b) => b.m.pct - a.m.pct);
  }, [jobs, q, trilha, areas, mods, tags, skills, profile.track_type]);

  async function runSync() {
    setSync({ loading: true });
    try {
      const res = await fetch("/api/jobs/sync", { method: "POST" });
      const data = await res.json();
      if (data.jobs?.length) mergeJobs(data.jobs);
      setSync({ loading: false, msg: `${data.fetched ?? 0} vagas lidas de ${data.sources?.join(", ") || "feeds"} · ${data.saved ? `${data.saved} salvas no Supabase` : "modo demo (não persistido no banco)"}` });
    } catch {
      setSync({ loading: false, msg: "Não foi possível sincronizar agora." });
    }
  }

  const activeFilters = areas.length + mods.length + tags.length + (trilha !== "Todas" ? 1 : 0);

  return (
    <>
      <PageHeader eyebrow="Mural de Vagas" title={view === "admin" ? "Curadoria de vagas" : "Oportunidades para você"}
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={runSync} disabled={sync.loading}><RefreshCw size={16} className={sync.loading ? "animate-spin" : ""} /> Sincronizar feeds</button>
            <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Cadastrar vaga manual / importar</button>
          </div>
        } />
      {sync.msg && <p className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600" aria-live="polite">{sync.msg}</p>}

      {/* Busca */}
      <div className="card mb-4 flex items-center gap-2 p-2">
        <Search size={18} className="ml-2 text-slate-400" />
        <label htmlFor="busca" className="sr-only">Buscar vagas</label>
        <input id="busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cargo, empresa ou habilidade (ex.: Python, Asset, CPA-20)..."
          className="w-full bg-transparent px-2 py-2 text-sm outline-none" />
        <button className="btn-secondary lg:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <Filter size={16} /> {activeFilters || ""}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filtros */}
        <aside className={`card h-fit space-y-5 p-5 ${filtersOpen ? "block" : "hidden"} lg:block`} aria-label="Filtros">
          <FilterGroup title="Trilha">
            {(Object.keys(TRILHAS) as (keyof typeof TRILHAS)[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm"><input type="radio" name="trilha" className="accent-pink-500" checked={trilha === t} onChange={() => setTrilha(t)} /> {t}</label>
            ))}
          </FilterGroup>
          <FilterGroup title="Área">
            {JOB_AREAS.map((a) => <Check2 key={a} label={a} checked={areas.includes(a)} onChange={() => toggle(areas, a, setAreas)} />)}
          </FilterGroup>
          <FilterGroup title="Modalidade">
            {MODALITIES.map((m) => <Check2 key={m} label={m} checked={mods.includes(m)} onChange={() => toggle(mods, m, setMods)} />)}
          </FilterGroup>
          <FilterGroup title="Habilidades">
            <div className="flex flex-wrap gap-1.5">
              {["Excel", "Python", "Power BI", "CPA-20", "Inglês", "SQL", "Valuation"].map((t) => (
                <button key={t} onClick={() => toggle(tags, t, setTags)} aria-pressed={tags.includes(t)}
                  className={`chip border ${tags.includes(t) ? "border-pink-500 bg-pink-500 text-white" : "border-slate-200 text-slate-600 hover:border-pink-300"}`}>{t}</button>
              ))}
            </div>
          </FilterGroup>
          {activeFilters > 0 && (
            <button className="text-sm font-semibold text-pink-600 hover:underline" onClick={() => { setAreas([]); setMods([]); setTags([]); setTrilha("Todas"); }}>Limpar filtros</button>
          )}
        </aside>

        {/* Resultados */}
        <section aria-live="polite">
          <p className="mb-3 text-sm text-slate-500">{results.length} vaga(s) · ordenadas por compatibilidade</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {results.map(({ job, m }) => {
              const applied = appliedJobs.includes(job.id);
              const src = sourceLabel(job.source);
              const learn = m.missing.map((s) => ({ s, mod: moduleForSkill(modules, s) })).find((x) => x.mod);
              return (
                <article key={job.id} className="card flex flex-col p-5 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-1">
                        {job.is_exclusive && <span className="chip bg-navy-950 text-white"><Sparkles size={10} /> Exclusiva parceira</span>}
                        <span className={`chip ${src.cls}`}>{src.label}</span>
                        <span className="chip bg-slate-100 text-slate-600">{job.level_required}</span>
                      </div>
                      <h3 className="font-bold leading-snug">{job.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Building2 size={12} /> {job.company}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location} · {job.modality}</span>
                      </p>
                    </div>
                    <MatchBadge pct={m.pct} label="compatível" />
                  </div>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-600">{job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills_tags.map((s) => (
                      <span key={s} className={`chip ${m.have.includes(s) ? "bg-solar-400/25 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                        {m.have.includes(s) && <Check size={10} />} {s}
                      </span>
                    ))}
                  </div>
                  {learn?.mod && (
                    <Link href={`/cursos?m=${learn.mod.id}`} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-navy-800 hover:underline">
                      <GraduationCap size={14} /> Aumente seu match: aprenda {learn.s} em &quot;{learn.mod.title}&quot;
                    </Link>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{timeAgo(job.created_at)} · {job.area}</span>
                    <button className={applied ? "btn-secondary" : "btn-primary"} disabled={applied} onClick={() => applyJob(job.id, m.pct)}>
                      {applied ? <><Check size={16} /> Candidatura enviada</> : <><Send size={16} /> Candidatar-se</>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!results.length && <p className="card p-10 text-center text-sm text-slate-500">Nenhuma vaga com esses filtros. Tente remover algum. 💗</p>}
        </section>
      </div>

      {showForm && <JobForm onClose={() => setShowForm(false)} />}
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-800">{title}</legend><div className="space-y-1.5">{children}</div></fieldset>;
}
function Check2({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-pink-500" checked={checked} onChange={onChange} /> {label}</label>;
}

/* ------------------- Cadastro manual + importação em lote ------------------- */
function JobForm({ onClose }: { onClose: () => void }) {
  const { addJob, mergeJobs } = useStore();
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const [f, setF] = useState({ title: "", company: "", area: JOB_AREAS[0] as Area, modality: "Híbrido" as Modality, level_required: "Estágio" as JobLevel,
    location: "", description: "", source_url: "", skills_tags: [] as string[], is_exclusive: true });
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!f.title.trim() || !f.company.trim()) return setErr("Título e empresa são obrigatórios.");
    addJob({ ...f, id: `job-${Date.now()}`, source: "manual", source_url: f.source_url || "#", created_at: new Date().toISOString() });
    onClose();
  }

  /** Aceita JSON (array) ou CSV com cabeçalho: title,company,area,modality,level_required,skills_tags(;),location,source_url */
  function importBatch() {
    try {
      let rows: Partial<Job>[];
      if (raw.trim().startsWith("[")) rows = JSON.parse(raw);
      else {
        const [head, ...lines] = raw.trim().split(/\r?\n/);
        const cols = head.split(",").map((c) => c.trim());
        rows = lines.map((l) => {
          const vals = l.split(",");
          const o: Record<string, unknown> = Object.fromEntries(cols.map((c, i) => [c, vals[i]?.trim() ?? ""]));
          o.skills_tags = String(o.skills_tags ?? "").split(";").filter(Boolean);
          return o as Partial<Job>;
        });
      }
      const jobs: Job[] = rows.filter((r) => r.title && r.company).map((r, i) => ({
        id: `imp-${Date.now()}-${i}`, title: r.title!, company: r.company!, area: (r.area as Area) ?? "Asset Management",
        modality: (r.modality as Modality) ?? "Híbrido", level_required: (r.level_required as JobLevel) ?? "Júnior",
        skills_tags: r.skills_tags ?? [], description: r.description ?? "", location: r.location ?? "", source: "manual",
        source_url: r.source_url || `#imp-${i}`, is_exclusive: true, created_at: new Date().toISOString(),
      }));
      if (!jobs.length) return setErr("Nenhuma vaga válida encontrada (title e company são obrigatórios).");
      mergeJobs(jobs);
      onClose();
    } catch {
      setErr("Formato inválido. Use um array JSON ou CSV com cabeçalho.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="jf-title" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl animate-fade-in overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="jf-title" className="text-xl font-extrabold">Nova vaga de parceira</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold" role="tablist">
          {(["manual", "import"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg py-2 ${tab === t ? "bg-white shadow" : "text-slate-500"}`}>
              {t === "manual" ? "Cadastro manual" : "Importar (JSON/CSV)"}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label" htmlFor="jt">Título da vaga</label><input id="jt" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
            <div><label className="label" htmlFor="jc">Empresa</label><input id="jc" className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
            <div><label className="label" htmlFor="jl">Localização</label><input id="jl" className="input" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
            <div><label className="label" htmlFor="ja">Área</label><select id="ja" className="input" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as Area })}>{JOB_AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
            <div><label className="label" htmlFor="jm">Modalidade</label><select id="jm" className="input" value={f.modality} onChange={(e) => setF({ ...f, modality: e.target.value as Modality })}>{MODALITIES.map((m) => <option key={m}>{m}</option>)}</select></div>
            <div><label className="label" htmlFor="jn">Nível</label><select id="jn" className="input" value={f.level_required} onChange={(e) => setF({ ...f, level_required: e.target.value as JobLevel })}>{["Estágio", "Júnior", "Pleno", "Transição"].map((l) => <option key={l}>{l}</option>)}</select></div>
            <div><label className="label" htmlFor="ju">Link da vaga</label><input id="ju" type="url" className="input" value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} /></div>
            <fieldset className="sm:col-span-2"><legend className="label">Habilidades exigidas</legend>
              <div className="flex flex-wrap gap-1.5">{SKILL_TAGS.map((s) => (
                <button type="button" key={s} aria-pressed={f.skills_tags.includes(s)} onClick={() => setF({ ...f, skills_tags: f.skills_tags.includes(s) ? f.skills_tags.filter((x) => x !== s) : [...f.skills_tags, s] })}
                  className={`chip border ${f.skills_tags.includes(s) ? "border-pink-500 bg-pink-500 text-white" : "border-slate-200 text-slate-600"}`}>{s}</button>
              ))}</div>
            </fieldset>
            <div className="sm:col-span-2"><label className="label" htmlFor="jd">Descrição do perfil</label><textarea id="jd" rows={3} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-pink-500" checked={f.is_exclusive} onChange={(e) => setF({ ...f, is_exclusive: e.target.checked })} /> Vaga exclusiva de empresa parceira</label>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="raw">Cole um array JSON ou CSV</label>
            <textarea id="raw" rows={8} className="input font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)}
              placeholder={"title,company,area,modality,level_required,skills_tags,location,source_url\nEstágio em Tesouraria,Banco Parceiro,Crédito,Híbrido,Estágio,Excel;Inglês,São Paulo,https://..."} />
          </div>
        )}

        {err && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={tab === "manual" ? submit : importBatch}>{tab === "manual" ? "Publicar vaga" : "Importar vagas"}</button>
        </div>
      </div>
    </div>
  );
}
