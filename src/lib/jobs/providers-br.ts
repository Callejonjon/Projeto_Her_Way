import type { Job, Area, JobLevel, Modality } from "@/lib/types";

/**
 * Brazilian opportunities from documented providers.
 *
 * EMPREGARE — official public, unauthenticated listings API.
 * ADZUNA    — official Brazil index (requires server-side ADZUNA_APP_ID / ADZUNA_APP_KEY).
 * JOOBLE    — official regional API (requires server-side JOOBLE_BR_API_KEY).
 * No candidate data or user credentials are sent to these services.
 */
const SEARCHES=["estágio financeiro","analista financeiro","investimentos","crédito"];
const RELEVANT_TITLE=/(financ|invest|asset|crédito|credito|risk|risco|bank|banc|tesour|treasury|controlador|contab|auditor|equity|research|valuation|mercado de capitais|planejamento financeiro|fp&a)/i;
const EXCLUDE_TITLE=/(desenvolvedor|developer|engenheir.*software|marketing digital|design|vendedor|vendas|corretor de im[oó]veis|motorista|suporte t[eé]cnico)/i;
const AREAS:[RegExp,Area][]=[
  [/(crédito|credito|risk|risco|loan)/i,"Crédito"],
  [/(investment banking|mercado de capitais|m&a|fus[oõ]es|aquisi[çc][aã]o|equity capital)/i,"Investment Banking"],
  [/(research|equity|an[aá]lise de empresas|economista)/i,"Research"],
  [/(asset|invest|gest[aã]o de recursos|fundos|wealth)/i,"Asset Management"],
];
const SKILLS:[RegExp,string][]=[
  [/excel/i,"Excel"],[/power\s?bi/i,"Power BI"],[/python/i,"Python"],[/\bsql\b/i,"SQL"],
  [/valuation|dcf/i,"Valuation"],[/ingl[eê]s|english/i,"Inglês"],
  [/balan[çc]o|contabilidade|demonstrac/i,"Análise de Balanço"],
];
const clean=(val:unknown)=>String(val??"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const safeDate=(raw:unknown)=>{
  if(!raw)return new Date().toISOString();
  const date=typeof raw==="number" ? new Date(raw) : new Date(String(raw));
  return Number.isNaN(date.getTime())?new Date().toISOString():date.toISOString();
};
const asHttps=(raw:unknown):string|null=>{
  try{
    const u=new URL(String(raw??""));
    return u.protocol==="https:"?u.toString():null;
  }catch{return null;}
};
function area(text:string):Area{
  return AREAS.find(([regex])=>regex.test(text))?.[1]??"Asset Management";
}
function level(text:string):JobLevel{
  if(/est[aá]gio|estagi[aá]rio|intern|trainee/i.test(text))return "Estágio";
  if(/transi[çc][aã]o/i.test(text))return "Transição";
  if(/s[eê]nior|senior|gerente|manager|coordenador|especialista|pleno/i.test(text))return "Pleno";
  return "Júnior";
}
function workMode(raw:string):Modality {
  if(/h[ií]brid|hybrid/i.test(raw))return "Híbrido";
  if(/remot|home.office|anywhere|teletrabalho/i.test(raw))return "Remoto";
  return "Presencial";
}
type Raw={
 title:unknown;company:unknown;description?:unknown;url:unknown;location?:unknown;
 date?:unknown;modality?:unknown;level?:unknown;source:string;
};
function normalizeJob(r:Raw):Job|null {
  const title=clean(r.title),company=clean(r.company);
  const url=asHttps(r.url);
  if(!url||!title||!company||!RELEVANT_TITLE.test(title)||EXCLUDE_TITLE.test(title))return null;
  const description=clean(r.description);
  const location=clean(r.location)||"Localidade não informada";
  const context=title+" "+description;
  return {
    // The database generates UUID on INSERT; this string is used only in transient API results.
    id:"feed-"+Buffer.from(url).toString("base64url").slice(-18),
    title,company,area:area(context),modality:workMode(clean(r.modality)||location),
    level_required:level(clean(r.level)||title),
    skills_tags:SKILLS.filter(([re])=>re.test(context)).map(([,skill])=>skill),
    description:description.slice(0,400),location,source:r.source,source_url:url,
    is_exclusive:false,created_at:safeDate(r.date),
  };
}
async function fetchJSON(url:string,init?:RequestInit):Promise<unknown>{
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(5500),
    headers:{"Accept":"application/json","User-Agent":"HerWay-JobBoard/1.1",...init?.headers},...init});
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}
function numberDate(v:unknown):unknown{
  if(typeof v==="number")return v<1e11?new Date(v*1000).toISOString():new Date(v).toISOString();
  return v;
}
async function fromEmpregare():Promise<Job[]>{
  const out:Job[]=[];
  for(const term of SEARCHES){
    try{
      const qs=new URLSearchParams({Query:term,Pagina:"1",ItensPagina:"30",Ordenacao:"0",DataPublicacao:"3"});
      const json=await fetchJSON("https://pdv.empregare.com/api/pt-br/vagas/buscar-novo?"+qs) as {
        sucesso?:boolean;model?:{dados?:Record<string,unknown>[]}
      };
      if(json.sucesso===false)continue;
      for(const j of json.model?.dados??[]){
        if(!j.id||j.status==="inativo")continue;
        const expiry=j.dataExpiracao?new Date(String(j.dataExpiracao)).getTime():0;
        if(expiry&&Number.isFinite(expiry)&&expiry<Date.now())continue;
        const path=clean(j.url);
        const link=path.startsWith("https://")?path:path&&path.startsWith("/")?
          "https://www.empregare.com"+path:
          path&& !path.startsWith("http")?"https://www.empregare.com/"+path:
          "https://www.empregare.com/v"+j.id;
        const cities=Array.isArray(j.cidades)?j.cidades.map(clean).filter(Boolean).join(", "):"";
        const result=normalizeJob({
          title:j.titulo,company:j.empresa,description:j.chamada,url:link,
          location:cities||"Brasil",
          modality:j.trabalhoRemotoTexto??j.trabalhoRemoto,
          level:j.nivel,
          date:j.dataCadastro||j.data||numberDate(j.timestamp),
          source:"empregare",
        });
        if(result)out.push(result);
      }
    }catch(e){console.warn("[jobs/sync] Empregare",term,(e as Error).message);}
  }
  return out;
}
async function fromAdzuna():Promise<Job[]>{
  const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
  if(!id||!key)return [];
  const out:Job[]=[];
  for(const term of ["financeiro","investimentos","estágio financeiro"]){
    try{
      const qs=new URLSearchParams({app_id:id,app_key:key,results_per_page:"50",what:term,content_type:"application/json",sort_by:"date"});
      const json=await fetchJSON("https://api.adzuna.com/v1/api/jobs/br/search/1?"+qs) as {results?:Record<string,unknown>[]};
      for(const j of json.results??[]){
        const company=j.company as {display_name?:string}|undefined;
        const location=j.location as {display_name?:string}|undefined;
        const result=normalizeJob({title:j.title,company:company?.display_name,
          description:j.description,url:j.redirect_url,location:location?.display_name,
          date:j.created,source:"adzuna"});
        if(result)out.push(result);
      }
    }catch(e){console.warn("[jobs/sync] Adzuna BR",term,(e as Error).message);}
  }
  return out;
}
async function fromJooble():Promise<Job[]>{
  const key=process.env.JOOBLE_BR_API_KEY;
  if(!key)return [];
  const out:Job[]=[];
  for(const term of ["financeiro","investimentos","estágio financeiro"]){
    try{
      const json=await fetchJSON("https://br.jooble.org/api/"+encodeURIComponent(key),{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({keywords:term,location:"Brasil",page:"1",ResultOnPage:"40"}),
      }) as {jobs?:Record<string,unknown>[]};
      for(const j of json.jobs??[]){
        const result=normalizeJob({title:j.title,company:j.company,description:j.snippet,
          url:j.link,location:j.location,date:j.updated,source:"jooble"});
        if(result)out.push(result);
      }
    }catch(e){console.warn("[jobs/sync] Jooble BR",term,(e as Error).message);}
  }
  return out;
}

// Public employer-specific boards with independently verified Brazilian vacancy pages.
const LEVER_BOARDS=[
  {slug:"zippi",name:"Zippi"},
  {slug:"tryjeeves",name:"Jeeves"},
  {slug:"caliza-financial-technologies",name:"Caliza"},
  {slug:"payjoy",name:"PayJoy"},
];
async function fromLeverBrazil():Promise<Job[]>{
  const collected:Job[]=[];
  for(const board of LEVER_BOARDS){
    try{
      const data=await fetchJSON("https://api.lever.co/v0/postings/"+board.slug+"?mode=json&limit=150");
      if(!Array.isArray(data))continue;
      for(const item of data){
        const j=item as Record<string,unknown>;
        const cats=(j.categories??{}) as Record<string,unknown>;
        const location=clean(cats.location);
        const country=clean(j.country).toUpperCase();
        // Avoid publishing vacancies reserved for other regions.
        const inBrazil=country==="BR" || /brasil|brazil|s[aã]o paulo|sao paulo|rio de janeiro|belo horizonte|curitiba|recife|porto alegre|campinas/i.test(location);
        if(!inBrazil)continue;
        const result=normalizeJob({
          title:j.text,company:board.name,description:j.descriptionPlain??j.openingPlain,
          url:j.applyUrl??j.hostedUrl,location,
          modality:j.workplaceType,
          date:typeof j.createdAt==="number"?j.createdAt:undefined,
          source:"lever",
        });
        if(result)collected.push(result);
      }
    }catch(e){console.warn("[jobs/sync] Lever",board.slug,(e as Error).message);}
  }
  return collected;
}

export async function fromBrazilianJobApis():Promise<Job[]>{
  // Avoid parallel bulk polling of the same public provider; separate sources can run in parallel.
  const results=await Promise.allSettled([fromEmpregare(),fromLeverBrazil(),fromAdzuna(),fromJooble()]);
  return results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
}

export function enabledBrazilianJobSources():string[]{
  return ["Empregare (pública)","Lever (carreiras brasileiras)",...(process.env.ADZUNA_APP_ID&&process.env.ADZUNA_APP_KEY?["Adzuna BR"]:[]),
    ...(process.env.JOOBLE_BR_API_KEY?["Jooble BR"]:[])];
}
