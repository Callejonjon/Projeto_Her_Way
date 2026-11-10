# Her Way — Importação de conteúdos reais

Origem: 12 arquivos ZIP fornecidos pela equipe em 10/11/2026. Foram preparados 19 módulos com 287 slides textuais e 120 questões de múltipla escolha (8 quizzes), com respostas comentadas.

## Passos

1. No painel Supabase do projeto da Her Way, execute o conteúdo de `supabase_learning_catalog.sql` no SQL Editor. Execute apenas uma vez e verifique se a tabela `learning_modules` aparece.
2. Para sua conta administrativa de teste, em Table Editor > profiles localize o registro cujo ID corresponde à sua própria conta e marque `is_admin = true`. Não autorize outros usuários.
3. Saia e entre novamente no Preview da Vercel para renovar o estado da sua conta.
4. Acesse `/admin/conteudos`, selecione `catalog.json` extraído do pacote de importação e clique em **Importar para o Supabase**.
5. Confirme na tabela `learning_modules` que os 19 registros foram criados. Verifique `published` e `review_required`.
6. Acesse `/cursos` com uma conta aluna de teste, abra aulas e responda aos quizzes. Verifique que as conclusões aparecem em `modules_progress`.

## Cuidados
- A importação exige autenticação e permissão de administradora no banco. A autorização é validada por RLS, não por um botão.
- Cursos com `review_required=true` são importados como não publicados (CPA-20, certificações e Imposto de Renda): precisam de validação normativa antes de ativar.
- Os slides são textos extraídos de PPTX. Os recursos gráficos originais não são incorporados nessa versão inicial.
- O quiz de Produtos Bancários e Derivativos, questão 11, teve uma quebra de linha corrigida automaticamente; revisão editorial recomendada antes de publicar.
- Para essa versão, a conclusão de aula sem quiz é registrada com uma nota sintética de 100 no schema legado (`modules_progress`) e rende 30 XP; antes do lançamento, separar explicitamente conclusão de leitura e nota de avaliação.
- Segurança: o cálculo de XP atual é iniciado no cliente. Para uso público, implementar atribuição de XP em transação ou função segura no servidor, com proteção contra repetição.
- O catálogo só aparece após importação e publicação; o código evita mostrar módulos fictícios quando Supabase está configurado.
- A confirmação de deploy não equivale a teste funcional end-to-end.
