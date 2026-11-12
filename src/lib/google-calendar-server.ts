
type GoogleEvent = {
 id?: string;
 hangoutLink?: string;
 conferenceData?: {
  createRequest?: {status?: {statusCode?: string}};
  entryPoints?: {entryPointType?:string;uri?:string}[];
 };
};

const calendarId = () => process.env.GOOGLE_CALENDAR_ID || "primary";
function config() {
 const id=process.env.GOOGLE_CLIENT_ID;
 const secret=process.env.GOOGLE_CLIENT_SECRET;
 const refresh=process.env.GOOGLE_REFRESH_TOKEN;
 if(!id||!secret||!refresh)throw new Error("Integração Google Calendar ainda não configurada.");
 return {id,secret,refresh};
}
async function accessToken(): Promise<string> {
 const {id,secret,refresh}=config();
 const response=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({client_id:id,client_secret:secret,refresh_token:refresh,grant_type:"refresh_token"}),
  cache:"no-store"
 });
 const payload=await response.json() as {access_token?:string;error?:string};
 if(!response.ok||!payload.access_token)throw new Error("Falha na autorização do Google Calendar: "+(payload.error||response.status));
 return payload.access_token;
}
async function googleRequest(method:string,path:string,body?:unknown):Promise<{status:number;data:GoogleEvent}> {
 const token=await accessToken();
 const res=await fetch("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId())+"/events"+path,{
  method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:body?JSON.stringify(body):undefined,cache:"no-store"
 });
 const data=await res.json().catch(()=>({})) as GoogleEvent & {error?:{message?:string}};
 if(!res.ok&&res.status!==409&&res.status!==404)throw new Error("Google Calendar: "+(data.error?.message||res.status));
 return {status:res.status,data};
}
export async function createMeetEvent(args:{
 bookingId:string;mentorName:string;start:string;end:string;attendees:string[];
}):Promise<{eventId:string;meetUrl:string|null}> {
 // Fixed event ID makes a repeated request safe after a server timeout.
 const eventId=args.bookingId.replace(/-/g,"").toLowerCase();
 const uniqueEmails=[...new Set(args.attendees.filter(Boolean))].map(email=>({email}));
 const event={
  id:eventId,
  summary:"Her Way | Mentoria com "+args.mentorName,
  description:"Sessão individual de mentoria Her Way. Duração: 30 minutos.",
  start:{dateTime:args.start,timeZone:"America/Sao_Paulo"},
  end:{dateTime:args.end,timeZone:"America/Sao_Paulo"},
  attendees:uniqueEmails,
  conferenceData:{createRequest:{
   requestId:args.bookingId,
   conferenceSolutionKey:{type:"hangoutsMeet"}
  }}
 };
 const inserted=await googleRequest("POST","?conferenceDataVersion=1&sendUpdates=all",event);
 const result=inserted.status===409
  ?await googleRequest("GET","/"+eventId+"?conferenceDataVersion=1")
  :inserted;
 const url=result.data.hangoutLink||result.data.conferenceData?.entryPoints?.find(e=>e.entryPointType==="video")?.uri||null;
 if(url&&!/^https:\/\/meet\.google\.com\//.test(url))throw new Error("Google retornou um endereço de reunião inválido.");
 return {eventId,meetUrl:url};
}
export async function readMeetEvent(eventId:string):Promise<string|null> {
 const result=await googleRequest("GET","/"+encodeURIComponent(eventId)+"?conferenceDataVersion=1");
 if(result.status===404)throw new Error("Evento não localizado no Google Calendar");
 return result.data.hangoutLink||result.data.conferenceData?.entryPoints?.find(e=>e.entryPointType==="video")?.uri||null;
}
export async function deleteMeetEvent(eventId:string) {
 const token=await accessToken();
 const res=await fetch("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId())+"/events/"+encodeURIComponent(eventId)+"?sendUpdates=all",{
  method:"DELETE",headers:{Authorization:"Bearer "+token},cache:"no-store"
 });
 if(!res.ok&&res.status!==404)throw new Error("Falha ao cancelar evento no Google Calendar ("+res.status+")");
}
