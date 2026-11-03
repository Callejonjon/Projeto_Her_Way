/**
 * Motor local da "Mentora Virtual" (sem custo de API). Usado como fallback
 * quando GEMINI_API_KEY não está configurada ou a API falha.
 */
export type ChatMode = "economes" | "curriculo" | "entrevista";
export interface ChatMsg { role: "user" | "assistant"; content: string }

const GLOSSARY: Record<string, string> = {
  selic: "**Selic** é a taxa básica de juros do Brasil, definida pelo Copom. Pense nela como o 'preço do dinheiro': quando sobe, empréstimos ficam mais caros e a renda fixa rende mais.",
  cdi: "**CDI** é a taxa que os bancos usam para emprestar entre si, quase igual à Selic. Quando um investimento 'rende 100% do CDI', ele acompanha essa taxa.",
  ipca: "**IPCA** é a inflação oficial. Se o IPCA de 12 meses é 5%, o que custava R$ 100 há um ano hoje custa ~R$ 105.",
  ebitda: "**EBITDA** é o lucro da operação antes de juros, impostos, depreciação e amortização. Mostra se o 'negócio em si' gera caixa.",
  valuation: "**Valuation** é estimar quanto uma empresa vale. O método mais comum é o fluxo de caixa descontado (DCF): trazer a valor presente o caixa que ela vai gerar.",
  "m&a": "**M&A** (Mergers & Acquisitions) são fusões e aquisições. O time de Investment Banking assessora quem compra ou vende empresas.",
  ipo: "**IPO** é quando uma empresa vende ações na bolsa pela primeira vez — a 'estreia' dela no mercado.",
  "renda fixa": "**Renda fixa**: você empresta dinheiro (ao governo, banco ou empresa) e as regras de remuneração são conhecidas na aplicação. Ex.: Tesouro Selic, CDB.",
  "renda variavel": "**Renda variável**: o retorno não é conhecido antes. Ex.: ações e fundos imobiliários.",
  cdb: "**CDB** é um título em que você empresta dinheiro ao banco. Tem garantia do FGC até R$ 250 mil por CPF por instituição.",
  fgc: "**FGC** (Fundo Garantidor de Créditos) devolve até R$ 250 mil por CPF/instituição se o banco quebrar.",
  "cpa-20": "**CPA-20** é a certificação Anbima para quem atende clientes de investimentos de alta renda. Muito pedida em vagas de assessoria e private.",
  spread: "**Spread** é a diferença entre duas taxas — ex.: o banco capta a 10% e empresta a 18%; o spread é 8 p.p.",
  hedge: "**Hedge** é uma proteção. Ex.: uma exportadora 'trava' o dólar com derivativos para não perder se a moeda cair.",
  liquidez: "**Liquidez** é a facilidade de transformar um investimento em dinheiro sem perder valor. Poupança tem alta liquidez; imóvel, baixa.",
  "duration": "**Duration** é o prazo médio (ponderado) para receber o fluxo de um título. Quanto maior, mais sensível a mudanças de juros.",
  "asset": "**Asset Management** é a gestão de recursos de terceiros (fundos). A gestora decide onde investir o dinheiro dos cotistas.",
  "dre": "**DRE** (Demonstração do Resultado) mostra receitas, custos e o lucro de um período — o 'filme' da empresa.",
  "balanço": "**Balanço patrimonial** é a 'foto' da empresa numa data: o que ela tem (ativos), o que deve (passivos) e o patrimônio dos sócios.",
  "home broker": "**Home broker** é a plataforma da corretora para comprar e vender ativos na bolsa pela internet.",
};

const INTERVIEW = [
  "Vamos começar! 🎤 **Pergunta 1:** Me conte sobre você e por que quer trabalhar no mercado financeiro. (Dica: 1–2 minutos, foque no profissional.)",
  "**Pergunta 2 (técnica):** Se a Selic subir, o que acontece com o preço dos títulos prefixados já emitidos? Por quê?",
  "**Pergunta 3 (comportamental):** Conte uma situação em que você lidou com um prazo muito apertado. Use o método STAR.",
  "**Pergunta 4 (mercado):** Qual notícia econômica recente chamou sua atenção e como ela afeta a área em que você quer atuar?",
  "**Pergunta 5:** Que perguntas você tem para nós sobre o time ou a vaga?",
];

const ACTION_VERBS = ["desenvolvi", "liderei", "automatizei", "reduzi", "aumentei", "criei", "implementei", "analisei", "estruturei", "coordenei", "conquistei"];

function feedbackInterview(answer: string) {
  const tips: string[] = [];
  if (answer.length < 120) tips.push("Desenvolva um pouco mais — respostas muito curtas podem parecer pouco preparadas.");
  if (!/\d/.test(answer)) tips.push("Inclua números ou resultados concretos (ex.: 'reduzi 20% do tempo').");
  if (/acho que|talvez|não sei/i.test(answer)) tips.push("Evite 'acho que/talvez': transmita segurança no que você fez.");
  return tips.length ? `💡 Feedback: ${tips.join(" ")}` : "✨ Ótima resposta: clara, objetiva e com evidências!";
}

export function localReply(mode: ChatMode, history: ChatMsg[]): string {
  const last = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const text = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (mode === "entrevista") {
    const asked = history.filter((m) => m.role === "assistant" && m.content.includes("**Pergunta")).length;
    if (asked === 0) return INTERVIEW[0];
    const fb = feedbackInterview(last);
    if (asked >= INTERVIEW.length) return `${fb}\n\n🎉 Simulação concluída! Você respondeu ${INTERVIEW.length} perguntas. Reforce a pergunta técnica no módulo "Simulação de entrevistas e cases". Quer recomeçar? Digite **reiniciar**.`;
    if (text.includes("reiniciar")) return INTERVIEW[0];
    return `${fb}\n\n${INTERVIEW[asked]}`;
  }

  if (mode === "curriculo") {
    if (last.length < 80) {
      return "Cole aqui um trecho do seu currículo (resumo ou experiências) e eu reviso com olhar de recrutadora do mercado financeiro. Sem julgamentos — só melhorias. 💗";
    }
    const verbs = ACTION_VERBS.filter((v) => text.includes(v));
    const hasNumbers = /\d+\s*(%|mil|k|horas|h|r\$)/i.test(last);
    const keywords = ["excel", "python", "power bi", "sql", "cpa", "ingles", "valuation", "modelagem"].filter((k) => text.includes(k));
    const out = ["**Revisão do seu currículo:**"];
    out.push(verbs.length ? `✅ Bons verbos de ação: ${verbs.join(", ")}.` : "⚠️ Comece cada bullet com verbo de ação no passado (ex.: *Automatizei*, *Analisei*, *Estruturei*).");
    out.push(hasNumbers ? "✅ Você quantificou resultados — recrutadoras amam isso." : "⚠️ Quantifique: '*Automatizei relatório semanal, economizando 6h/semana*'.");
    out.push(keywords.length ? `✅ Palavras-chave para ATS: ${keywords.join(", ")}.` : "⚠️ Inclua palavras-chave das vagas (Excel, Python, Power BI, CPA-20, Inglês) para passar nos filtros (ATS).");
    if (last.length > 1500) out.push("⚠️ Está longo: para estágio/júnior, mantenha 1 página.");
    out.push("👉 Próximo passo: faça o módulo **Currículo para o mercado financeiro** na Etapa 4.");
    return out.join("\n");
  }

  // economes
  const hit = Object.keys(GLOSSARY).find((k) => text.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
  if (hit) return `${GLOSSARY[hit]}\n\nQuer que eu explique outro termo? Pergunte sem medo — aqui é um espaço seguro. 💗`;
  return `Sou sua **Tradutora de Economês**! Pergunte qualquer jargão, como: ${Object.keys(GLOSSARY).slice(0, 8).join(", ")}... Não existe pergunta boba por aqui. 💗`;
}

export const SYSTEM_PROMPT = `Você é a "Mentora Virtual" da plataforma Her Way, um espaço seguro para mulheres aprendendo sobre o mercado financeiro brasileiro.
Tom: acolhedor, encorajador, sem julgamentos, didático, em português do Brasil. Respostas curtas (até 150 palavras), com exemplos do cotidiano.
Modos: "economes" = traduzir jargões financeiros; "curriculo" = revisar currículo com foco em verbos de ação, resultados quantificados e palavras-chave (ATS);
"entrevista" = simular entrevista (uma pergunta por vez, dar feedback breve na resposta anterior antes da próxima pergunta).
Nunca dê recomendação de investimento personalizada.`;
