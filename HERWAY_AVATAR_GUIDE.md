# Her Way — Cursos abertos, materiais originais e professores-IA

## O que está implementado no código
- `/cursos` oferece todos os módulos **publicados** das jornadas Primeiros Passos, Novos Horizontes e comuns. Não há bloqueio de pré-requisito na biblioteca.
- `/jornada` permanece filtrado por trilha e com desbloqueio de progressão, usando os mesmos IDs de módulos.
- Os recursos de cada curso podem incluir PDF para leitura, PowerPoint original, PDF do quiz e vídeo com avatar, além do texto acessível e do quiz interativo.
- `/admin/conteudos` inclui upload múltiplo (identificação automática por nome do arquivo) e cadastro de roteiro, transcrição, resumo e link HTTPS do vídeo.
- Os uploads usam um bucket privado no Supabase, com RLS para administração e acesso autenticado a conteúdos publicados.

## O que a responsável precisa fazer no Supabase (em ordem)
1. Abra SQL Editor do projeto `etjzuismhjnhwvkhtxga`.
2. Copie e execute **todo** o arquivo `supabase_learning_media.sql` desta branch. Isso adiciona a tabela `learning_assets`, o bucket privado `learning-materials` e as colunas de IA sem apagar os dados existentes.
3. Acesse `/admin/conteudos` na versão Preview desta branch com a conta administradora.
4. Baixe `herway_materiais_para_upload.zip` disponibilizado na conversa, extraia o ZIP e selecione os arquivos de dentro das pastas `pdf/`, `pptx/` e `quizzes/` usando **Selecionar vários arquivos**. Dependendo do navegador, selecione os arquivos de uma pasta por vez.
5. Confira a quantidade reconhecida e clique **Enviar materiais ao Supabase**. PDF e PPTX são associados pelo nome do arquivo cadastrado no catálogo. Se houver arquivos não reconhecidos, a página lista os nomes; nenhum é descartado silenciosamente.
6. Abra uma aula no Preview e confirme se o PDF abre, o PPTX baixa, o quiz abre e a jornada continua independente.
7. Para adicionar um vídeo-avatar: gere o vídeo com outra ferramenta, hospede o arquivo em um serviço que ofereça URL HTTPS reproduzível e, no painel admin, escolha o curso, preencha URL, roteiro/resumo/transcrição e salve.

## Roteiro-padrão de vídeo para outra IA
Você é uma professora virtual da **Her Way**, plataforma de educação e carreira para mulheres que desejam atuar no mercado financeiro brasileiro.

Transforme o material didático fornecido em um vídeo educativo em **português do Brasil**, duração de **3 a 5 minutos**, com:
- abordagem profissional, envolvente, acolhedora e objetiva, sem linguagem infantilizada;
- uma introdução curta explicando a utilidade prática do tema;
- três conceitos principais, explicados sem inventar dados, leis ou métricas;
- um exemplo prático situado no mercado financeiro brasileiro;
- uma recapitulação e uma pergunta reflexiva para preparar o quiz;
- um roteiro com frases naturais e pausas; linguagem adequada a uma apresentadora virtual;
- uma transcrição fiel, um resumo curto de até 500 caracteres e sugestão de título do vídeo.

**Não** invente conteúdo que não aparece no material de origem. Se houver informações potencialmente desatualizadas (ANBIMA, certificações, impostos, taxas), coloque uma indicação **REVISÃO NECESSÁRIA** e não afirme que normas estão atualizadas. Não afirme que a apresentadora virtual é uma pessoa real.

**Identidade visual:** fundo profissional azul-marinho, rosa moderado, composição limpa e widescreen 16:9. A apresentadora é um avatar digital adulto, com expressão natural, roupas profissionais contemporâneas, boa iluminação, legendas pt-BR revisadas e pronúncia correta de termos de finanças.

Entregue 1) roteiro de fala; 2) orientações visuais por cena; 3) resumo; 4) transcrição; 5) título; 6) checklist de fatos a revisar. **Não gere vídeo até a aprovação do roteiro.**

**Tema:** [TÍTULO DO CURSO]
**Jornada:** [PRIMEIROS PASSOS / NOVOS HORIZONTES / AMBAS]
**Material-fonte:** [ANEXAR PDF OU PPTX ORIGINAL].

## Observações
- Materiais com `published=false` continuam ocultos das alunas; uma mudança na biblioteca não publica cursos pendentes de revisão.
- Esse MVP não gera vídeos automaticamente pela API. Ele permite hospedar e exibir vídeos prontos; chat da aula e tutor interativo são etapas futuras.
- Vídeos externos publicados pelo provedor podem ser acessíveis a qualquer pessoa que tenha a URL. Para preservar a privacidade, use hospedagem apropriada ou o bucket privado com upload autenticado (e ajuste o painel para incluir MP4).
- Os 19 PDFs são **versões convertidas** dos 19 PPTX. Deve-se conferir a fidelidade visual, especialmente fórmulas e diagramas. Os PPTX originais foram preservados.
- Verifique se os autores autorizaram a disponibilização às alunas. Direitos sobre imagens e fontes incorporadas também precisam ser revisados.
