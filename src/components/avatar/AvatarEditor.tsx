"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {Check, Coffee, Headphones, LockKeyhole, PawPrint, Palette, Save, Shirt, Sparkles, Laptop, Image as ImageIcon, Dices} from "lucide-react";
import {supabase} from "@/lib/supabase";
import {useStore} from "@/lib/store";
import type {AvatarLook} from "./PixelAvatar";

type Category="hair"|"outfit"|"shoes"|"accessory"|"pet"|"drink"|"device"|"scene";
type Catalog={id:string;name:string;category:Exclude<Category,"scene">;unlock_type:string;required_xp:number;active:boolean};
type Asset={id:string;kind:string;item_id:string|null;label:string;storage_path:string;pos_x:number;pos_y:number;width_px:number;height_px:number;z_index:number};
const BUCKET="avatar-assets";
const DEFAULT:AvatarLook={skin_tone:"medium",hair_id:"hair_black_long",outfit_id:"outfit_casual",shoes_id:"shoes_sneakers",accessory_id:"accessory_none",pet_id:"pet_none",drink_id:"drink_none",device_id:"device_none"};
const tabs:{id:Category;name:string;icon:typeof Palette}[]=[
 {id:"hair",name:"Cabelo",icon:Palette},{id:"outfit",name:"Roupas",icon:Shirt},
 {id:"shoes",name:"Calçados",icon:Shirt},{id:"accessory",name:"Acessórios",icon:Headphones},
 {id:"pet",name:"Pets",icon:PawPrint},{id:"drink",name:"Bebidas",icon:Coffee},
 {id:"device",name:"Extras",icon:Laptop},{id:"scene",name:"Cenário",icon:ImageIcon},
];
const skin=[["light","#f3c6a5"],["warm","#e9af87"],["medium","#cb8a67"],["tan","#aa6848"],["deep","#814a32"],["dark","#573323"]];
const f=(c:Exclude<Category,"scene">)=>`${c}_id` as keyof AvatarLook;
const assetSrc=(a:Asset)=>supabase?.storage.from(BUCKET).getPublicUrl(a.storage_path).data.publicUrl??"";
const pct=(v:number,base:number)=>`${(v/base)*100}%`;
export default function AvatarEditor(){
 const {authUser,profile}=useStore();
 const [catalog,setCatalog]=useState<Catalog[]>([]);
 const [inventory,setInventory]=useState<Set<string>>(new Set());
 const [assets,setAssets]=useState<Asset[]>([]);
 const [look,setLook]=useState<AvatarLook>(DEFAULT);
 const [saved,setSaved]=useState<AvatarLook>(DEFAULT);
 const [scene,setScene]=useState("");
 const [savedScene,setSavedScene]=useState("");
 const [tab,setTab]=useState<Category>("hair");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const scenes=assets.filter(a=>a.kind==="scene");
 const activeScene=scenes.find(a=>a.id===scene)??scenes.find(a=>a.id==="scene_cozy_bedroom")??scenes[0];
 const hasBase=assets.some(a=>a.kind==="base");
 const ready=hasBase&&scenes.length>0;
 const inventoryCount=inventory.size;
 const categories=useMemo(()=>{
  const res=new Map<string,Asset[]>();
  for(const a of assets){const key=a.item_id??a.kind;res.set(key,[...(res.get(key)??[]),a]);}
  return res;
 },[assets]);
 const stage=useMemo(()=>{
  const layers:Asset[]=[];
  const body=assets.find(a=>a.kind==="base");if(body)layers.push(body);
  // Calças pertencem à composição-base das blusas; vestidos completos não precisam delas.
  if(look.outfit_id!=="outfit_premium"){
   const jeans=assets.find(a=>a.id==="jeans_blue");if(jeans)layers.push(jeans);
  }
  for(const cat of ["hair","outfit","shoes","accessory","pet","drink","device"] as const){
   const id=look[f(cat)];if(id.endsWith("_none"))continue;
   const matches=categories.get(id)??[];
   layers.push(...matches.filter(a=>a.kind===cat));
  }
  return layers.sort((a,b)=>a.z_index-b.z_index);
 },[assets,categories,look]);
 const load=useCallback(async()=>{
  if(!supabase||!authUser)return;
  const client=supabase;
  const init=await client.rpc("avatar_initialize");
  if(init.error){setError(init.error.message);setLoading(false);return;}
  const [cat,own,config,media,chosen]=await Promise.all([
   client.from("avatar_items").select("id,name,category,unlock_type,required_xp,active").eq("active",true),
   client.from("user_avatar_inventory").select("item_id").eq("user_id",authUser.id),
   client.from("user_avatar_config").select("skin_tone,hair_id,outfit_id,shoes_id,accessory_id,pet_id,drink_id,device_id").eq("user_id",authUser.id).maybeSingle(),
   client.from("avatar_visual_assets").select("id,kind,item_id,label,storage_path,pos_x,pos_y,width_px,height_px,z_index").eq("active",true),
   client.from("user_avatar_scene").select("asset_id").eq("user_id",authUser.id).maybeSingle(),
  ]);
  const failure=cat.error||own.error||config.error||media.error||chosen.error;
  if(failure){setError(failure.message);setLoading(false);return;}
  const next={...DEFAULT,...(config.data??{})} as AvatarLook;
  const approved=(media.data??[]) as Asset[];
  const validHair=approved.some(a=>a.item_id===next.hair_id&&a.kind==="hair");
  const validOutfit=approved.some(a=>a.item_id===next.outfit_id&&a.kind==="outfit");
  if(!validHair)next.hair_id="hair_black_long";
  if(!validOutfit)next.outfit_id="outfit_casual";
  setCatalog((cat.data??[]) as Catalog[]);setInventory(new Set((own.data??[]).map(v=>v.item_id)));
  setLook(next);setSaved({...DEFAULT,...(config.data??{})} as AvatarLook);setAssets(approved);
  const availableScene=approved.find(a=>a.id===chosen.data?.asset_id&&a.kind==="scene");
  const defaultScene=approved.find(a=>a.id==="scene_cozy_bedroom")??approved.find(a=>a.kind==="scene");
  setScene(availableScene?.id??defaultScene?.id??"");setSavedScene(chosen.data?.asset_id??"");
  setLoading(false);
 },[authUser]);
 useEffect(()=>{void load()},[load]);

 async function claim(item:Catalog){
  if(!supabase||busy)return;setBusy(true);setError("");setNotice("");
  const r=await supabase.rpc("avatar_claim_item",{p_item:item.id});
  if(r.error)setError(r.error.message);
  else {setInventory(i=>new Set([...i,item.id]));setLook(p=>({...p,[f(item.category)]:item.id}));setNotice(item.name+" desbloqueado! Salve seu visual.");}
  setBusy(false);
 }
 async function save(){
  if(!supabase||busy)return;setBusy(true);setError("");setNotice("");
  const v=await supabase.rpc("avatar_save_look",{p_style:look});
  if(v.error){setError(v.error.message);setBusy(false);return;}
  if(scene&&scene!==savedScene){const r=await supabase.rpc("avatar_select_scene",{p_asset_id:scene});if(r.error){setError("Visual salvo, mas o cenário não pôde ser salvo: "+r.error.message);setBusy(false);return;}}
  setSaved({...look});setSavedScene(scene);setNotice("Seu novo visual foi salvo!");setBusy(false);
 }
 function randomize(){
  const next={...look};
  for(const t of tabs){
   if(t.id==="scene")continue;
   const available=catalog.filter(i=>i.category===t.id&&inventory.has(i.id)&&categories.has(i.id));
   if(available.length)next[f(t.id)]=available[Math.floor(Math.random()*available.length)].id;
  }
  setLook(next);
 }
 const dirty=JSON.stringify(saved)!==JSON.stringify(look)||scene!==savedScene;
 const options=tab==="scene"?scenes:catalog.filter(i=>i.category===tab&&categories.has(i.id));
 const total=catalog.length;
 const progress=total?Math.round(inventoryCount/total*100):0;
 return <section className="space-y-5" aria-labelledby="avatar-title">
  <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-[#fff7fb] to-white p-5 sm:p-7">
   <div className="mb-5"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-600"><Sparkles size={16}/> Her Way · Pixel Club</p>
    <h2 id="avatar-title" className="mt-1 text-2xl font-extrabold text-navy-950">Personalize seu Avatar</h2>
    <p className="mt-1 text-sm text-slate-600">Monte seu visual com as peças já conferidas. Outras opções serão adicionadas após revisão de encaixe.</p>
   </div>
   <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    <div className="space-y-3">
     <div className="relative aspect-[6/5] w-full overflow-hidden rounded-3xl border border-[#efbfd7] bg-gradient-to-b from-[#f3d7ea] to-[#f4d2bc] shadow-sm">
      {ready&&activeScene?<img src={assetSrc(activeScene)} alt="Cenário selecionado" className="absolute inset-0 h-full w-full object-cover" style={{imageRendering:"pixelated"}}/>:null}
      {ready&&stage.map(a=><img key={a.id} src={assetSrc(a)} alt="" className="absolute pointer-events-none select-none" draggable={false}
       style={{left:pct(a.pos_x,600),top:pct(a.pos_y,500),width:pct(a.width_px,600),height:pct(a.height_px,500),zIndex:a.z_index,objectFit:"contain",imageRendering:"pixelated"}}/>)}
      {!ready&&<div className="absolute inset-0 grid place-items-center p-8 text-center">
        <div><Palette className="mx-auto mb-3 text-pink-500" size={38}/><p className="font-bold text-navy-950">Nova personagem em preparação</p>
        <p className="mt-2 text-sm text-slate-700">Estamos ajustando as peças reais de pixel art para que cabelo, roupas e cenário se encaixem corretamente.</p></div>
       </div>}
     </div>
     <div className="grid grid-cols-2 gap-2">
      <button className="btn-primary justify-center" disabled={busy||loading||!dirty||!ready} onClick={()=>void save()}><Save size={16}/> Salvar visual</button>
      <button className="btn-secondary justify-center" disabled={!ready} onClick={randomize}><Dices size={16}/> Visual aleatório</button>
     </div>
     <div className="rounded-2xl border border-pink-100 bg-white p-4"><div className="flex items-center justify-between text-sm"><strong>Progresso no Avatar</strong><span className="font-bold text-pink-600">{inventoryCount}/{total} · {progress}%</span></div>
       <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-pink-500" style={{width:progress+"%"}}/></div>
       <p className="mt-2 text-xs text-slate-600">Seu XP nunca é gasto para desbloquear itens.</p>
     </div>
    </div>
    <div className="min-w-0 rounded-2xl border border-pink-100 bg-white p-4 sm:p-5">
     <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Personalização do avatar">
       {tabs.filter(t=>t.id==="scene"||assets.some(a=>a.kind===t.id&&a.item_id)).map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)}
       className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition ${tab===t.id?"border-pink-500 bg-pink-500 text-white":"border-slate-200 text-navy-950 hover:border-pink-200"}`}>
       <t.icon size={15}/>{t.name}</button>)}
     </div>
     <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{tabs.find(t=>t.id===tab)?.name}</h3><span className="text-xs text-slate-500">{profile.xp} XP</span></div>
     {!ready?<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">O editor de peças ficará disponível assim que as imagens forem alinhadas e aprovadas pela administração. Os XP e itens já desbloqueados estão preservados.</p>:
     <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map(item=>{
       const isScene=tab==="scene";
       const a=isScene?item as Asset:categories.get((item as Catalog).id)?.[0];
       const id=item.id;
       const owned=isScene||inventory.has(id);
       const selected=isScene?scene===id:look[f(tab as Exclude<Category,"scene">)]===id;
       const req=isScene?"Cenário disponível":(item as Catalog).unlock_type==="profile_photo"?"Primeira foto de perfil":`${(item as Catalog).required_xp} XP`;
       const eligible=isScene||(item as Catalog).unlock_type==="free"||
        ((item as Catalog).unlock_type==="xp"&&profile.xp>=(item as Catalog).required_xp)||
        ((item as Catalog).unlock_type==="profile_photo"&&Boolean(profile.profile_photo_path));
       return <div key={id} className={`flex flex-col overflow-hidden rounded-2xl border p-2 ${selected?"border-pink-500 bg-pink-50":"border-slate-200"}`}>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f9f2f5]">
         {a&&<img src={assetSrc(a)} alt="" className="h-full w-full object-contain p-2" style={{imageRendering:"pixelated"}}/>}
         {!owned&&<div className="absolute right-2 bottom-2 rounded-full bg-white/90 p-1"><LockKeyhole size={14}/></div>}
        </div>
        <div className="min-h-11 py-2 text-xs font-semibold">{isScene?(item as Asset).label:(item as Catalog).name}</div>
        {owned?<button className={selected?"rounded-lg bg-pink-500 p-2 text-xs font-semibold text-white":"rounded-lg border border-pink-300 p-2 text-xs font-semibold"} onClick={()=>{
          if(isScene)setScene(id);else setLook(v=>({...v,[f(tab as Exclude<Category,"scene">)]:id}));
        }}>{selected?<><Check size={13} className="inline"/> Selecionado</>:"Escolher"}</button>:
         <button disabled={busy||!eligible} onClick={()=>void claim(item as Catalog)} className="rounded-lg border p-2 text-xs disabled:opacity-40">{eligible?"Desbloquear":req}</button>}
       </div>;
      })}
     </div>}
     {ready&&options.length===0&&<p className="text-sm text-slate-500">Ainda não há itens aprovados nesta categoria.</p>}
     {tab==="hair"&&<p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">As variações de tom de pele voltarão quando todas as bases correspondentes estiverem alinhadas e disponíveis. A seleção já salva no perfil permanece preservada.</p>}
    </div>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
  </div>
 </section>;
}
