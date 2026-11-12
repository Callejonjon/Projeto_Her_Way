import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";
import { createMeetEvent, readMeetEvent, deleteMeetEvent } from "@/lib/google-calendar-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Booking = {
 id:string;student_id:string;status:string;meet_url:string|null;google_event_id:string|null;
 meet_status:string;slot_id:string;
 mentor_slots:{starts_at:string;ends_at:string;mentorships:{mentor_name:string;user_id:string|null}|null}|null;
};
function response(message:string,status:number){return NextResponse.json({error:message},{status});}
async function handler(request:NextRequest,action:"provision"|"cancel"){
 const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const admin=createServiceClient();
 if(!url||!anon||!admin)return response("Supabase não configurado.",503);
 if(!token)return response("Faça login na Her Way.",401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
 const identity=await userClient.auth.getUser(token);
 if(identity.error||!identity.data.user)return response("Sessão inválida.",401);
 let input:unknown;
 try{input=await request.json();}catch{return response("Requisição inválida.",400);}
 const bookingId=(input as {bookingId?:unknown})?.bookingId;
 if(typeof bookingId!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(bookingId))return response("Reserva inválida.",400);
 const {data,error}=await admin.from("mentor_bookings")
  .select("id,student_id,status,meet_url,google_event_id,meet_status,slot_id,mentor_slots(starts_at,ends_at,mentorships(mentor_name,user_id))")
  .eq("id",bookingId).maybeSingle();
 if(error||!data)return response("Reserva não encontrada.",404);
 const b=data as unknown as Booking;
 const isStudent=b.student_id===identity.data.user.id;
 if(!isStudent)return response("Sem permissão para esta reserva.",403);
 if(!b.mentor_slots?.mentorships)return response("Dados de mentoria indisponíveis.",409);
 if(action==="provision"&&b.status!=="confirmed")return response("Reserva não está confirmada.",409);
 if(action==="cancel"&&b.status!=="cancelled")return response("Cancele primeiro a reserva na Her Way.",409);
 if(action==="provision"&&b.meet_status==="ready"&&b.meet_url)
  return NextResponse.json({meetUrl:b.meet_url,status:"ready"});
 try{
  if(action==="cancel"){
   if(b.google_event_id)await deleteMeetEvent(b.google_event_id);
   await admin.from("mentor_bookings").update({meet_status:"cancelled",meet_url:null,meet_error:null,meet_synced_at:new Date().toISOString()}).eq("id",b.id);
   return NextResponse.json({status:"cancelled"});
  }
  const mentor=b.mentor_slots.mentorships;
  const [studentData,mentorData]=await Promise.all([
   admin.auth.admin.getUserById(b.student_id),
   mentor.user_id?admin.auth.admin.getUserById(mentor.user_id):Promise.resolve(null)
  ]);
  const emails=[studentData.data.user?.email,mentorData?.data.user?.email].filter((e):e is string=>Boolean(e));
  const {eventId,meetUrl}=b.google_event_id
   ?{eventId:b.google_event_id,meetUrl:await readMeetEvent(b.google_event_id)}
   :await createMeetEvent({bookingId:b.id,mentorName:mentor.mentor_name,
     start:b.mentor_slots.starts_at,end:b.mentor_slots.ends_at,attendees:emails});
  const status=meetUrl?"ready":"pending";
  const update=await admin.from("mentor_bookings").update({
   google_event_id:eventId,meet_url:meetUrl,meet_status:status,meet_error:null,
   meet_synced_at:new Date().toISOString()
  }).eq("id",b.id).eq("status","confirmed").select("id").maybeSingle();
  if(update.error||!update.data)throw new Error("Não foi possível salvar o link da reunião.");
  return NextResponse.json({meetUrl,status});
 }catch(e){
  const message=e instanceof Error?e.message:"Falha na sincronização do Google.";
  if(action==="provision")await admin.from("mentor_bookings")
   .update({meet_status:"failed",meet_error:message.slice(0,300)})
   .eq("id",b.id).eq("status","confirmed");
  return response("A reserva foi mantida, mas a sincronização com o Google falhou. Tente novamente.",502);
 }
}
export async function POST(req:NextRequest){return handler(req,"provision");}
export async function DELETE(req:NextRequest){return handler(req,"cancel");}
