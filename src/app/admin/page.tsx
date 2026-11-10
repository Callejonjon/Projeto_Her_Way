"use client";
import { BarChart3, Briefcase, GraduationCap, HeartHandshake, Lock, TrendingUp, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { ADMIN_STATS as S } from "@/lib/mock-data";
import { PageHeader, Stat } from "@/components/ui";

/* ---------- Gráficos leves (SVG/CSS puro, sem dependências) ---------- */
function Donut({ a, b }: { a: number; b: number }) {
  const pa = (a / (a + b)) * 100;
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0 rounded-full" role="img" aria-label={`Trilha A ${a}, Trilha B ${b}`}
        style={{ background: `conic-gradient(#1E3A8A 0 ${pa}%, #EC4899 ${pa}% 100%)` }}>
        <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center">
          <div><p className="text-2xl font-extrabold">{a + b}</p><p className="text-[11px] text-slate-500">inscritas</p></div>
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-navy-800" />Trilha A · Universitárias<p className="ml-5 font-bold">{a} ({Math.round(pa)}%)</p></li>
        <li><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-pink-500" />Trilha B · Transição<p className="ml-5 font-bold">{b} ({100 - Math.round(pa)}%)</p></li>
      </ul>
    </div>
  );
}

function HBars({ data, color = "bg-navy-800", suffix = "" }: { data: { label: string; value: number }[]; color?: string; suffix?: string }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">{d.label}</span><span className="font-bold">{d.value}{suffix}{i > 0 && !suffix && <span className="ml-1 font-normal text-slate-400">({Math.round((d.value / data[0].value) * 100)}%)</span>}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function LineChart({ data }: { data: { month: string; A: number; B: number }[] }) {
  const W = 520, H = 200, P = 30, min = 50, max = 90;
  const x = (i: number) => P + (i * (W - 2 * P)) / (data.length - 1);
  const y = (v: number) => H - P - ((v - min) / (max - min)) * (H - 2 * P);
  const path = (k: "A" | "B") => data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d[k])}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução da nota média nos quizzes por trilha">
      {[60, 70, 80, 90].map((v) => (
        <g key={v}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v === 70 ? "0" : "4 4"} />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#94a3b8">{v}</text></g>
      ))}
      <text x={W - P} y={y(70) - 4} fontSize="9" fill="#F59E0B" textAnchor="end">nota mínima</text>
      {(["A", "B"] as const).map((k) => (
        <g key={k}>
          <path d={path(k)} fill="none" stroke={k === "A" ? "#1E3A8A" : "#EC4899"} strokeWidth={3} strokeLinecap="round" />
          {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d[k])} r={4} fill="white" stroke={k === "A" ? "#1E3A8A" : "#EC4899"} strokeWidth={2} />)}
        </g>
      ))}
      {data.map((d, i) => <text key={d.month} x={x(i)} y={H - 8} fontSize="11" fill="#64748b" textAnchor="middle">{d.month}</text>)}
    </svg>
  );
}

export default function Admin() {
  const { view, setView, isAdmin } = useStore();

  if (!isAdmin || view !== "admin") {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <Lock className="mx-auto text-pink-500" size={40} />
        <h1 className="mt-4 text-xl font-extrabold">Área restrita</h1>
        <p className="mt-2 text-sm text-slate-600">O Painel de Impacto é exclusivo para a gestão do programa e banca avaliadora. Com Supabase ativo, o acesso é validado pela flag <code>is_admin</code>.</p>
        {isAdmin && <button className="btn-primary mt-6" onClick={() => setView("admin")}>Entrar na administração</button>}
      </div>
    );
  }

  const total = S.inscritas.A + S.inscritas.B;
  const concluded = S.stageFunnel.at(-1)!.value;
  const hires = S.employability.at(-1)!.value;
  const last = S.quizEvolution.at(-1)!, first = S.quizEvolution[0];
  const evo = Math.round(((last.A + last.B) / 2 - (first.A + first.B) / 2));

  return (
    <>
      <PageHeader eyebrow="Painel de Impacto (Admin)" title="O programa está funcionando?"
        subtitle="KPIs executivos da jornada: inscrição → formação → mentoria → empregabilidade. Dados de demonstração (substituídos pela view vw_impact_kpis no Supabase)." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total de inscritas" value={total} hint={`A: ${S.inscritas.A} · B: ${S.inscritas.B}`} icon={<Users size={18} className="text-navy-800" />} />
        <Stat label="Taxa de conclusão" value={`${Math.round((concluded / total) * 100)}%`} hint={`${concluded} concluíram as 5 etapas`} icon={<GraduationCap size={18} className="text-solar-500" />} />
        <Stat label="Participação em mentorias" value={`${S.mentorship.participacao}%`} hint={`${S.mentorship.pareamentos} pareamentos · NPS ${S.mentorship.nps}`} icon={<HeartHandshake size={18} className="text-pink-500" />} />
        <Stat label="Contratações/promoções" value={hires} hint={`${Math.round((hires / S.employability[0].value) * 100)}% das candidaturas`} icon={<Briefcase size={18} className="text-navy-800" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold"><Users size={18} className="text-pink-500" /> Inscritas por trilha</h2>
          <Donut a={S.inscritas.A} b={S.inscritas.B} />
        </section>

        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-pink-500" /> Funil de conclusão das etapas</h2>
          <HBars data={S.stageFunnel.map((s) => ({ label: s.stage, value: s.value }))} color="bg-gradient-to-r from-navy-800 to-navy-700" />
        </section>

        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><TrendingUp size={18} className="text-pink-500" /> Evolução média nos quizzes</h2>
            <span className="chip bg-solar-400/25 font-bold text-amber-800">+{evo} pts em 6 meses</span>
          </div>
          <LineChart data={S.quizEvolution} />
          <div className="mt-2 flex gap-4 text-xs text-slate-600"><span><span className="mr-1 inline-block h-2 w-4 rounded bg-navy-800" />Trilha A</span><span><span className="mr-1 inline-block h-2 w-4 rounded bg-pink-500" />Trilha B</span></div>
        </section>

        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold"><Briefcase size={18} className="text-pink-500" /> Funil de empregabilidade</h2>
          <HBars data={S.employability} color="bg-gradient-to-r from-pink-500 to-pink-600" />
        </section>

        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold"><HeartHandshake size={18} className="text-pink-500" /> Mentorias</h2>
          <div className="grid grid-cols-2 gap-3">
            {[["Pareamentos realizados", S.mentorship.pareamentos], ["Mentorias ativas", S.mentorship.ativas], ["Sessões realizadas", S.mentorship.sessoesRealizadas], ["NPS das mentoradas", S.mentorship.nps]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 font-bold"><BarChart3 size={18} className="text-pink-500" /> Contratações por área</h2>
          <HBars data={S.byArea.map((a) => ({ label: a.area, value: a.value }))} color="bg-gradient-to-r from-solar-500 to-solar-400" suffix="" />
        </section>
      </div>
    </>
  );
}
