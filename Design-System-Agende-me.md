# Design System — Agende-me

> Sistema visual inferido a partir do print da tela de agenda mensal. Os valores de cor são aproximados e devem ser validados contra os arquivos-fonte da marca antes de entrar em produção.

## 1. Direção visual

A interface combina **produtividade**, **clareza operacional** e **acolhimento**. O azul-marinho é a cor de confiança e navegação; o lilás marca eventos e informações de calendário; o verde representa progresso/conexão; o vermelho é reservado para alertas e estados críticos.

### Princípios

1. **Agenda em primeiro lugar:** a grade mensal ocupa a maior área e deve permanecer visualmente leve.
2. **Hierarquia por contraste:** azul-marinho para ações e títulos; cinza-azulado para navegação secundária; superfícies brancas para reduzir ruído.
3. **Ações previsíveis:** ações primárias têm preenchimento sólido; ações secundárias usam contorno ou superfície neutra.
4. **Estados reconhecíveis:** não depender somente de cor; combinar cor, ícone, texto ou forma.
5. **Densidade confortável:** usar bastante espaço em branco e separadores discretos.

---

## 2. Foundations

### 2.1 Cores

| Token | Valor aproximado | Uso |
|---|---:|---|
| `color.brand.900` | `#071854` | Barra superior, botão primário, data selecionada, FAB |
| `color.brand.800` | `#10286F` | Hover de ações principais |
| `color.brand.700` | `#1F3D91` | Foco, links e elementos ativos |
| `color.brand.100` | `#EAF0FF` | Fundo de item ativo/selecionado |
| `color.text.900` | `#1A1736` | Títulos e conteúdo principal |
| `color.text.700` | `#46536C` | Navegação, labels e texto secundário |
| `color.text.500` | `#9199AE` | Placeholder, datas fora do mês, ícones inativos |
| `color.surface.0` | `#FFFFFF` | Fundo principal, cards e células |
| `color.surface.50` | `#F9FAFB` | Fundo de áreas auxiliares |
| `color.surface.100` | `#F0F2F6` | Item de navegação selecionado, inputs |
| `color.border.100` | `#E6EBF1` | Divisórias e contornos suaves |
| `color.event.100` | `#F0EEF7` | Fundo dos eventos da agenda |
| `color.event.700` | `#431854` | Texto dos eventos |
| `color.success.500` | `#20B873` | Progresso e conexão |
| `color.warning.500` | `#E8B83D` | Etapa pendente/atenção |
| `color.danger.500` | `#D94848` | Desconectado, notificações e erros |

**Regra:** azul-marinho é a ação principal; lilás é semântico para eventos; vermelho não deve ser usado como decoração.

### 2.2 Tipografia

Fonte recomendada: `Inter`, com fallback `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

| Estilo | Tamanho | Peso | Altura de linha | Uso |
|---|---:|---:|---:|---|
| `display-sm` | 24 px | 700 | 32 px | Mês/título principal |
| `heading-sm` | 18 px | 700 | 24 px | Nome da marca e títulos de seção |
| `body-md` | 16 px | 500–600 | 24 px | Navegação e botões |
| `body-sm` | 14 px | 500 | 20 px | Conteúdo e labels |
| `caption` | 12 px | 600 | 16 px | Dias da semana, status e metadados |
| `overline` | 11 px | 700 | 14 px | Indicadores de etapa |

Use capitalização normal em títulos. Evite texto todo em caixa alta, exceto para abreviações dos dias da semana.

### 2.3 Espaçamento

Escala base de 4 px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

- Padding interno de item de menu: `12 px 16 px`.
- Distância entre ícone e texto: `12 px`.
- Padding de controles compactos: `8 px 12 px`.
- Gutter principal da agenda: `8–16 px`.
- Área útil mínima de toque: `44 × 44 px`.

### 2.4 Raios e elevação

- `radius.sm = 6 px`: chips e pequenos controles.
- `radius.md = 12 px`: botões e itens de navegação.
- `radius.lg = 16 px`: cards e contêineres.
- `radius.full = 999 px`: pills, avatar, data selecionada e FAB.
- `shadow.sm = 0 2px 8px rgba(7,24,84,.08)`.
- `shadow.md = 0 8px 24px rgba(7,24,84,.14)`.

A tela privilegia bordas e separadores; sombras devem ser usadas apenas para elementos flutuantes.

---

## 3. Layout

### Estrutura desktop

- **Sidebar:** `272 px` de largura aproximada, fundo `surface.0`, separada por uma linha vertical.
- **Topbar:** `72 px` de altura aproximada, fundo `brand.900`.
- **Área de conteúdo:** flexível, com calendário ocupando a largura restante.
- **Painel de mini-calendário:** `328 px` aproximadamente, separado da grade por borda vertical.
- **Grade principal:** 7 colunas iguais; cinco linhas de semanas no exemplo.

### Grid de calendário

- Cabeçalho dos dias: altura aproximada de `32 px`.
- Células: borda de `1 px` em `border.100`.
- Número do dia: alinhado no topo, com `12–16 px` de respiro.
- Evento: alinhado abaixo do número, com altura de `20–24 px`.
- Overflow: quando houver mais eventos, exibir `+N eventos` em vez de comprimir o conteúdo.

### Responsividade

- **≥ 1200 px:** sidebar fixa + mini-calendário + grade mensal.
- **768–1199 px:** sidebar recolhível; mini-calendário pode virar drawer.
- **< 768 px:** navegação inferior ou sidebar em drawer; calendário com rolagem horizontal ou visão semanal; esconder textos auxiliares da topbar.

---

## 4. Componentes

### 4.1 Sidebar / navegação lateral

**Anatomia:** logo, botão primário “Adicionar”, itens de navegação, estado de conexão do WhatsApp, item “Menu”.

- Item padrão: texto `text.700`, ícone `text.500`.
- Item ativo: fundo `surface.100`, texto `brand.900`, ícone `brand.900`, raio `16 px`.
- Hover: fundo `brand.100`.
- Foco: outline de `2 px` em `brand.700`, offset `2 px`.
- “Desconectado”: texto `danger.500` em `12 px`, acompanhado de indicador textual; não usar apenas um ponto vermelho.

### 4.2 Botão primário

- Fundo: `brand.900`.
- Texto: branco, `16 px`, peso `700`.
- Altura: `44 px`.
- Raio: `12 px`.
- Hover: `brand.800`.
- Pressed: `brand.700`.
- Disabled: fundo `#CBD2DF`, texto `#FFFFFF`.

Exemplo: `+ Adicionar`.

### 4.3 Botão de ação suave / pill

Usado para “Hoje”, seletor de visualização e ações compactas.

- Fundo: branco ou `surface.50`.
- Borda: `1 px solid border.100`.
- Altura: `36–40 px`.
- Raio: `999 px`.
- Texto: `text.900`.

### 4.4 Topbar de progresso

- Fundo `brand.900`.
- Indicador com cinco etapas: círculos conectados por linha.
- Etapas concluídas: `success.500`.
- Etapa atual: círculo preenchido verde ou destacado com anel.
- Etapas futuras: contorno em azul claro/cinza.
- Texto auxiliar: `caption`; título da etapa: `body-md` em branco.
- Ação “Divulgar”: pill azul-claro com texto `brand.900`.

### 4.5 Mini-calendário

- Título do mês com navegação anterior/próximo.
- Dias da semana em `caption`, centralizados.
- Data atual/selecionada: círculo de `36 px`, fundo `brand.900`, texto branco.
- Datas fora do mês: `text.500`.
- Link inferior “Compartilhar agenda”: ícone de compartilhar + texto em `brand.900`.

### 4.6 Calendário mensal

**Cabeçalho:** mês, botão “Hoje”, setas, seletor “Mês” e notificações.

**Célula padrão:**
- Fundo branco.
- Número em `14 px`, peso `600`.
- Borda suave.
- Hover de célula: fundo `surface.50`.

**Dia selecionado:** número dentro de círculo `24 px`, fundo `brand.900`, texto branco.

**Evento:**
- Fundo `event.100`.
- Texto `event.700`.
- Raio `4–6 px`.
- Padding horizontal `6 px`.
- Texto truncado com ellipsis em uma linha.
- Altura recomendada `20 px`.

### 4.7 FAB / ação flutuante

- Círculo de `56 px`.
- Fundo `brand.900`.
- Ícone de adição branco, `24 px`.
- Sombra `shadow.md`.
- Posição: `24 px` da direita e `16–24 px` do rodapé.
- Tooltip obrigatório em desktop e label acessível sempre disponível.

### 4.8 Notificação

- Ícone de sino em `text.700`.
- Badge circular vermelho de `20–22 px`.
- Número branco em `caption` bold.
- O badge deve ter alternativa acessível, por exemplo: “2 notificações não lidas”.

---

## 5. Estados

Todo componente interativo deve definir: `default`, `hover`, `focus-visible`, `pressed`, `disabled` e `loading` quando aplicável.

### Estados semânticos

- **Sucesso/conectado:** verde + texto “Conectado”.
- **Atenção:** amarelo + mensagem orientativa.
- **Erro/desconectado:** vermelho + ação de recuperação.
- **Informativo:** lilás/azul + contexto adicional.

### Acessibilidade

- Contraste mínimo WCAG AA para texto normal: `4.5:1`.
- Não comunicar seleção apenas com cor: combinar círculo, peso e/ou borda.
- Navegação por teclado com foco visível em todos os controles.
- Ícones decorativos com `aria-hidden="true"`; ícones de ação com nome acessível.
- Calendário deve expor cabeçalhos de coluna e data completa para leitores de tela.
- Botões somente com ícone precisam de `aria-label`.

---

## 6. Tokens prontos para CSS

```css
:root {
  --color-brand-900: #071854;
  --color-brand-800: #10286f;
  --color-brand-700: #1f3d91;
  --color-brand-100: #eaf0ff;
  --color-text-900: #1a1736;
  --color-text-700: #46536c;
  --color-text-500: #9199ae;
  --color-surface-0: #ffffff;
  --color-surface-50: #f9fafb;
  --color-surface-100: #f0f2f6;
  --color-border-100: #e6ebf1;
  --color-event-100: #f0eef7;
  --color-event-700: #431854;
  --color-success-500: #20b873;
  --color-warning-500: #e8b83d;
  --color-danger-500: #d94848;

  --font-family-sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  --shadow-sm: 0 2px 8px rgb(7 24 84 / 8%);
  --shadow-md: 0 8px 24px rgb(7 24 84 / 14%);
}
```

---

## 7. Critérios de aceite visual

- A navegação ativa é identificável sem depender apenas de cor.
- O mês e a ação principal são encontrados em até 2 segundos.
- A grade continua legível com eventos curtos e longos.
- Nenhum texto essencial é cortado em larguras de 768 px ou mais.
- Todos os controles têm estados de foco e área de toque mínima de `44 px`.
- O azul-marinho permanece reservado para alta prioridade e ações principais.
- O lilás aparece somente em eventos/itens de agenda e não compete com o CTA principal.
