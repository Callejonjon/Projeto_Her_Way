# Her Way · Avatar Pixel Art v2 — contrato de produção

## Objetivo
Evitar o problema de cabelo, corpo e roupa criados para personagens diferentes. **Não publicar sprites da versão 1.** A versão 2 só permite camadas realmente compatíveis e revisadas.

## Arquivos
- `base/body_master_01.png` — corpo mestre; determina pose e proporções.
- `hair/*.png` — apenas cabelo (cabelo traseiro/frontal quando necessário).
- `tops/*.png` — tronco e braços vestidos, já alinhados ao corpo-base.
- `bottoms/*.png` — calça/saia alinhada à cintura.
- `accessories/*.png` — acessórios visíveis.
- `pets/*.png` — figuras independentes, no chão do cenário.
- `scenes/*.webp` — fundos 6:5, **sem** personagem.
- `manifest.json` — objetos com ids, categoria, caminho, dimensões e pack_version 2.

## Regras de aceitação
1. Cada camada de personagem deve ser PNG RGBA **256 × 256**, mesmo enquadramento.
2. Não trocar corpo, cabeça, pose ou proporções entre peças.
3. Âncoras: centro x=128; topo da cabeça y=24; olhos y=94; ombros y=131; cintura y=177; chão y=242.
4. A transparência deve ser verdadeira: nada de quadriculado fixo ao fundo.
5. Cabelo não revela borda de cabeça ou outro cabelo; roupa encaixa nos braços; calça encaixa na cintura.
6. Conferir pelo menos três looks completos visualmente antes de marcar `review_state=approved`.
7. Verificar funcionamento em desktop e mobile, salvamento no Supabase, RLS e desbloqueios de XP.
8. Os materiais de referência não demonstram, por si só, compatibilidade de camadas.
9. A aparência do avatar só pode usar registros com `pack_version>=2`, `review_state=approved` e `active=true`.

## Prompts de referência
**Cabelo**: "Com esta imagem obrigatória do corpo-base, desenhe APENAS o cabelo [TIPO], no mesmo canvas RGBA 256x256. Não altere posição da cabeça, pose, rosto ou pixels do corpo. Pixels nítidos, arte chibi premium, sem fundo, sem checkerboard. Entregue a camada exportável alinhada ao mestre."

**Roupa**: "Desenhe APENAS a roupa [TIPO] sobre o corpo mestre fornecido. PNG RGBA 256x256, torso/ombros/cintura idênticos à referência, sem recriar outro corpo. Garanta que mãos, tronco e pernas não tenham cortes."

**Cenário**: "Crie quarto cozy pixel art 6:5, espaço central livre, janela e mesa discretas, sem personagem nem pet."

## Estado da migração
Os antigos arquivos estão preservados para revisão, mas tiveram `active=false` por não passarem no padrão de composição. O gatilho `avatar_asset_publication_guard` bloqueia novas publicações sem validação v2. O editor permanece com fallback informativo até termos combinação visualmente aprovada.

## Próxima validação
Recriar uma base e três conjuntos, com imagens de cada peça geradas especificamente sobre o mesmo corpo. Comparar a composição final com o mockup aprovado, sem ativar os assets apenas porque a dimensão está correta.
