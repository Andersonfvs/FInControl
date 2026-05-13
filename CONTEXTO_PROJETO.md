# CONTEXTO_PROJETO.md
> Gerado automaticamente — resume cada módulo de `src/` e como eles se conectam.

---

## Visão Geral da Arquitetura

```
Firebase Auth ──► src/app/page.tsx (Login)
                        │ redirect
                        ▼
              src/app/dashboard/page.tsx  ◄──── Firebase Realtime DB
                   (orquestrador central)              (onValue)
                        │
          ┌─────────────┼──────────────────────────────────────┐
          │             │                                      │
      Hooks         Utils                               Components
  useDarkMode    financeiro.ts                    (ver seção abaixo)
  useIsMobile    categorias.ts
          │             │
      src/lib/firebase.ts  src/types/index.ts
```

O **Dashboard** é o único container com estado global (`sistema: SistemaFinanceiro`). Todos os componentes filhos são **controlados**: recebem dados via props e disparam callbacks para o Dashboard, que escreve no Firebase.

---

## Tipos de Dados (`src/types/index.ts`)

Definições centrais que fluem por toda a aplicação:

| Tipo | Papel |
|---|---|
| `Transacao` | Receita ou despesa. Campos opcionais: `cartaoId`, `parcelamento`, `quilometragem`, `notaFiscalUrl` |
| `CartaoCredito` | Cartão com `diaFechamento` e `diaVencimento` |
| `ItemFatura` | Item individual numa fatura de cartão |
| `Fatura` | Fatura mensal de um cartão (`cartaoId + mesReferencia`) |
| `Meta` | Meta financeira com `valorAlvo` e `dataLimite` |
| `ReservaEmergencia` | Saldo de reserva com cálculo de CDI e IR/IOF |
| `CategoriaCustomizada` | Categoria criada pelo usuário, com palavras-chave |
| `AtalhoRapido` | Botão de acesso rápido à despesa/receita mais comum |
| `SistemaFinanceiro` | Objeto raiz no Firebase: agrega todos os tipos acima |
| `Resumo` | Resultado calculado de `calcularResumo()` |
| `CategoriaTotal` | Resultado de `agruparPorCategorias()` (para gráficos) |

---

## Utilitários

### `src/utils/financeiro.ts`
Funções puras, sem efeitos colaterais:

- `gerarMesKey(data)` — gera chave `"YYYY-MM"` para indexar dados no Firebase
- `gerarId()` — ID único baseado em timestamp + random
- `formatarMoeda(valor)` — formata em BRL
- `formatarData / formatarDataCurta` — formatos de exibição de data
- `calcularResumo(transacoes, filtro)` — agrega receitas, despesas pagas/pendentes e saldos. Exclui categorias de benefício (Vale Alimentação, etc.) do total de receitas
- `agruparPorCategorias(transacoes, filtro)` — produz `CategoriaTotal[]` para gráficos
- `filtrarTransacoes / ordenarTransacoes` — helpers de lista
- `obterNomeMes` — nome do mês em português

**Dependências:** apenas `src/types/index.ts`

---

### `src/utils/categorias.ts`
Parser de linguagem natural e mapeamento de categorias:

- `obterIconeCategoria(categoria)` — retorna emoji via `MAPA_ICONES`
- `obterCategoriasDisponiveis()` — lista fixa de categorias de despesa
- `parsearInputMagico(input, usuario, cartoes?, cats?)` — **função central**. Extrai de texto livre: valor, data, pessoa, método de pagamento, cartão, parcelas, quilometragem e categoria. Retorna `DadosInputMagico | null`

**Lógica do parser (em ordem de execução):**
1. Extrair valor numérico
2. Extrair quilometragem (`45000km`)
3. Extrair data (`ontem`, `hoje`, `DD/MM`)
4. Detectar pessoa (`anderson`, `evelin`)
5. Detectar se é receita explícita
6. Extrair parcelas (`3x`)
7. Detectar método de pagamento e cartão (`credito nubank`)
8. Definir tipo (`renda` ou `despesa`)
9. Detectar categoria (customizadas → `MAPA_CATEGORIAS_PALAVRAS`)
10. Montar descrição com palavras restantes

**Dependências:** `src/types/index.ts`

---

## Infraestrutura Firebase (`src/lib/firebase.ts`)

Exporta dois singletons:
- `auth` — Firebase Authentication (email/senha, persistência via localStorage padrão)
- `database` — Firebase Realtime Database

Caminho dos dados: `usuarios/{uid}/` com sub-nós: `dadosPorMes`, `cartoes`, `faturas`, `categoriasCustomizadas`, `reservaEmergencia`, `metas`, `atalhosRapidos`.

---

## Hooks

### `src/hooks/useDarkMode.ts`
- Lê `localStorage('fincontrol-theme')` e `prefers-color-scheme`
- Aplica `data-theme="dark|light"` no `<html>`
- Exporta `{ darkMode, toggleDarkMode, mounted }`
- Usado pelo: `dashboard/page.tsx`

### `src/hooks/useIsMobile.ts`
- Detecta `window.innerWidth < 768` com listener de resize
- Exporta `boolean`
- Usado por: praticamente todos os componentes para adaptar layout

---

## Páginas (`src/app/`)

### `src/app/layout.tsx`
Layout raiz do Next.js. Injeta script anti-flash no `<head>` para aplicar tema antes do primeiro render (evita piscada branca).

### `src/app/page.tsx` — Página de Login
- Verifica sessão via `onAuthStateChanged` e redireciona para `/dashboard` se já logado
- Formulário com `signInWithEmailAndPassword`
- Layout responsivo: banner lateral (desktop) / formulário compacto (mobile)
- **Conexão:** só usa `src/lib/firebase.ts`

### `src/app/dashboard/page.tsx` — Orquestrador Central
O componente mais complexo do projeto. Responsabilidades:

**Estado mantido:**
- `sistema: SistemaFinanceiro` — todos os dados do usuário
- `dataReferencia` — mês navegado
- `filtro` — `"todos" | "anderson ferreira" | "evelin mulbaier"`
- `tabAtiva` — aba visível (`dashboard | transacoes | categorias | cartoes | metas`)
- Flags de modais abertos e dados de edição em andamento

**Assinaturas Firebase:**
- `onAuthStateChanged` — mantém `usuario` e redireciona se deslogado
- `onValue(usuarios/{uid})` — recebe todos os dados em tempo real e executa migração automática (arrays legados → formato atual)

**Handlers principais e o que fazem:**

| Handler | Ação Firebase |
|---|---|
| `handleInputMagico` | Cria `Transacao` ou `ItemFatura` dependendo do método de pagamento |
| `handleMarcarPago` | Alterna `pago` na transação do mês |
| `handleExcluir` | Remove transação; se for pagamento de fatura, reverte `fatura.paga` |
| `handleDuplicar` | Cria cópia da transação com data de hoje |
| `handleSalvarCartao` | Cria ou atualiza `CartaoCredito` |
| `handleExcluirItemFatura` | Remove item individual da fatura |
| `handleEditarItemFatura` | Edita item individual da fatura |
| `handleAdicionarCompra` | Distribui itens de compra parcelada por mês de fatura |
| `handleLancarItensCSV` | Importação de extrato PDF — lança itens via `handleAdicionarCompra` |
| `handlePagarFatura` | Cria `Transacao` de despesa e marca `fatura.paga = true` |
| `handleDesfazerPagamento` | Reverte pagamento: remove transação e marca `fatura.paga = false` |
| `handleSalvarCategorias` | Salva `categoriasCustomizadas` no Firebase |
| `handleSalvarReserva` | Salva `reservaEmergencia` no Firebase |

**Aba Dashboard renderiza:**
`MelhorCartao` → Cards de resumo → `InputMagico` → `AtalhosRapidos` → `AlertaFaturas` → `InsightsInteligentes` → `GraficoPizza` + `GraficoEvolucao` → `ReservaEmergencia` → `CustoKm` → Top 5 Gastos

**Modais globais (sempre montados no DOM):**
`ModalReceita`, `ModalDespesa`, `ModalCadastrarCartao`, `ModalCompraCartao`, `Toast`

---

## Componentes

### `src/components/Toast.tsx`
Notificação flutuante no canto inferior direito. Auto-fecha após 3,5 s. Tipos: `sucesso | erro | aviso | info`. Controlado por props (`visivel`, `mensagem`, `tipo`, `onFechar`).

---

### `src/components/InputMagico.tsx`
Campo de texto livre que chama `parsearInputMagico` e repassa o resultado via `onTransacaoCriada`. Exibe erro inline se o parser retornar `null`. Recebe lista de `cartoes` e `categoriasCustomizadas` para o parser usar.

**Conexão:** `src/utils/categorias.ts` → Dashboard via `onTransacaoCriada`

---

### `src/components/ListaTransacoes.tsx`
Aba "Transações". Exibe tabela (desktop) ou cards (mobile). Contém:
- Campo de busca por descrição/categoria/pessoa
- Ordenação por data/valor/categoria
- Campo "Input Mágico" inline (Enter para criar transação)
- Ações por linha: marcar pago, editar, duplicar, excluir

**Props recebidas do Dashboard:** `transacoes`, `usuarioNome`, `onEditar`, `onExcluir`, `onMarcarPago`, `onDuplicar`, `onInputMagico`, `onToast`

---

### `src/components/GestaoCartoes.tsx`
Aba "Cartões". O componente mais extenso após o Dashboard. Contém:

**Funcionalidades:**
- Listagem de cartões com resumo de fatura do mês
- Expansão inline para ver itens da fatura
- Editar/excluir item de fatura individualmente
- Botão "Pagar Fatura" e "Desfazer Pagamento"
- **Importação de extrato PDF**: parsers para Riachuelo/Midway, Bradesco, Bourbon, PicPay e formato genérico CSV
- Tela de conciliação: confronta itens importados com itens já cadastrados (tolerância de ±1 dia e valor exato) antes de lançar

**Parsers de extrato embutidos:** `parsearRiachuelo`, `parsearBradesco`, `parsearBourbon`, `parsearPicPay`, `parsearGenerico`

**Props recebidas do Dashboard:** cartões, faturas, mês de referência, transações, e callbacks para todas as operações

---

### `src/components/GestaoCategorias.tsx`
Aba "Categorias". Agrega despesas/receitas do mês por categoria (incluindo opcionalmente itens de faturas não pagas). Permite:
- Filtrar por tipo (despesas/receitas/todos)
- Ordenar por nome/valor/percentual
- Clicar em categoria para ver transações detalhadas (`ModalTransacoesCategoria`)
- Abrir `ModalGerenciarCategorias` para criar/editar categorias customizadas

---

### `src/components/ModalDespesa.tsx`
Modal de criação/edição de despesa. Escreve diretamente no Firebase (`ref database`). Detecta categoria automaticamente ao digitar na descrição. Suporta pré-preenchimento via `categoriaPreenchida`, `descricaoPreenchida` e `transacaoParaEditar`.

---

### `src/components/ModalReceita.tsx`
Modal de criação/edição de receita. Lógica similar ao `ModalDespesa`. Mescla categorias fixas de receita com as customizadas do usuário. Suporta `dadosIniciais` vindos do `InputMagico`.

---

### `src/components/ModalCadastrarCartao.tsx`
Modal para criar ou editar um `CartaoCredito`. Salva via callback `onSalvar` (o Dashboard escreve no Firebase).

---

### `src/components/ModalCompraCartao.tsx`
Modal para registrar compra num cartão específico com suporte a parcelamento. Gera array de `ItemFatura[]` (uma por parcela) e repassa via `onSalvar`.

---

### `src/components/AlertaFaturas.tsx`
Exibe alertas de faturas vencendo em até 7 dias ou já vencidas (até 30 dias). Verifica os 3 meses ao redor do mês atual. Visual diferenciado por urgência (vermelho/laranja/azul). Retorna `null` se não há alertas.

**Conexão:** recebe `cartoes` e `faturas` do Dashboard (sem callbacks)

---

### `src/components/InsightsInteligentes.tsx`
Analisa `transacoesAtual` vs `transacoesAnterior` e produz insights automáticos:
- Variação de gastos vs mês anterior (>15% alerta, <-10% elogio)
- Categoria dominante do mês
- Categoria que mais cresceu (>30%)
- Saldo positivo/negativo
- Despesas pendentes
- Dica de economia quando há alertas

Retorna `null` se não há insights.

---

### `src/components/GraficoPizza.tsx`
Gráfico de pizza SVG puro (sem biblioteca). Top 5 categorias de despesa. No mobile, pizza acima da legenda; no desktop, lado a lado.

**Conexão:** recebe `categorias: CategoriaTotal[]` calculadas no Dashboard

---

### `src/components/GraficoEvolucao.tsx`
Gráfico de linhas SVG com evolução dos últimos 6 meses (3 no mobile). Duas linhas: receitas (verde) e despesas (vermelho).

**Conexão:** recebe `dados[]` com `{ mes, receitas, despesas, saldo }` calculados no Dashboard

---

### `src/components/ReservaEmergencia.tsx`
Gerencia a reserva de emergência com cálculo de rendimento CDI:
- Simula rendimento com taxa diária CDI sobre cada depósito
- Aplica tabela de IOF (regressiva 30 dias) e alíquota de IR regressiva
- Crédito automático de CDI mensal
- Exibe extrato com histórico de depósitos/retiradas e rendimento bruto/líquido

Escreve via `onSalvar` (callback para o Dashboard).

---

### `src/components/CustoKm.tsx`
Calcula custo por km do veículo a partir de transações com campo `quilometragem`. Analisa todos os meses, ordena os pontos de KM por odômetro crescente, calcula km percorridos entre abastecimentos e custo médio. Exibe apenas se houver mínimo de 2 registros.

**Conexão:** recebe `dadosPorMes` completo (todos os meses)

---

### `src/components/AtalhosRapidos.tsx`
Botões de acesso rápido configuráveis. Persiste em `usuarios/{uid}/atalhosRapidos` no Firebase (independente do Dashboard). Modo de edição permite remover atalhos. Abre `ModalNovoAtalho` para adicionar.

**Conexão:** acessa Firebase diretamente + repassa `onAtalhoClick` ao Dashboard para abrir modal correspondente

---

### `src/components/MelhorCartao.tsx`
Banner informativo que calcula qual cartão usar hoje para maximizar o prazo de pagamento. Algoritmo: `dias até fechamento + dias entre fechamento e vencimento` → cartão com maior prazo é o "melhor". Retorna `null` se não há cartões.

---

### `src/components/ModalTransacoesCategoria.tsx`
Modal que lista todas as transações de uma categoria específica. Aberto por `GestaoCategorias`.

---

### `src/components/ModalGerenciarCategorias.tsx`
Modal para criar, editar e excluir categorias customizadas. Inclui campo de palavras-chave para auto-detecção. Salva via `onSalvarCategorias` → Dashboard → Firebase.

---

### `src/components/ModalNovoAtalho.tsx`
Modal para criar novo atalho rápido. Aberto por `AtalhosRapidos`.

---

### `src/components/LeitorQRCode.tsx`
Componente para leitura de QR Code (NF-e). Integração com câmera do dispositivo.

---

## Diagrama de Conexões (resumido)

```
Firebase DB ◄──────────────────────────────────────────────────────┐
     │                                                             │
     ▼                                                             │
dashboard/page.tsx (estado global: sistema, usuario, filtro, tab)  │
     │                                                             │
     ├── InputMagico ──► categorias.ts:parsearInputMagico          │
     │       └──► onTransacaoCriada ──► handleInputMagico ─────────┤
     │                                                             │
     ├── AtalhosRapidos ──► Firebase (atalhosRapidos)              │
     │       └──► onAtalhoClick ──► abre ModalDespesa/ModalReceita │
     │                                                             │
     ├── ModalDespesa / ModalReceita ──► Firebase (dadosPorMes) ───┤
     │                                                             │
     ├── ModalCadastrarCartao ──► onSalvar ──► handleSalvarCartao ─┤
     │                                                             │
     ├── ModalCompraCartao ──► onSalvar ──► handleAdicionarCompra ─┤
     │                                                             │
     ├── GestaoCartoes ──► onPagarFatura / onLancarItensCSV ───────┤
     │       └── parsers PDF (Riachuelo, Bradesco, PicPay…)        │
     │                                                             │
     ├── GestaoCategorias ──► onSalvarCategorias ─────────────────┤
     │       ├── ModalTransacoesCategoria                          │
     │       └── ModalGerenciarCategorias                          │
     │                                                             │
     ├── ReservaEmergencia ──► onSalvar ──► handleSalvarReserva ───┘
     │
     ├── [display only, sem callbacks para DB]
     │       ├── AlertaFaturas
     │       ├── InsightsInteligentes
     │       ├── GraficoPizza
     │       ├── GraficoEvolucao
     │       ├── MelhorCartao
     │       └── CustoKm
     │
     └── ListaTransacoes ──► onEditar/onExcluir/onMarcarPago → Dashboard
             └── InputMagicoField (embutido)
```

---

## Padrões e Convenções

- **Mês key:** sempre `"YYYY-MM"` via `gerarMesKey()`. Nunca construir manualmente.
- **IDs:** `gerarId()` → `Date.now()_randomBase36`. Nunca usar índice de array como ID.
- **Datas:** armazenadas como `"YYYY-MM-DD"` (string ISO sem hora). Ao construir `new Date()` a partir delas, sempre adicionar `T00:00:00` para evitar problemas de timezone.
- **Escrita Firebase:** sempre `set()` substituindo o array/objeto inteiro. Não há `push()` ou `update()` incremental — tudo é read-modify-write.
- **Estilização:** inline styles com ternários dark mode. Sem CSS modules ou Tailwind (exceto classes globais do `globals.css`).
- **Responsividade:** `useIsMobile()` para alternar layouts. Breakpoint: 768px.
- **Categorias benefício:** Vale Alimentação, Vale Refeição, Vale Transporte não entram no total de receitas de `calcularResumo` — têm card próprio no Dashboard.
