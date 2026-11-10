import type { Area, EventItem, Job, MarketPill, Mentor, Module, ModuleProgress, Profile } from "./types";

/* =========================================================================
   MOCK DATA — usado quando as chaves do Supabase não estão configuradas.
   Os valores de mercado são ILUSTRATIVOS (modo demonstração).
   ========================================================================= */

export const AREAS: Area[] = ["Asset Management", "Investment Banking", "Crédito", "Research", "Tech & Dados"];
/** Áreas exibidas no Mural de Vagas: somente vagas de finanças (sem vagas de dados/tecnologia). */
export const JOB_AREAS: Area[] = AREAS.filter((a) => a !== "Tech & Dados");
export const SKILL_TAGS = ["Excel", "Python", "Power BI", "SQL", "CPA-20", "Inglês", "Valuation", "Análise de Balanço"];
export const GOALS = ["Primeiro estágio", "Programa de férias", "Mudar de área", "Primeira vaga júnior", "Crescer para liderança"];

export const DEMO_PROFILE: Profile = {
  id: "demo-user",
  name: "Ana Beatriz Souza",
  email: "ana.souza@exemplo.com",
  track_type: "A",
  level: 2,
  xp: 340,
  interests: ["Asset Management", "Investment Banking"],
  skills: ["Excel", "Inglês"],
  bio: "Estudante de Economia (5º semestre), membro da liga de mercado financeiro. Apaixonada por dados e investimentos.",
  avatar_url: "/images/avatar-ana.jpg",
  linkedin_url: "", // vazio na demo para exibir o incentivo "Complete seu perfil e ganhe +50 XP"
  cv_url: "curriculo-ana-beatriz.pdf",
  goal: "Primeiro estágio",
};

export const DEMO_PROGRESS: ModuleProgress[] = [
  { module_id: "m2-mercado", quiz_score: 100, completed_at: "2026-09-20T14:00:00Z" },
  { module_id: "m2-areas", quiz_score: 67, completed_at: "" }, // tentativa abaixo da nota mínima
];

const slot = (title: string) => [
  { type: "video" as const, title: `Vídeo: ${title}`, url: "https://www.youtube.com/embed/SEU_VIDEO_AQUI" },
  { type: "texto" as const, title: "Material de apoio (PDF / texto)", url: "#cole-o-link-do-material" },
  { type: "link" as const, title: "Aula na plataforma parceira", url: "#link-da-plataforma-parceira" },
];

export const MODULES: Module[] = [
  // ---------------- ETAPA 2: FORMAÇÃO BÁSICA ----------------
  {
    id: "m2-mercado", stage: 2, track: "all", durationMin: 40,
    title: "Como funciona o mercado financeiro",
    description: "Sistema financeiro nacional, agentes, renda fixa x variável e o papel do Banco Central.",
    skillsGranted: ["Fundamentos de Mercado"], content: slot("Introdução ao mercado"),
    quiz: [
      { q: "Quem define a taxa Selic no Brasil?", options: ["CVM", "Copom (Banco Central)", "B3", "Tesouro Nacional"], answer: 1, explain: "O Comitê de Política Monetária (Copom) do Banco Central define a meta da Selic a cada ~45 dias." },
      { q: "Um CDB é um título de...", options: ["Renda variável", "Renda fixa emitido por bancos", "Dívida do governo", "Participação em empresa"], answer: 1, explain: "CDB = Certificado de Depósito Bancário: você empresta dinheiro ao banco e recebe juros." },
      { q: "Qual órgão regula o mercado de capitais?", options: ["CVM", "Receita Federal", "Copom", "Febraban"], answer: 0, explain: "A Comissão de Valores Mobiliários (CVM) fiscaliza o mercado de capitais." },
    ],
  },
  {
    id: "m2-areas", stage: 2, track: "all", durationMin: 35,
    title: "Mapa das áreas: Asset, IB, Crédito e Research",
    description: "O dia a dia de cada área, perfis buscados e trajetórias típicas de carreira.",
    skillsGranted: ["Áreas do Mercado"], content: slot("Áreas do mercado"),
    quiz: [
      { q: "Qual área assessora fusões e aquisições (M&A)?", options: ["Asset Management", "Investment Banking", "Crédito", "Backoffice"], answer: 1, explain: "Investment Banking estrutura M&A, IPOs e emissões de dívida." },
      { q: "Quem faz a gestão de fundos de investimento?", options: ["Asset Management", "Research", "Compliance", "Tesouraria"], answer: 0, explain: "Gestoras (Asset) decidem onde alocar o dinheiro dos cotistas." },
      { q: "O que um analista de Research produz?", options: ["Contratos de crédito", "Relatórios e recomendações sobre ativos", "Campanhas de marketing", "Auditorias"], answer: 1, explain: "Research analisa empresas e setores e publica recomendações (compra, venda, neutro)." },
    ],
  },
  {
    id: "m2-excel", stage: 2, track: "all", durationMin: 60, partner: "IBooster",
    title: "Excel para finanças",
    description: "PROCV/XLOOKUP, tabelas dinâmicas, juros compostos e modelagem simples.",
    skillsGranted: ["Excel"], content: slot("Excel financeiro"),
    quiz: [
      { q: "Qual função retorna o valor futuro de um investimento?", options: ["=VP()", "=VF()", "=SOMA()", "=PROCV()"], answer: 1, explain: "VF calcula o Valor Futuro dado taxa, períodos e pagamentos." },
      { q: "Tabela dinâmica serve principalmente para...", options: ["Formatar cores", "Resumir e agrupar grandes volumes de dados", "Criar macros", "Proteger a planilha"], answer: 1, explain: "Ela agrega dados por categorias em poucos cliques." },
      { q: "R$ 1.000 a 10% a.a. por 2 anos (juros compostos) =", options: ["R$ 1.200", "R$ 1.210", "R$ 1.100", "R$ 1.020"], answer: 1, explain: "1.000 × 1,1 × 1,1 = 1.210." },
    ],
  },
  {
    id: "m2-balanco", stage: 2, track: "A", durationMin: 45,
    title: "Contabilidade e análise de balanço",
    description: "Balanço patrimonial, DRE e indicadores básicos — base para estágios em Crédito e Research.",
    skillsGranted: ["Análise de Balanço"], content: slot("Análise de balanço"),
    quiz: [
      { q: "Ativo = ?", options: ["Passivo − PL", "Passivo + Patrimônio Líquido", "Receita − Custos", "Lucro × 2"], answer: 1, explain: "Equação fundamental da contabilidade." },
      { q: "EBITDA mede...", options: ["Caixa no banco", "Geração operacional antes de juros, impostos, depreciação e amortização", "Dívida total", "Valor de mercado"], answer: 1, explain: "É um proxy da geração de caixa operacional." },
      { q: "Dívida Líquida/EBITDA alto indica...", options: ["Empresa pouco alavancada", "Maior alavancagem e risco de crédito", "Lucro alto", "Nada"], answer: 1, explain: "Quanto maior, mais anos de geração operacional para pagar a dívida." },
    ],
  },
  {
    id: "m2-transferiveis", stage: 2, track: "B", durationMin: 45,
    title: "Diagnóstico de competências transferíveis",
    description: "Como traduzir sua experiência anterior (gestão, vendas, engenharia, direito...) para o mercado financeiro.",
    skillsGranted: ["Posicionamento"], content: slot("Competências transferíveis"),
    quiz: [
      { q: "Uma competência transferível é...", options: ["Algo que só serve na área antiga", "Habilidade aplicável em diferentes contextos", "Um diploma", "Um certificado obrigatório"], answer: 1, explain: "Ex.: negociação, análise, gestão de projetos." },
      { q: "Experiência em vendas B2B ajuda mais em...", options: ["Relacionamento com clientes (Private, Corporate)", "Auditoria interna", "Backoffice", "Nenhuma área"], answer: 0, explain: "Relacionamento e negociação são centrais em Corporate/Private Banking." },
      { q: "Ao contar sua transição, o foco deve ser...", options: ["Justificar a saída", "Resultados mensuráveis e o porquê da mudança", "Salário", "Críticas ao antigo emprego"], answer: 1, explain: "Narrativa + números geram credibilidade." },
    ],
  },
  {
    id: "m2-dados", stage: 2, track: "all", durationMin: 60, partner: "Modu",
    title: "Dados para finanças: Python e Power BI",
    description: "Primeiros passos em Python (pandas) e dashboards em Power BI aplicados a carteiras.",
    skillsGranted: ["Python", "Power BI"], content: slot("Dados para finanças"),
    quiz: [
      { q: "Biblioteca Python mais usada para tabelas de dados:", options: ["pandas", "pygame", "flask", "tkinter"], answer: 0, explain: "pandas manipula DataFrames (tabelas)." },
      { q: "No Power BI, uma 'medida' é criada com...", options: ["DAX", "HTML", "VBA", "CSS"], answer: 0, explain: "DAX é a linguagem de fórmulas do Power BI." },
      { q: "Retorno diário de um ativo em pandas:", options: ["df.sum()", "df['preco'].pct_change()", "df.head()", "df.drop()"], answer: 1, explain: "pct_change() calcula a variação percentual entre linhas." },
    ],
  },
  {
    id: "m2-soft", stage: 2, track: "all", durationMin: 30,
    title: "Soft skills e comunicação executiva",
    description: "Comunicação clara, storytelling com números e postura em ambientes de alta pressão.",
    skillsGranted: ["Comunicação"], content: slot("Soft skills"),
    quiz: [
      { q: "Estrutura recomendada para respostas comportamentais:", options: ["STAR (Situação, Tarefa, Ação, Resultado)", "SWOT", "PDCA", "KPI"], answer: 0, explain: "STAR organiza a história e destaca o resultado." },
      { q: "Ao apresentar um número para a liderança, você deve...", options: ["Mostrar todos os detalhes", "Começar pela conclusão e o impacto", "Evitar gráficos", "Ler os slides"], answer: 1, explain: "Pirâmide de Minto: conclusão primeiro." },
      { q: "Síndrome da impostora se combate com...", options: ["Silêncio", "Registro de conquistas e feedback", "Evitar desafios", "Comparação constante"], answer: 1, explain: "Evidências concretas reduzem a autocrítica distorcida." },
    ],
  },
  // ---------------- ETAPA 4: PREPARAÇÃO PARA PROCESSOS ----------------
  {
    id: "m4-curriculo", stage: 4, track: "all", durationMin: 30,
    title: "Currículo para o mercado financeiro",
    description: "Modelo de 1 página, verbos de ação, resultados quantificados e palavras-chave para ATS.",
    skillsGranted: ["Currículo"], content: slot("Currículo"),
    quiz: [
      { q: "Tamanho ideal do currículo para estágio/júnior:", options: ["1 página", "3 páginas", "5 páginas", "Sem limite"], answer: 0, explain: "Recrutadoras gastam segundos na triagem." },
      { q: "Qual bullet é mais forte?", options: ["Responsável por planilhas", "Automatizei relatório em Excel, reduzindo 6h/semana", "Ajudei a equipe", "Fiz várias tarefas"], answer: 1, explain: "Verbo de ação + resultado mensurável." },
      { q: "ATS é...", options: ["Um banco", "Sistema que filtra currículos por palavras-chave", "Uma certificação", "Um tipo de fundo"], answer: 1, explain: "Applicant Tracking System." },
    ],
  },
  {
    id: "m4-linkedin", stage: 4, track: "all", durationMin: 25,
    title: "LinkedIn estratégico",
    description: "Headline, sobre, recomendações e como abordar profissionais sem parecer invasiva.",
    skillsGranted: ["LinkedIn"], content: slot("LinkedIn"),
    quiz: [
      { q: "Uma boa headline contém...", options: ["Só 'Estudante'", "Objetivo + áreas + diferenciais", "Emojis apenas", "Seu telefone"], answer: 1, explain: "Ex.: 'Economia | Asset Management | Python & Excel'." },
      { q: "Ao convidar alguém para conexão, é melhor...", options: ["Enviar sem nota", "Personalizar com contexto e pedido claro", "Pedir vaga direto", "Enviar 5 mensagens"], answer: 1, explain: "Contexto + pedido específico (ex.: 15 min de conversa)." },
      { q: "Recomendações no LinkedIn servem para...", options: ["Nada", "Prova social da sua competência", "Aumentar o salário", "Substituir o CV"], answer: 1, explain: "Validam seu trabalho por terceiros." },
    ],
  },
  {
    id: "m4-cpa", stage: 4, track: "all", durationMin: 50,
    title: "Trilha preparatória CPA-20",
    description: "Conteúdos-chave da certificação Anbima mais pedida em vagas de investimentos.",
    skillsGranted: ["CPA-20"], content: slot("CPA-20"),
    quiz: [
      { q: "A CPA-20 é emitida por...", options: ["Anbima", "CVM", "B3", "Bacen"], answer: 0, explain: "Associação Brasileira das Entidades dos Mercados Financeiro e de Capitais." },
      { q: "Suitability significa...", options: ["Adequação do produto ao perfil do investidor", "Taxa de administração", "Tipo de ação", "Imposto"], answer: 0, explain: "Obrigação de recomendar produtos compatíveis com o perfil." },
      { q: "O FGC garante até...", options: ["R$ 50 mil", "R$ 250 mil por CPF por instituição", "Ilimitado", "R$ 1 milhão por banco"], answer: 1, explain: "Limite de R$ 250 mil por CPF e conglomerado." },
    ],
  },
  {
    id: "m4-entrevista", stage: 4, track: "all", durationMin: 40,
    title: "Simulação de entrevistas e cases",
    description: "Perguntas técnicas e comportamentais, market sizing e como falar do mercado.",
    skillsGranted: ["Entrevistas"], content: slot("Entrevistas"),
    quiz: [
      { q: "'Me conte sobre você' deve durar cerca de...", options: ["10 segundos", "1–2 minutos com foco profissional", "10 minutos", "Não responder"], answer: 1, explain: "Pitch objetivo: passado, presente e por que esta vaga." },
      { q: "Pergunta 'como você vê a Selic hoje?' avalia...", options: ["Memória", "Acompanhamento de mercado e raciocínio", "Matemática avançada", "Nada"], answer: 1, explain: "Mostre que acompanha o noticiário e conecte com impactos." },
      { q: "Ao final da entrevista, você deve...", options: ["Não perguntar nada", "Fazer perguntas sobre o time e desafios", "Perguntar só o salário", "Sair rápido"], answer: 1, explain: "Perguntas qualificadas demonstram interesse genuíno." },
    ],
  },
  // ---------------- ETAPA 5: CONCLUSÃO ----------------
  {
    id: "m5-plano", stage: 5, track: "all", durationMin: 20,
    title: "Plano de carreira e próximo ciclo",
    description: "Consolide aprendizados, defina metas de 6 meses e escolha: candidatar-se ou iniciar novo ciclo.",
    skillsGranted: ["Plano de Carreira"], content: slot("Plano de carreira"),
    quiz: [
      { q: "Uma meta SMART é...", options: ["Vaga e ampla", "Específica, mensurável, atingível, relevante e com prazo", "Somente financeira", "Secreta"], answer: 1, explain: "Ex.: 'Aplicar para 10 estágios em Asset até março'." },
      { q: "Depois de uma reprovação, o melhor passo é...", options: ["Desistir", "Pedir feedback e ajustar o plano", "Mudar de área imediatamente", "Ignorar"], answer: 1, explain: "Feedback acelera a próxima aprovação." },
      { q: "Networking contínuo significa...", options: ["Só procurar pessoas quando precisa", "Manter relacionamentos e contribuir com a comunidade", "Adicionar todos no LinkedIn", "Ir a um evento por ano"], answer: 1, explain: "Relações de longo prazo geram oportunidades." },
    ],
  },
];

export const MENTORS: Mentor[] = [
  { id: "mt1", mentor_name: "Carla Menezes", initials: "CM", mentor_role: "Head de Crédito Corporativo · Banco Horizonte", specialty: "Crédito",
    bio: "15 anos estruturando operações de crédito. Fez a transição de engenharia para finanças.", match_tags: ["Excel", "Análise de Balanço", "Liderança"], tracks: ["B"], goals: ["Mudar de área", "Crescer para liderança"], quote: "Sua bagagem de outra área é um diferencial, não um obstáculo." },
  { id: "mt2", mentor_name: "Juliana Prado", initials: "JP", mentor_role: "Portfolio Manager · Aurora Asset", specialty: "Asset Management",
    bio: "Gestora de fundos multimercado, CFA. Mentora da liga de mercado da USP.", match_tags: ["Python", "CPA-20", "Excel"], tracks: ["A"], goals: ["Primeiro estágio", "Programa de férias"],
    photo_url: "/images/mentora-juliana.jpg", quote: "Acredito no potencial das mulheres para transformar o mercado financeiro." },
  { id: "mt3", mentor_name: "Renata Okada", initials: "RO", mentor_role: "VP de Investment Banking · Atlas Capital", specialty: "Investment Banking",
    bio: "M&A e ECM. Já recrutou mais de 60 estagiárias para programas de férias.", match_tags: ["Valuation", "Excel", "Inglês"], tracks: ["A"], goals: ["Programa de férias", "Primeiro estágio"], quote: "Preparação é o que transforma um processo seletivo em oportunidade." },
  { id: "mt4", mentor_name: "Fernanda Lima", initials: "FL", mentor_role: "Head de Dados · Fintech Nuvem", specialty: "Tech & Dados",
    bio: "Lidera times de dados em fintech. Veio do varejo e migrou para dados financeiros.", match_tags: ["Python", "SQL", "Power BI"], tracks: ["A", "B"], goals: ["Mudar de área", "Primeira vaga júnior"], quote: "Tecnologia e finanças andam juntas: comece pelo básico bem feito." },
  { id: "mt5", mentor_name: "Patrícia Nogueira", initials: "PN", mentor_role: "Analista Sênior de Research · Corretora Vértice", specialty: "Research",
    bio: "Cobre o setor de energia. Ama ensinar valuation e escrita de relatórios.", match_tags: ["Valuation", "Análise de Balanço", "Excel"], tracks: ["A", "B"], goals: ["Primeira vaga júnior", "Primeiro estágio"], quote: "Curiosidade e método fazem uma grande analista." },
  { id: "mt6", mentor_name: "Marina Teixeira", initials: "MT", mentor_role: "Diretora de Private Banking · Banco Solar", specialty: "Asset Management",
    bio: "Ex-advogada, migrou para investimentos aos 32. Especialista em transição de carreira.", match_tags: ["CPA-20", "Inglês", "Liderança"], tracks: ["B"], goals: ["Mudar de área", "Crescer para liderança"], quote: "Nunca é tarde para construir uma carreira de destaque em finanças." },
  { id: "mt7", mentor_name: "Beatriz Campos", initials: "BC", mentor_role: "Gerente de Risco de Crédito · Cooperativa Elo", specialty: "Crédito",
    bio: "Modelagem de risco com Python. Mentora de iniciantes em dados aplicados a crédito.", match_tags: ["Python", "SQL", "Análise de Balanço"], tracks: ["A", "B"], goals: ["Primeira vaga júnior", "Mudar de área"], quote: "Entender risco é entender o negócio por inteiro." },
];

const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

export const JOBS: Job[] = [
  { id: "j1", title: "Estágio em Asset Management", company: "Aurora Asset", area: "Asset Management", modality: "Híbrido", level_required: "Estágio",
    skills_tags: ["Excel", "Inglês", "Python"], description: "Apoio à equipe de gestão em análise de carteiras e relatórios a cotistas.", location: "São Paulo, SP",
    source: "manual", source_url: "#", is_exclusive: true, created_at: d(1) },
  { id: "j2", title: "Programa de Férias – Investment Banking", company: "Atlas Capital", area: "Investment Banking", modality: "Presencial", level_required: "Estágio",
    skills_tags: ["Excel", "Valuation", "Inglês"], description: "8 semanas em times de M&A e ECM com possibilidade de efetivação.", location: "São Paulo, SP",
    source: "manual", source_url: "#", is_exclusive: true, created_at: d(2) },
  { id: "j3", title: "Analista de Crédito Júnior", company: "Banco Horizonte", area: "Crédito", modality: "Híbrido", level_required: "Júnior",
    skills_tags: ["Excel", "Análise de Balanço"], description: "Análise de demonstrações financeiras de empresas middle market.", location: "Belo Horizonte, MG",
    source: "manual", source_url: "#", is_exclusive: false, created_at: d(3) },
  { id: "j4", title: "Analista de Investimentos Jr.", company: "Itaú Asset Management", area: "Asset Management", modality: "Híbrido", level_required: "Júnior",
    skills_tags: ["Excel", "Inglês", "CPA-20"], description: "Suporte à gestão de fundos: acompanhamento de carteiras, relatórios a cotistas e análise de mercado.", location: "São Paulo, SP",
    source: "manual", source_url: "https://vemparaoritau.com.br/", is_exclusive: true, created_at: d(1) },
  { id: "j5", title: "Assistente de Research (Transição)", company: "Corretora Vértice", area: "Research", modality: "Híbrido", level_required: "Transição",
    skills_tags: ["Excel", "Análise de Balanço", "Inglês"], description: "Vaga afirmativa para mulheres em transição: apoio na cobertura de utilities.", location: "Rio de Janeiro, RJ",
    source: "manual", source_url: "#", is_exclusive: true, created_at: d(4) },
  { id: "j6", title: "Assessora de Investimentos", company: "Banco Solar", area: "Asset Management", modality: "Presencial", level_required: "Transição",
    skills_tags: ["CPA-20", "Inglês"], description: "Relacionamento com clientes de alta renda. Ideal para quem vem de vendas ou atendimento.", location: "Curitiba, PR",
    source: "manual", source_url: "#", is_exclusive: false, created_at: d(5) },
  { id: "j7", title: "Estágio em Risco de Crédito", company: "Cooperativa Elo", area: "Crédito", modality: "Remoto", level_required: "Estágio",
    skills_tags: ["Python", "SQL", "Excel"], description: "Apoio na construção de modelos de score e monitoramento de carteira.", location: "Remoto (Brasil)",
    source: "remotive", source_url: "#", is_exclusive: false, created_at: d(2) },
  { id: "j8", title: "Analista de Produtos Financeiros", company: "XP Inc.", area: "Asset Management", modality: "Híbrido", level_required: "Pleno",
    skills_tags: ["CPA-20", "Excel", "Inglês"], description: "Estruturação e curadoria de produtos de renda fixa e fundos para a plataforma de investimentos.", location: "São Paulo, SP",
    source: "manual", source_url: "https://www.xpi.com.br/carreiras/", is_exclusive: false, created_at: d(2) },
  { id: "j9", title: "Estágio em Equity Research", company: "Ágora Research", area: "Research", modality: "Híbrido", level_required: "Estágio",
    skills_tags: ["Excel", "Valuation", "Inglês"], description: "Modelagem de empresas listadas e apoio na redação de relatórios.", location: "São Paulo, SP",
    source: "manual", source_url: "#", is_exclusive: false, created_at: d(7) },
  { id: "j10", title: "Analista de M&A Júnior", company: "Pátria Advisory", area: "Investment Banking", modality: "Presencial", level_required: "Júnior",
    skills_tags: ["Valuation", "Excel", "Inglês"], description: "Modelagem financeira, pitchbooks e due diligence.", location: "São Paulo, SP",
    source: "manual", source_url: "#", is_exclusive: false, created_at: d(8) },
  { id: "j11", title: "Analista de Produtos de Investimento (Transição)", company: "XPTO Investimentos", area: "Asset Management", modality: "Remoto", level_required: "Transição",
    skills_tags: ["CPA-20", "Excel", "Power BI"], description: "Curadoria de fundos e materiais educativos para clientes.", location: "Remoto (Brasil)",
    source: "remotive", source_url: "#", is_exclusive: true, created_at: d(3) },
  { id: "j12", title: "Assessora de Investimentos", company: "Banco Safra", area: "Asset Management", modality: "Presencial", level_required: "Júnior",
    skills_tags: ["CPA-20", "Inglês"], description: "Atendimento e assessoria a clientes de alta renda em investimentos e previdência.", location: "São Paulo, SP",
    source: "manual", source_url: "https://www.safra.com.br/carreiras.htm", is_exclusive: false, created_at: d(1) },
  { id: "j13", title: "Estágio em Gestão de Investimentos", company: "Galapagos Capital", area: "Asset Management", modality: "Híbrido", level_required: "Estágio",
    skills_tags: ["Excel", "Inglês", "Fundamentos de Mercado"], description: "Programa Elas no Mercado Financeiro (afirmativo): apoio às equipes de gestão, crédito e wealth com mentoria de profissionais da casa.", location: "São Paulo, SP",
    source: "manual", source_url: "https://galapagoscapital.com/vagas/", is_exclusive: true, created_at: d(1) },
  { id: "j14", title: "Analista de Crédito Corporate Jr.", company: "BTG Pactual", area: "Crédito", modality: "Presencial", level_required: "Júnior",
    skills_tags: ["Excel", "Análise de Balanço", "Inglês"], description: "Análise de risco de crédito de empresas e acompanhamento de covenants.", location: "São Paulo, SP",
    source: "manual", source_url: "https://www.btgpactual.com/carreiras", is_exclusive: false, created_at: d(4) },
];

export const EVENTS: EventItem[] = [
  { id: "e1", title: "Carreira em Asset Management: bastidores e oportunidades", host: "Juliana Prado · Portfolio Manager na Aurora Asset", kind: "Bate-papo", starts_at: "2026-11-10T19:00:00-03:00", location: "Online (Zoom)", url: "#", tracks: ["A", "B"], image_url: "/images/evento-asset.jpg", duration_min: 60 },
  { id: "e2", title: "Women in Finance Meetup SP", host: "Comunidade Women in Finance", kind: "Networking", starts_at: "2026-11-19T18:30:00-03:00", location: "Av. Faria Lima, São Paulo", url: "#", tracks: ["A", "B"], duration_min: 120 },
  { id: "e3", title: "Processo seletivo da Liga de Mercado Financeiro", host: "Liga de Mercado · FEA/USP", kind: "Liga Universitária", starts_at: "2026-11-24T17:00:00-03:00", location: "Híbrido", url: "#", tracks: ["A"], duration_min: 90 },
  { id: "e4", title: "Transição de carreira para finanças: histórias reais", host: "Marina Teixeira · Diretora de Private Banking no Banco Solar", kind: "Bate-papo", starts_at: "2026-11-13T19:30:00-03:00", location: "Online", url: "#", tracks: ["B"], duration_min: 60 },
  { id: "e5", title: "Open Day Programa de Férias IB", host: "Atlas Capital", kind: "Empresa Parceira", starts_at: "2026-12-03T10:00:00-03:00", location: "São Paulo, SP", url: "#", tracks: ["A"], duration_min: 180 },
  { id: "e6", title: "Workshop: análise de crédito na prática", host: "Cooperativa Elo", kind: "Empresa Parceira", starts_at: "2026-12-09T19:00:00-03:00", location: "Online", url: "#", tracks: ["A", "B"], duration_min: 90 },
];

export const MARKET_PILLS: MarketPill[] = [
  { label: "Selic", value: "15,00% a.a.", trend: "flat", explain: "Taxa básica de juros. Juros altos encarecem o crédito e favorecem a renda fixa." },
  { label: "IPCA 12m", value: "4,9%", trend: "down", explain: "Inflação oficial. Mede quanto os preços subiram em 12 meses." },
  { label: "Ibovespa", value: "142.300 pts", trend: "up", explain: "Principal índice de ações da B3 — o 'termômetro' da bolsa brasileira." },
  { label: "Dólar", value: "R$ 5,38", trend: "down", explain: "Dólar caindo barateia importados e viagens; afeta empresas exportadoras." },
  { label: "CDI", value: "14,90% a.a.", trend: "flat", explain: "Referência da renda fixa. 'Rende 100% do CDI' = acompanha essa taxa." },
];

export const MARKET_NEWS = [
  "Copom mantém juros: renda fixa segue atrativa para quem está começando.",
  "Bancos ampliam programas de estágio com metas de diversidade de gênero.",
  "Tesouro Direto bate recorde de investidoras — mulheres já são 31% da base.",
];

/* ---------- Dados agregados do Painel de Impacto (demo) ---------- */
export const ADMIN_STATS = {
  inscritas: { A: 312, B: 188 },
  stageFunnel: [
    { stage: "1. Inscrição e diagnóstico", value: 500 },
    { stage: "2. Formação básica", value: 401 },
    { stage: "3. Mentoria e networking", value: 318 },
    { stage: "4. Preparação p/ processos", value: 254 },
    { stage: "5. Conclusão", value: 203 },
  ],
  quizEvolution: [
    { month: "Mai", A: 58, B: 61 }, { month: "Jun", A: 63, B: 66 }, { month: "Jul", A: 68, B: 70 },
    { month: "Ago", A: 72, B: 74 }, { month: "Set", A: 77, B: 78 }, { month: "Out", A: 81, B: 80 },
  ],
  mentorship: { pareamentos: 318, ativas: 271, sessoesRealizadas: 1124, participacao: 85, nps: 72 },
  employability: [
    { label: "Candidaturas pela plataforma", value: 1340 },
    { label: "Entrevistas", value: 412 },
    { label: "Aprovações", value: 131 },
    { label: "Contratações/promoções reportadas", value: 118 },
  ],
  byArea: [
    { area: "Asset Management", value: 34 }, { area: "Crédito", value: 28 }, { area: "Tech & Dados", value: 26 },
    { area: "Investment Banking", value: 18 }, { area: "Research", value: 12 },
  ],
};
