"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Heart, LockKeyhole, Palette, PawPrint, Save, Shirt, Sparkles, Star, Headphones, Coffee, Laptop } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import PixelAvatar, { type AvatarLook } from "./PixelAvatar";

type AvatarItem={
 id:string;category:Category;name:string;asset_key:string;unlock_type:"free"|"xp"|"profile_photo"|"course";
 required_xp:number;course_id:string|null;active:boolean;sort_order:number;
};
type Category="hair"|"outfit"|"shoes"|"accessory"|"pet"|"drink"|"device";
const DEFAULT:AvatarLook={
 skin_tone:"medium",hair_id:"hair_black_long",outfit_id:"outfit_casual",
 shoes_id:"shoes_sneakers",accessory_id:"accessory_none",
 pet_id:"pet_none",drink_id:"drink_none",device_id:"device_none",
};
const LABELS:{key:Category;name:string;icon:typeof Palette}[]=[
 {key:"hair",name:"Cabelo",icon:Palette},
 {key:"outfit",name:"Roupas",icon:Shirt},
 {key:"shoes",name:"Calçados",icon:Heart},
 {key:"accessory",name:"Acessórios",icon:Headphones},
 {key:"pet",name:"Pets",icon:PawPrint},
 {key:"drink",name:"Bebidas",icon:Coffee},
 {key:"device",name:"Tecnologia",icon:Laptop},
];
const TONES=[
 {id:"light",color:"#f3c6a5",label:"Clara"},
 {id:"warm",color:"#e9af87",label:"Quente"},
 {id:"medium",color:"#cb8a67",label:"Média"},
 {id:"tan",color:"#aa6848",label:"Bronzeada"},
 {id:"deep",color:"#814a32",label:"Escura"},
 {id:"dark",color:"#573323",label:"Escura profunda"},
];
const field=(cat:Category)=>`${cat}_id` as keyof AvatarLook;
export default function AvatarEditor(){
 const {authUser,profile}=useStore();
 const [items,setItems]=useState<AvatarItem[]>([]);
 const [inventory,setInventory]=useState<Set<string>>(new Set());
 const [look,setLook]=useState<AvatarLook>(DEFAULT);
 const [saved,setSaved]=useState<AvatarLook>(DEFAULT);
 const [category,setCategory]=useState<Category>("hair");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [isSetup,setIsSetup]=useState(false);
 const preview=useMemo(()=>JSON.stringify(look)!==JSON.stringify(saved),[look,saved]);
 const load=useCallback(async()=>{
  if(!supabase||!authUser)return;
  const client=supabase;
  setError("");
  // RPC is idempotent; grants only the free catalog items once per account.
  const init=await client.rpc("avatar_initialize");
  if(init.error){setError("Não foi possível iniciar seu avatar: "+init.error.message);setLoading(false);return;}
  const [catalog,owned,style]=await Promise.all([
   client.from("avatar_items").select("id,category,name,asset_key,unlock_type,required_xp,course_id,active,sort_order").eq("active",true).order("sort_order"),
   client.from("user_avatar_inventory").select("item_id").eq("user_id",authUser.id),
   client.from("user_avatar_config").select("skin_tone,hair_id,outfit_id,shoes_id,accessory_id,pet_id,drink_id,device_id").eq("user_id",authUser.id).maybeSingle(),
  ]);
  if(catalog.error||owned.error||style.error){
   setError(catalog.error?.message||owned.error?.message||style.error?.message||"Erro ao carregar avatar");
  }else{
   setItems((catalog.data??[]) as AvatarItem[]);
   setInventory(new Set((owned.data??[]).map(x=>x.item_id)));
   const config={...DEFAULT,...(style.data||{})} as AvatarLook;
   setLook(config);setSaved(config);setIsSetup(true);
  }
  setLoading(false);
 },[authUser]);

 useEffect(()=>{void load()},[load]);

 async function claim(item:AvatarItem){
  if(!supabase||busy||!authUser)return;
  setBusy(true);setError("");setNotice("");
  const {error}=await supabase.rpc("avatar_claim_item",{p_item:item.id});
  if(error)setError(error.message);
  else{
   setInventory(prev=>new Set([...prev,item.id]));
   setLook(prev=>({...prev,[field(item.category)]:item.id}));
   setNotice(`Você desbloqueou ${item.name}! Salve o visual para usar este item.`);
  }
  setBusy(false);
 }

 async function save(){
  if(!supabase||busy||!authUser)return;
  setBusy(true);setError("");setNotice("");
  const {error}=await supabase.rpc("avatar_save_look",{p_style:look});
  if(error)setError("Não foi possível salvar: "+error.message);
  else{setSaved({...look});setNotice("Visual salvo no seu perfil! Seus itens continuam disponíveis no inventário.");}
  setBusy(false);
 }

 const options=items.filter(item=>item.category===category);
 const accessible=options.filter(i=>inventory.has(i.id)).length;
 const itemCount=items.length;
 const progress=itemCount?Math.round((inventory.size/itemCount)*100):0;

 return <section className="card overflow-hidden" aria-labelledby="my-pixel-avatar-title">
  <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
   <div><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-pink-600"><Sparkles size={15}/> Her Way · Pixel Club</p>
     <h2 id="my-pixel-avatar-title" className="mt-1 text-xl font-extrabold text-navy-950">Meu avatar</h2>
     <p className="mt-1 text-sm text-slate-600">Crie seu personagem, personalize o look e desbloqueie itens conforme evolui na Her Way.</p>
   </div>
   <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-700">{profile.xp} XP disponíveis como requisito</span>
  </div>

  <div className="grid gap-4 px-5 pb-6 sm:px-6 lg:grid-cols-[minmax(210px,0.8fr)_minmax(0,1.2fr)]">
   <div className="space-y-3">
    <div className="relative isolate flex min-h-[306px] items-end justify-center overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-b from-[#ffe3e8] via-[#fbe7dd] to-[#f8d0ba]">
     <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/50 to-transparent"/>
     <div className="absolute left-4 top-5 h-12 w-12 rounded-full bg-[#fffcdb]/70 blur-xl"/>
     <div className="absolute right-8 top-9 grid h-20 w-14 grid-cols-2 gap-1 rounded-t-2xl border-[5px] border-[#ae7485] bg-[#c6a8d3]/50 p-1" aria-hidden="true">
       <div className="bg-[#fdf2f2]/40"/><div className="bg-[#fdf2f2]/40"/><div className="bg-[#fdf2f2]/40"/><div className="bg-[#fdf2f2]/40"/>
     </div>
     <div className="absolute bottom-12 left-5 h-12 w-6 bg-[#7a9a65] opacity-65" aria-hidden="true"/>
     <div className="absolute bottom-7 h-10 w-[90%] rounded-[50%] border border-[#d8a9a2] bg-[#f6cfb5]/90" aria-hidden="true"/>
     <div className="relative z-10 w-full max-w-[260px] select-none pb-3">
       <PixelAvatar look={look} animated className="h-auto w-full drop-shadow-lg"/>
     </div>
    </div>
    <p className="text-center text-xs text-slate-500">Prévia 2D em pixel art · animação suave somente neste espaço</p>
    <div className="rounded-xl bg-slate-50 p-4">
     <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">Coleção de itens</span><span className="text-sm font-semibold text-pink-600">{inventory.size}/{itemCount}</span></div>
     <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-pink-500 transition-all" style={{width:`${progress}%`}}/></div>
     <p className="mt-2 text-xs text-slate-500">Os pontos não são gastos. Seu XP total funciona como requisito para desbloquear peças.</p>
    </div>
    <button type="button" className="btn-primary w-full justify-center" onClick={()=>void save()} disabled={busy||loading||!isSetup||!preview}>
     <Save size={16}/>{busy?"Salvando...":preview?"Salvar meu visual":"Visual salvo"}
    </button>
   </div>

   <div className="min-w-0 space-y-4">
    <div>
     <h3 className="mb-2 text-sm font-bold">Tom de pele</h3>
     <div className="flex flex-wrap gap-2">{TONES.map(t=><button type="button" key={t.id} title={t.label} aria-label={`Tom de pele: ${t.label}`} aria-pressed={look.skin_tone===t.id}
       onClick={()=>setLook(v=>({...v,skin_tone:t.id}))} className={`grid h-9 w-9 place-items-center rounded-full border-2 transition ${look.skin_tone===t.id?"border-pink-500 ring-2 ring-pink-200":"border-white"}`} style={{background:t.color}}>
       {look.skin_tone===t.id&&<Check className="text-white drop-shadow" size={18}/>}
      </button>)}</div>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias de personalização">
     {LABELS.map(c=><button type="button" key={c.key} onClick={()=>setCategory(c.key)} aria-pressed={category===c.key}
       className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${category===c.key?"bg-pink-500 text-white":"border border-slate-200 bg-white text-navy-950 hover:border-pink-200"}`}>
       <c.icon size={15}/>{c.name}</button>)}
    </div>
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-bold">{LABELS.find(c=>c.key===category)?.name}</h3>
      <span className="text-xs text-slate-500">{accessible} de {options.length} disponíveis</span>
    </div>
    {loading?<p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Preparando seu guarda-roupa...</p>:
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
     {options.map(item=>{
       const owned=inventory.has(item.id);
       const chosen=look[field(category)]===item.id;
       const requirement=item.unlock_type==="xp"?`${item.required_xp} XP`:item.unlock_type==="profile_photo"?"Foto de perfil":item.unlock_type==="course"?"Curso concluído":"Grátis";
       const eligible=item.unlock_type==="free"||
         (item.unlock_type==="xp"&&profile.xp>=item.required_xp)||
         (item.unlock_type==="profile_photo"&&Boolean(profile.profile_photo_path));
       return <div key={item.id} className={`flex min-h-28 flex-col justify-between gap-2 rounded-xl border p-3 transition ${chosen?"border-pink-500 bg-pink-50":"border-slate-200 bg-white"}`}>
        <div className="flex items-start justify-between gap-2">
         <span className="text-xs font-semibold text-navy-950">{item.name}</span>
         {owned?<span className="shrink-0 text-green-600">{chosen?<Check size={16}/>:<Sparkles size={15}/>}</span>:<LockKeyhole className="shrink-0 text-slate-400" size={15}/>}
        </div>
        <div className="space-y-2">
          {!owned&&<p className="text-[11px] text-slate-500">{requirement}</p>}
          {owned?<button type="button" className={chosen?"w-full rounded-lg bg-pink-500 px-2 py-1.5 text-xs font-semibold text-white":"w-full rounded-lg border border-pink-300 px-2 py-1.5 text-xs font-semibold text-pink-700"}
            onClick={()=>setLook(prev=>({...prev,[field(category)]:item.id}))}>{chosen?"Equipado":"Equipar"}</button>:
            <button type="button" onClick={()=>void claim(item)} disabled={busy||!eligible}
             className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-navy-950 enabled:hover:border-pink-300 disabled:cursor-not-allowed disabled:opacity-45">
             {eligible?"Desbloquear":"Bloqueado"}</button>}
        </div>
       </div>;
     })}
    </div>}
    <p className="flex items-start gap-1.5 text-xs text-slate-500"><Star className="mt-0.5 shrink-0 text-amber-500" size={14}/> Algumas peças exigem XP ou conquistas de verdade, verificadas pelo Supabase. A estrela especial é liberada após sua primeira foto de perfil.</p>
   </div>
  </div>
  {(notice||error)&&<div className={`mx-5 mb-5 rounded-xl p-3 text-sm sm:mx-6 ${error?"bg-rose-50 text-rose-700":"bg-green-50 text-green-800"}`} role={error?"alert":"status"}>{error||notice}</div>}
 </section>;
}
