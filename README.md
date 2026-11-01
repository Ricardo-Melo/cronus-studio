# Cronus — Sistema Web para Manicure & Pedicure

Sistema web completo e responsivo para que a profissional manicure e pedicure cadastre e gerencie seus procedimentos e que os clientes realizem agendamentos online com pagamento instantâneo via Pix ou Cartão de Crédito.

---

## 🎨 Fidelidade ao Design System "Agende-me"

- **Cores Oficiais**:
  - `brand.900` (`#071854`): Topbar, botões primários, data selecionada no calendário, FAB flutuante.
  - `brand.800` (`#10286F`): Hover de botões e ações principais.
  - `brand.100` (`#EAF0FF`): Fundo de itens ativos e badges suaves.
  - `event.100` (`#F0EEF7`) & `event.700` (`#431854`): Identificação visual semântica lilás para eventos e horários marcados na grade.
  - `success.500` (`#20B873`): Status WhatsApp "Conectado", etapas concluídas e pagamentos aprovados.
  - `danger.500` (`#D94848`): Badge de notificações e alertas.
- **Tipografia**: `Inter` (Google Fonts), com escala tipográfica completa (`display-sm`, `heading-sm`, `body-md`, `body-sm`, `caption`, `overline`).
- **Layout & Dimensões**:
  - **Sidebar:** `272 px` fixa com navegação, status WhatsApp e botão "+ Adicionar" primário (44 px, raio 12 px).
  - **Topbar:** `72 px` em `#071854`, com botão pill "Divulgar", sino com badge vermelho e alternador de perfil.
  - **Mini-calendário:** `328 px` com dia selecionado em círculo `#071854` de 36 px e botão "Compartilhar agenda".
  - **Grade Principal do Mês:** 7 colunas, células com hover suave em `surface.50`, eventos lilás e indicador de hoje.
  - **FAB:** Botão flutuante de `56 px` em `#071854` posicionado a `24 px` das margens.

---

## 🚀 Principais Funcionalidades

### 1. Painel de Gestão da Manicure / Pedicure (Admin)
- **Cadastro e Gestão de Serviços (CRUD)**:
  - Adição, edição e exclusão de procedimentos.
  - Definição de nome, categoria (Mãos, Pés, Combos, Gel & Alongamento, Spa & Cuidados), preço (R$), tempo de atendimento (30 a 120 min), descrição e foto ilustrativa.
  - Botão de ativação/pausa de serviço em tempo real.
- **Agenda Completa & Inteligente**:
  - Grade mensal com navegação de meses e botão "Hoje".
  - Mini-calendário com resumo diário e contagem de clientes.
  - Clique em qualquer dia ou agendamento para abrir detalhes completos, link direto para conversar no WhatsApp da cliente e opção de cancelamento.
  - Botão para adicionar agendamentos manuais (clientes presenciais ou por telefone).
- **Controle Financeiro**:
  - Métricas de faturamento do mês, faturamento do dia, total de clientes e ticket médio.
  - Tabela detalhada de recebimentos com filtro por Pix e Cartão.
- **Carteira de Clientes**:
  - Listagem com histórico de atendimentos, total investido e data da última visita.
- **Configurações do Studio**:
  - Edição do nome do espaço, profissional responsável, chave Pix para receber os pagamentos, horário de abertura/fechamento e WhatsApp comercial.

### 2. Portal do Cliente (Agendamento & Pagamento Online)
- **Fluxo em 5 Etapas Guiadas**:
  1. **Serviços**: Filtro por categoria, seleção múltipla (ex: Manicure + Pedicure), fotos de alta qualidade e barra flutuante de resumo com duração total e valor.
  2. **Data & Horário**: Mini-calendário interativo e chips de horários livres calculados dinamicamente (evitando automaticamente qualquer sobreposição com horários já ocupados).
  3. **Seus Dados**: Nome completo, telefone/WhatsApp com formatação automática, e-mail e campo de observações.
  4. **Pagamento Online Integrado**:
     - **PIX Instantâneo**: Geração de QR Code real em alta definição, código "Pix Copia e Cola" com botão de cópia rápida, cronômetro de 15 minutos e botão de **Simulação de Pagamento Aprovado** para teste imediato.
     - **Cartão de Crédito**: Preview visual do cartão em tempo real, validação de dados e parcelamento em até 3x sem juros.
  5. **Confirmação & Voucher Digital**: Comprovante com código do agendamento (`#AG-XXXX`), botão para notificar a manicure no WhatsApp com mensagem pré-formatada e botão para adicionar direto no Google Agenda.

---

## 💻 Como Executar

### Opção 1: Servidor Local Node.js
```bash
# Na pasta do projeto:
node server.js
```
Acesse no seu navegador: `http://localhost:5173`

### Opção 2: Abrir diretamente no Navegador
Você também pode abrir o arquivo `index.html` diretamente em qualquer navegador moderno.

---

## 📁 Estrutura de Arquivos

```
maoepe/
├── index.html                  # Interface principal (Admin + Portal do Cliente)
├── server.js                   # Servidor HTTP local Node.js
├── package.json                # Metadados e scripts do projeto
├── qrcode.min.js               # Biblioteca para geração de QR Code Pix
├── Design-System-Agende-me.md  # Especificação do Design System
├── assets/                     # Fotos de alta qualidade dos procedimentos
│   ├── manicure.jpg            # Foto profissional de manicure / esmaltação
│   ├── pedicure.jpg            # Foto de spa dos pés e pedicure relaxante
│   └── nailart.jpg             # Foto de nail art e alongamento fibra de vidro
├── css/
│   ├── design-system.css       # Tokens, cores, tipografia, botões, modais
│   ├── admin.css               # Sidebar 272px, Topbar 72px, Mini-cal 328px, Grade
│   └── booking.css             # Fluxo de etapas, QR Code Pix, cartão, voucher
└── js/
    ├── data.js                 # Data store, persistência localStorage, CRUD
    ├── calendar.js             # Grade de 7 colunas, mini-cal e slots livres
    ├── admin.js                # Gestão de serviços, financeiro, clientes
    ├── booking.js              # Agendamento do cliente, Pix e Cartão
    └── app.js                  # Orquestrador central, navegação e notificações
```
