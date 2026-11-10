"use client";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

interface MarketItem {
  symbol: string;
  value: string;
  variation: number; // em %
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

/** Barra compacta "Giro de Mercado" (CDI, Selic, Ibovespa e Dólar com cotação real via AwesomeAPI). */
export default function GiroMercado() {
  const [items, setItems] = useState<MarketItem[]>([
    { symbol: "CDI", value: "14,90% a.a.", variation: 0.02 },
    { symbol: "Selic", value: "15,00% a.a.", variation: 0 },
    { symbol: "Ibovespa", value: "131.450 pts", variation: 0.75 },
    { symbol: "Dólar", value: "R$ 5,43", variation: -0.21 },
  ]);

  useEffect(() => {
    fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL")
      .then((res) => res.json())
      .then((data) => {
        const usd = data?.USDBRL;
        if (!usd) return;
        setItems((prev) => prev.map((item) => item.symbol === "Dólar"
          ? { ...item, value: `R$ ${parseFloat(usd.bid).toFixed(2).replace(".", ",")}`, variation: parseFloat(usd.pctChange) }
          : item));
      })
      .catch((err) => console.error("Erro ao atualizar cotações:", err));
  }, []);

  return (
    <div className="flex h-[54px] min-w-0 flex-1 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 to-[#111C44] px-5 text-white shadow-lg shadow-navy-950/15">
      <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-pink-400">
        <BarChart3 size={18} strokeWidth={2.4} aria-hidden /> <span className="hidden sm:inline">Giro de Mercado</span>
      </span>
      <ul aria-label="Indicadores de mercado" className="no-scrollbar flex min-w-0 items-center overflow-x-auto">
        {items.map((item) => {
          const tone = item.variation > 0 ? "bg-emerald-500/15 text-emerald-400"
            : item.variation < 0 ? "bg-rose-500/15 text-rose-400" : "bg-white/10 text-white/60";
          const arrow = item.variation > 0 ? "▲ " : item.variation < 0 ? "▼ " : "";
          return (
            <li key={item.symbol} className="flex shrink-0 items-center gap-2 border-l border-white/15 px-4 text-sm">
              <span className="text-white/70">{item.symbol}</span>
              <span className="font-semibold">{item.value}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{arrow}{pct(item.variation)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
