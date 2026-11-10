"use client";
import {useState} from "react";
import {Camera,UserPlus} from "lucide-react";
import {supabase} from "@/lib/supabase";
import type {Area} from "@/lib/types";
const specialties:Area[]=["Asset Management","Investment Banking","Crédito","Research","Tech & Dados"];
export default function MentorAdminRegister(){
 const [name,setName]=useState("");
 const [role,setRole]=useState("");
 const [specialty,setSpecialty]=useState<Area>("Asset Management");
 const [bio,setBio]=useState("");
 const [photo,setPhoto]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState("");
 async function create(e:React.FormEvent){
  e.preventDefault();if(!supabase||busy||!photo)return;
  setBusy(true);setMsg("");
  try {
   if(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>2*1024*1024)
    throw new Error("Envie uma foto JPG, PNG ou WebP de até 2 MB.");
   const extension=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
   const path=`mentors/${crypto.randomUUID()}.${extension}`;
   const upload=await supabase.storage.from("profile-photos").upload(path,photo,{contentType:photo.type,upsert:false});
   if(upload.error)throw new Error("Foto não enviada: "+upload.error.message);
   const result=await supabase.rpc("mentor_admin_create",{
    p_name:name.trim(),p_role:role.trim(),p_specialty:specialty,p_bio:bio.trim(),p_photo_path:path,
   });
   if(result.error)throw new Error(result.error.message);
   setMsg("Mentora cadastrada com foto! Atualize a página para exibir o perfil e configurar a agenda.");
   setName("");setRole("");setBio("");setPhoto(null);
  }catch(e){setMsg(e instanceof Error?e.message:"Falha no cadastro.");}
  finally{setBusy(false);}
 }
 return <section className="card mt-8 p-6">
  <div className="mb-4 flex items-center gap-2"><UserPlus className="text-pink-500"/><h2 className="text-lg font-bold">Administração · Cadastrar mentora verificada</h2></div>
  <p className="mb-5 text-sm text-slate-600">Cadastre somente profissionais cuja identidade e participação foram confirmadas pela equipe. A foto é obrigatória e o cadastro fica registrado no Supabase.</p>
  <form onSubmit={e=>void create(e)} className="grid gap-3 sm:grid-cols-2">
   <div><label className="label" htmlFor="mentor-name">Nome completo</label><input id="mentor-name" required minLength={5} maxLength={100} className="input" value={name} onChange={e=>setName(e.target.value)}/></div>
   <div><label className="label" htmlFor="mentor-role">Cargo e empresa</label><input id="mentor-role" required minLength={4} maxLength={120} className="input" value={role} onChange={e=>setRole(e.target.value)}/></div>
   <div><label className="label" htmlFor="mentor-specialty">Especialidade</label><select id="mentor-specialty" className="input" value={specialty} onChange={e=>setSpecialty(e.target.value as Area)}>{specialties.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
   <div><label className="label" htmlFor="mentor-headshot">Foto profissional obrigatória</label><input id="mentor-headshot" required type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={e=>setPhoto(e.target.files?.[0]??null)}/></div>
   <div className="sm:col-span-2"><label className="label" htmlFor="mentor-bio">Apresentação profissional</label><textarea id="mentor-bio" maxLength={900} className="input min-h-24" value={bio} onChange={e=>setBio(e.target.value)}/></div>
   <div className="flex items-center justify-between gap-3 sm:col-span-2">
    <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Camera size={15}/> JPG, PNG ou WebP até 2 MB</span>
    <button className="btn-primary" type="submit" disabled={busy||!photo||!name.trim()||!role.trim()}>{busy?"Cadastrando...":"Cadastrar mentora"}</button>
   </div>
  </form>
  {msg&&<p role="status" className="mt-4 rounded-xl bg-pink-50 p-3 text-sm text-navy-950">{msg}</p>}
 </section>;
}
