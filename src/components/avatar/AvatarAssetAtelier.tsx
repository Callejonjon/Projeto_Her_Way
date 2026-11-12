"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import JSZip from "jszip";
import {Archive, CheckCircle2, Image as ImageIcon, Layers, Save, ShieldCheck, Upload, XCircle} from "lucide-react";
import {supabase} from "@/lib/supabase";

type Kind="base"|"hair"|"outfit"|"shoes"|"accessory"|"pet"|"drink"|"device"|"scene"|"furniture";
type Visual={
 id:string;kind:Kind;item_id:string|null;label:string;storage_path:string;
 pos_x:number;pos_y:number;width_px:number;height_px:number;z_index:number;active:boolean;
};
type Manifest={
 pack_version:2;
 images:Record<string,{category:string;path:string;size:[number,number]}>;
};
const BUCKET="avatar-assets";
const SCENE_W=600,SCENE_H=500;
const keyMap:Record<string,string>={
 hair_curly_dark:"hair_curly",hair_black_bun:"hair_bun",hair_brown_long:"hair_black_long",
 sweater_striped:"outfit_comfy",dress_pink:"outfit_premium",shirt_blue:"outfit_casual",
 sneakers:"shoes_sneakers",glasses_clear:"accessory_glasses",headphones_navy:"accessory_headphones",
 cat_white:"pet_cat",cat_black:"pet_cat",dog_brown:"pet_dog",coffee:"drink_coffee",
 matcha:"drink_matcha",laptop:"device_laptop"
};
const kindMap:Record<string,Kind>={
 base:"base",hair:"hair",outfit:"outfit",shoes:"shoes",accessory:"accessory",
 pets:"pet",drink:"drink",device:"device",scenes:"scene",furniture:"furniture"
};
function positions(kind:Kind){
 switch(kind){
  case "scene":return [0,0,SCENE_W,SCENE_H,0];
  case "base":return [250,158,128,280,10];
  case "hair":return [246,175,136,112,35];
  case "outfit":return [264,317,100,109,25];
  case "shoes":return [274,427,82,46,28];
  case "accessory":return [263,203,102,76,40];
  case "pet":return [400,384,125,108,30];
  case "drink":return [366,306,72,80,38];
  case "device":return [380,308,118,87,31];
  default:return [450,313,120,130,8];
 }
}
function imageUrl(path:string){
 return supabase?.storage.from(BUCKET).getPublicUrl(path).data.publicUrl??"";
}
function safePath(input:string){
 return /^[a-z0-9_/-]+\.(png|webp)$/.test(input)&&!input.includes("..");
}
export default function AvatarAssetAtelier(){
 const [all,setAll]=useState<Visual[]>([]);
 const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [progress,setProgress]=useState("");
 const [selectedId,setSelectedId]=useState("");
 const [activeScene,setActiveScene]=useState("");
 const [showOnlyApproved,setShowOnlyApproved]=useState(false);
 const [changes,setChanges]=useState<Partial<Visual>>({});
 const [layerSelection,setLayerSelection]=useState<Record<string,string>>({});
 const selected=all.find(a=>a.id===selectedId);
 const stage=useMemo(()=>all.filter(a=>(!showOnlyApproved||a.active)&&a.kind!=="scene"),[all,showOnlyApproved]);
 // Never auto-equip a random asset of every category: incompatible sprites look broken.
 const previewLayers=useMemo(()=>{
  return Object.values(layerSelection).map(id=>stage.find(v=>v.id===id))
   .filter((x):x is Visual=>Boolean(x))
   .map(v=>v.id===selectedId?{...v,...changes}:v)
   .sort((a,b)=>a.z_index-b.z_index);
 },[stage,layerSelection,selectedId,changes]);
 const fetchAll=useCallback(async()=>{
  if(!supabase)return;
  const {data,error}=await supabase.from("avatar_visual_assets").select("*").order("kind").order("id").limit(300);
  if(error){setError(error.message);return;}
  setAll((data??[]) as Visual[]);
 },[]);
 useEffect(()=>{void fetchAll()},[fetchAll]);
 useEffect(()=>{
  if(!selectedId&&all.length)setSelectedId(all.find(a=>a.kind==="base")?.id||all[0].id);
  if(!layerSelection.base&&all.some(a=>a.kind==="base"))
   setLayerSelection(v=>({...v,base:all.find(a=>a.kind==="base")!.id}));
  if(!activeScene&&all.some(a=>a.kind==="scene"))
   setActiveScene(all.find(a=>a.kind==="scene")?.id??"");
 },[all,selectedId,activeScene]);

 async function uploadZip(file?:File){
  if(!supabase||!file||uploading)return;
  if(file.size>30*1024*1024){setError("O ZIP deve ter até 30 MB.");return;}
  setUploading(true);setError("");setMessage("");
  try{
   const zip=await JSZip.loadAsync(file);
   const manifestEntry=zip.file("manifest.json");
   if(!manifestEntry)throw new Error("ZIP sem manifest.json. Utilize o pacote preparado para a Her Way.");
   const manifest=JSON.parse(await manifestEntry.async("string")) as Manifest;
   if(manifest.pack_version!==2||Array.isArray(manifest.images)||!manifest.images||Object.keys(manifest.images).length>120)
    throw new Error("Pacote antigo ou inválido. Apenas novos sprites padronizados v2 podem ser importados.");
   let success=0;
   for(const [id,item] of Object.entries(manifest.images)){
    const kind=kindMap[item.category];
    if(!kind||!safePath(item.path)||!id.match(/^[a-z0-9_]{3,70}$/))continue;
    const entry=zip.file(item.path);
    if(!entry)continue;
    const blob=await entry.async("blob");
    const ext=item.path.endsWith(".webp")?"webp":"png";
    if(blob.size>4*1024*1024)throw new Error("Arquivo acima de 4 MB: "+item.path);
    if(kind!=="scene"&&(ext!=="png"||item.size?.[0]!==256||item.size?.[1]!==256))throw new Error("A peça "+id+" precisa ser PNG 256 x 256.");
    const storagePath="v2/"+id+"."+ext;
    setProgress(`Importando ${success+1}/${Object.keys(manifest.images).length}: ${id}`);
    const binary=await entry.async("uint8array");
    const upload=await supabase.storage.from(BUCKET).upload(storagePath,binary,{
     contentType:ext==="webp"?"image/webp":"image/png",upsert:true
    });
    if(upload.error)throw new Error(`Falha no arquivo ${id}: ${upload.error.message}`);
    const [pos_x,pos_y,width_px,height_px,z_index]=positions(kind);
    const record={
      id,kind,item_id:keyMap[id]??null,label:id.replace(/_/g," "),
      storage_path:storagePath,pos_x,pos_y,width_px,height_px,z_index,
      active:false,pack_version:2,review_state:"draft",canvas_width:item.size[0],canvas_height:item.size[1],updated_at:new Date().toISOString(),
    };
    const save=await supabase.from("avatar_visual_assets").upsert(record,{onConflict:"id"});
    if(save.error)throw new Error(`Falha ao registrar ${id}: ${save.error.message}`);
    success++;
   }
   setMessage(`${success} arquivos enviados e cadastrados como rascunho. Ajuste o alinhamento e publique apenas os que ficarem corretos.`);
   await fetchAll();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao importar arquivos.");}
  finally{setProgress("");setUploading(false);}
 }
 async function saveSelected(){
  if(!supabase||!selected||busy)return;
  setBusy(true);setError("");setMessage("");
  const modified={...selected,...changes,updated_at:new Date().toISOString()};
  if(modified.active&&(modified.pack_version!==2||modified.review_state!=="approved")){setError("Aprovação bloqueada: apenas peças v2 revisadas podem ser publicadas.");setBusy(false);return;}
  const update=await supabase.from("avatar_visual_assets").update({
    pos_x:modified.pos_x,pos_y:modified.pos_y,width_px:modified.width_px,height_px:modified.height_px,
    z_index:modified.z_index,active:modified.active,review_state:modified.review_state,updated_at:modified.updated_at,
  }).eq("id",selected.id);
  if(update.error)setError(update.error.message);
  else{setMessage("Posicionamento salvo. Peça "+(modified.active?"aprovada.":"mantida como rascunho."));setChanges({});await fetchAll();}
  setBusy(false);
 }
 function edit<K extends keyof Visual>(field:K,value:Visual[K]){
  setChanges(prev=>({...prev,[field]:value}));
 }
 const v=selected?{...selected,...changes}:null;
 const scenes=all.filter(a=>a.kind==="scene");
 const currentScene=scenes.find(a=>a.id===activeScene);
 return <section className="mt-6 rounded-3xl border border-pink-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="avatar-assets-title">
  <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
   <div><p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-pink-600"><ShieldCheck size={15}/> Ferramenta exclusiva da administração</p>
    <h2 id="avatar-assets-title" className="text-xl font-extrabold text-navy-950">Ateliê de assets reais</h2>
    <p className="mt-2 text-sm text-slate-600">Os arquivos antigos estão preservados, mas não podem ser publicados. Use somente sprites v2 alinhados ao modelo mestre.</p>
   </div>
   <label className="btn-primary cursor-pointer">
    <Upload size={17}/>{uploading?"Importando...":"Importar pacote ZIP"}
    <input type="file" accept=".zip,application/zip" className="sr-only" disabled={uploading} onChange={e=>void uploadZip(e.target.files?.[0])}/>
   </label>
  </div>
  {progress&&<p role="status" className="mb-3 rounded-lg bg-pink-50 p-3 text-sm text-navy-950">{progress}</p>}
  {error&&<p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><XCircle size={16}/>{error}</p>}
  {message&&<p role="status" className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={16}/>{message}</p>}
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
   <div>
    <div className="relative mx-auto aspect-[6/5] w-full max-w-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-[#f7e2dc]">
     <div className="absolute inset-0">
      {currentScene&&<img src={imageUrl(currentScene.storage_path)} alt="" draggable={false}
       className="absolute" style={{left:0,top:0,width:"100%",height:"100%",objectFit:"cover",imageRendering:"pixelated"}}/>}
      {previewLayers.map(item=><img key={item.id} src={imageUrl(item.storage_path)} alt="" draggable={false}
       className="absolute" style={{left:(item.pos_x/SCENE_W*100)+"%",top:(item.pos_y/SCENE_H*100)+"%",width:(item.width_px/SCENE_W*100)+"%",height:(item.height_px/SCENE_H*100)+"%",
        objectFit:"contain",zIndex:item.z_index,imageRendering:"pixelated"}}/>)}
     </div>
     {!currentScene&&<p className="absolute inset-0 grid place-items-center text-center text-sm text-slate-600">Importe o pacote para visualizar o cenário</p>}
    </div>
    <p className="mt-2 text-center text-xs text-slate-500">Apenas as peças escolhidas aparecem na composição. Dimensões de referência: 600 × 500, com escala adaptável à tela.</p>
    <label className="label mt-4" htmlFor="scene-asset">Cenário de teste</label>
    <select id="scene-asset" className="input" value={activeScene} onChange={e=>setActiveScene(e.target.value)}>
     {scenes.length===0?<option value="">Nenhum cenário importado</option>:scenes.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
    </select>
   </div>
   <div className="space-y-3">
    <label htmlFor="selected-asset" className="label">Peça para ajustar</label>
    <select id="selected-asset" className="input" value={selectedId} onChange={e=>{setSelectedId(e.target.value);setChanges({});}}>
     {all.length===0?<option value="">Nenhum arquivo importado</option>:all.map(a=><option key={a.id} value={a.id}>{a.label} · {a.kind}{a.active?" ✓":""}</option>)}
    </select>
    <p className="text-xs font-semibold text-slate-700">Peças presentes na montagem de teste</p>
    <div className="grid grid-cols-2 gap-2">
     {(["base","hair","outfit","shoes","accessory","pet","drink","device"] as Kind[]).map(kind=><div key={kind}>
      <label className="label text-xs" htmlFor={"preview-"+kind}>{kind}</label>
      <select id={"preview-"+kind} className="input text-xs" value={layerSelection[kind]??""}
       onChange={e=>setLayerSelection(v=>({...v,[kind]:e.target.value}))}>
       <option value="">Não mostrar</option>
       {stage.filter(a=>a.kind===kind).map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
     </div>)}
    </div>
    {v&&<>
     <p className="flex items-center gap-2 text-xs text-slate-500"><Layers size={14}/>{v.kind} · {v.storage_path}</p>
     <div className="grid grid-cols-2 gap-3">
      {(["pos_x","pos_y","width_px","height_px","z_index"] as const).map(k=><div key={k}>
       <label htmlFor={k} className="label">{({pos_x:"Posição X",pos_y:"Posição Y",width_px:"Largura",height_px:"Altura",z_index:"Camada"} as const)[k]}</label>
       <input id={k} type="number" className="input" value={v[k]}
        onChange={e=>edit(k,Number(e.target.value))}/>
      </div>)}
     </div>
     <label className="label" htmlFor="quality-state">Estado de revisão</label>
     <select id="quality-state" className="input" value={v.review_state??"draft"} disabled={v.pack_version!==2} onChange={e=>edit("review_state",e.target.value as Visual["review_state"])}><option value="draft">Rascunho</option><option value="geometry_checked">Geometria conferida</option><option value="approved">Aprovado após teste visual</option></select>
     <p className="text-xs text-slate-500">Padrão: v{v.pack_version??1} · {v.canvas_width??"?"} × {v.canvas_height??"?"}</p>
     <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-pink-500" checked={v.active} disabled={v.pack_version!==2||v.review_state!=="approved"} onChange={e=>edit("active",e.target.checked)}/> Peça revisada e aprovada</label>
     <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Publicar uma peça no catálogo não garante que ela encaixa nas demais. Revise o corpo, cabelo e roupa juntos antes de aprovar.</p>
     <button type="button" className="btn-primary w-full justify-center" onClick={()=>void saveSelected()} disabled={busy}><Save size={16}/> Salvar ajustes</button>
    </>}
    <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showOnlyApproved} onChange={e=>setShowOnlyApproved(e.target.checked)}/> Visualizar apenas peças aprovadas</label>
    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
     <ImageIcon className="mb-2 text-pink-500" size={19}/>
     <p><strong>{all.length}</strong> arquivos cadastrados · <strong>{all.filter(a=>a.active).length}</strong> aprovados.</p>
     <p className="mt-2">Este painel é somente para preparação e revisão; não altera o inventário ou o XP das alunas.</p>
    </div>
   </div>
  </div>
 </section>;
}
