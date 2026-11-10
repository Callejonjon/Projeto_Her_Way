# Her Way — integração de vagas do Brasil (10/11/2026)

## Fontes integradas no backend

| Fonte | Integração | Autenticação | Escopo | Disponibilidade |
|---|---|---|---|---|
| **Empregare Brasil** | GET `https://pdv.empregare.com/api/pt-br/vagas/buscar-novo` | Público | termos: estágio financeiro, analista financeiro, investimentos e crédito | ativa no código, sujeita a retorno da API |
| **Lever — Zippi, Jeeves, Caliza, PayJoy** | GET `https://api.lever.co/v0/postings/{empresa}?mode=json` | Público | vagas de finanças localizadas no Brasil | ativa no código, empresas verificadas individualmente |
| **Adzuna BR** | GET `https://api.adzuna.com/v1/api/jobs/br/search/1` | ID e chave | busca de vagas brasileiras | opcional, **inativa sem chaves** |
| **Jooble BR** | POST `https://br.jooble.org/api/{apiKey}` | Chave regional brasileira | busca de vagas brasileiras | opcional, **inativa sem chave** |
| **Himalayas** | API já instalada anteriormente | Público | vagas remotas compatíveis com Brasil | existente |
| **Jobicy** | API já instalada anteriormente | Público | remoto internacional | existente |

### Chaves para ativar fontes opcionais
Criar no ambiente **Production** do projeto Her Way na Vercel:
- `ADZUNA_APP_ID` — ID da aplicação em https://developer.adzuna.com/
- `ADZUNA_APP_KEY` — chave da aplicação
- `JOOBLE_BR_API_KEY` — chave criada no domínio regional da Jooble para o Brasil

Nunca use `NEXT_PUBLIC_` nesses nomes. As chaves não devem ser exibidas no frontend nem enviadas em conversas.

### Acionar sincronização
- Administradora autenticada: em `/vagas`, clique em **Atualizar vagas**. A rota POST valida o JWT, consulta `profiles.is_admin`, pesquisa os feeds e grava via Supabase RLS.
- Cron automático: `vercel.json` agenda GET `/api/jobs/sync` todo dia às 09:00 UTC **somente quando** `CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` estiverem configurados no projeto Vercel. Não expor os valores.
- Candidatas: somente visualizam anúncios e seguem **link real da vaga** para se candidatar. O site não assume que uma candidatura foi enviada.

### Critérios de qualidade
- Filtra cargos de finanças, investimentos, crédito, risco, controladoria, contabilidade e compliance; descarta anúncios predominantemente de software, TI e vendas.
- Verifica data de expiração quando a fonte publica essa informação.
- Não inventa links: usa URL HTTPS do anúncio ou link documentado pelo provedor.
- Usa `source_url` único no Supabase para evitar duplicação dentro de uma fonte.
- Acesso admin necessário para atualizar anúncios; frontend exibe somente vagas da tabela `public.jobs`.
- APIs externas podem ficar indisponíveis ou não retornar oportunidades compatíveis. **Código implantado não equivale a importação validada:** conferir resultado do botão e contagem em `public.jobs` por `source`.

### Fontes pesquisadas mas não ativadas
- **Gupy**: API oficial de vagas exige token com permissão do cliente/empresa. Não usar endpoints internos reversos para contornar autorização; avaliar parceria ou provedor licenciado.
- **Sólides**: API de gestão e agregadores comerciais exigem token/contrato; não conectar sem autorização.
- **LinkedIn e Indeed**: sem API aberta de busca geral para esta finalidade; evitar scraping de páginas/login.
- **InHire, Recrutei, Abler**: documentação de API própria exige token de conta ou integração contratual; avaliar com os respectivos fornecedores.
- **Greenhouse e Ashby**: JSON público apenas por empresa. Podem ser adicionadas após confirmar empresas brasileiras relevantes e termos permitidos.

### URLs de documentação
- Empregare: https://pdv.empregare.com/api/docs/
- Lever: https://github.com/lever/postings-api
- Adzuna: https://developer.adzuna.com/overview
- Jooble: https://jooblehelpcenter.freshdesk.com/en/support/solutions/articles/60001448238-rest-api-documentation
- Gupy: https://developers.gupy.io/docs/fluxo-de-pagina-de-carreiras
