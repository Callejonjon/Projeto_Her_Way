"use client";
import Image from "next/image";
import { CalendarDays, Check, Clock, MapPin, Video } from "lucide-react";
import { useStore } from "@/lib/store";
import { fmtDay, fmtMonth, fmtTime } from "@/lib/format";
import type { EventItem } from "@/lib/types";
import { CardHeader } from "./shared";

const duration = (min = 60) => (min % 60 === 0 ? `${min / 60}h de duração` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")} de duração`);

/** Card "Próximo evento" da trilha da usuária. */
export default function EventCard({ event }: { event: EventItem | null }) {
  const { eventRegistrations, registerEvent } = useStore();

  return (
    <section className="panel flex flex-col p-6 md:col-span-2 2xl:col-span-1">
      <CardHeader icon={CalendarDays} title="Próximo evento" href="/mentoria" />
      {event ? (
        <>
          <div className="mt-5 flex flex-1 gap-4">
            <div className="relative hidden w-[120px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-navy-950 to-pink-500 sm:block">
              {event.image_url
                ? <Image src={event.image_url} alt="" fill sizes="120px" className="object-cover" />
                : <CalendarDays aria-hidden className="absolute inset-0 m-auto h-10 w-10 text-white/70" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-600">{event.kind}</span>
                <span className="shrink-0 text-xs text-slate-500">{Number(fmtDay(event.starts_at))} {fmtMonth(event.starts_at)} • {fmtTime(event.starts_at).replace(":00", "h").replace(":", "h")}</span>
              </div>
              <p className="mt-2 text-[17px] font-bold leading-snug text-navy-950">{event.title}</p>
              <p className="mt-2 text-sm leading-snug text-slate-600">
                Com {event.host.split(" · ")[0]}
                {event.host.includes(" · ") && <span className="block text-slate-500">{event.host.split(" · ")[1]}</span>}
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  {/online/i.test(event.location) ? <Video size={14} aria-hidden /> : <MapPin size={14} aria-hidden />} {event.location}
                </span>
                <span className="flex items-center gap-1"><Clock size={14} aria-hidden /> {duration(event.duration_min)}</span>
              </p>
            </div>
          </div>
          <button onClick={() => registerEvent(event.id)} disabled={eventRegistrations.includes(event.id)} className="btn-outline-pink mt-5">
            {eventRegistrations.includes(event.id) ? <><Check size={18} /> Inscrição confirmada</> : "Inscrever-se"}
          </button>
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Novos eventos da sua trilha serão anunciados em breve.</p>
      )}
    </section>
  );
}
