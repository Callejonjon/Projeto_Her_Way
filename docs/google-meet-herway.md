# Her Way — Google Meet automático (conta central)

## Configuração Google Cloud

1. Entre em https://console.cloud.google.com/ e crie um projeto para a Her Way.
2. Em **APIs e serviços > Biblioteca**, habilite a **Google Calendar API**.
3. Em **Google Auth Platform / Tela de consentimento OAuth**, configure o aplicativo, contato responsável e o escopo `https://www.googleapis.com/auth/calendar.events`.
4. Crie um **Cliente OAuth 2.0 do tipo Aplicativo Web**.
5. Para obter o refresh token uma única vez, é possível usar o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) em modo **Use your own OAuth credentials**, com o Client ID e Client Secret do passo anterior. Para isso, inclua `https://developers.google.com/oauthplayground` como URI de redirecionamento autorizada do cliente OAuth e solicite o escopo Calendar Events e **acesso offline**. Autorize apenas a conta Google central escolhida para a Her Way, troque o authorization code por tokens e guarde **somente** o refresh token no ambiente privado do servidor.
6. Se a tela OAuth estiver em **Testing** com usuários externos, tokens de atualização podem expirar após 7 dias. Faça a publicação/configuração de produção e atenda às exigências de verificação do Google, quando aplicáveis. Nunca exponha tokens em tickets, GitHub, frontend ou chat.
7. Na Vercel, cadastre as variáveis abaixo em **Settings > Environment Variables**, apenas para o servidor (não use prefixo `NEXT_PUBLIC_`). Faça um novo deploy.

```dotenv
GOOGLE_CLIENT_ID=<OAuth Client ID>
GOOGLE_CLIENT_SECRET=<OAuth Client Secret>
GOOGLE_REFRESH_TOKEN=<OAuth refresh token da conta central>
GOOGLE_CALENDAR_ID=primary
```

A conta Google central é a organizadora dos eventos. As participantes recebem convite quando a API permite enviar convites. O Google Calendar precisa permitir reuniões do Google Meet para essa conta.

## Fluxo integrado

- A reserva é confirmada pela função existente `mentor_book_session` no Supabase.
- O frontend chama `POST /api/mentoria/meet` com autenticação Supabase. A rota valida a titularidade da reserva.
- A rota obtém um access token com o refresh token (servidor), cria um evento Google Calendar com `conferenceDataVersion=1` e uma conferência `hangoutsMeet`, e salva `google_event_id` e `meet_url` na reserva.
- O ID Google é determinístico a partir do UUID da reserva para impedir a duplicação de eventos nos retries.
- Como a conferência pode ser gerada assincronamente, `meet_status=pending` é válido; a aluna pode tentar novamente até haver link.
- O cancelamento na Her Way aciona `DELETE /api/mentoria/meet` para remover o evento Google, enviando atualizações aos convidados.
- Se a integração falhar, a reserva continua confirmada e o link deve ser recuperado por nova tentativa. O suporte deve acompanhar falhas de sincronização e cancelamento.

## Checklist antes de abrir ao público

1. Testar com uma conta de aluna e uma mentora aprovadas, com fotos cadastradas.
2. Confirmar que a reserva gerou UM evento e UM Meet, inclusive após clicar duas vezes / tentar novamente.
3. Conferir que emails das participantes receberam os convites quando aplicável.
4. Conferir links no painel da aluna e da mentora.
5. Confirmar que o cancelamento remove o evento na agenda Google.
6. Simular indisponibilidade da API Google e validar as mensagens de erro / retry.
7. Monitorar reservas com `meet_status != 'ready'` para atendimento.
8. Antes do lançamento geral, implementar reconciliação automática de reservas pendentes e cancelamentos com falha, sem depender exclusivamente do navegador da aluna.
