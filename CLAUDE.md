# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ REGRA OBRIGATÓRIA — LEIA PRIMEIRO

**Antes de qualquer tarefa neste projeto:**
1. Leia `CONTEXTO_PROJETO.md` na raiz do projeto — mapa de todos os módulos
2. Leia `SESSOES_E_PROGRESSO.md` no Obsidian (`Fin Control Brain/Fin Control/`) — histórico completo de sessões, quirks e arquivos críticos
3. Use esses arquivos como mapa — NÃO faça scan de toda a pasta `/src`
4. Só abra arquivos específicos que forem necessários para a tarefa pedida

## Project Overview

**FinControl** is a family financial control application built with Next.js 16, React 19, and Firebase. It's a full-stack web app for managing personal finances with credit card tracking, transaction categorization, and intelligent insights.

**Deployed on:** Firebase Hosting (static export)
**Firebase Project:** `nossas-contas-ed340-v2`
**Users:** Anderson Ferreira (andersonfvsti@gmail.com) and Evelin Mulbaier (evelinmulbaier@gmail.com)

## Development Commands

```bash
# Install dependencies
npm install

# Development server (hot reload, http://localhost:3000)
npm run dev

# Production build (static export to /out)
npm run build

# Run production server locally
npm start

# Lint code with ESLint
npm run lint
```

**Note:** This is a static-export Next.js app (`next.config.js` sets `output: 'export'`), so no server runtime—everything renders on the client or uses client-side Firebase queries. The `/out` directory is deployed to Firebase Hosting.

## Architecture

### Core Data Flow

1. **Authentication:** Firebase Auth (email/password) via `src/lib/firebase.ts`
   - User login at `/` routes to `/dashboard` on success
   - `onAuthStateChanged` persists browser auth state automatically
   - User object passed down to components that need `userId`

2. **Realtime Database:** Firebase Realtime Database at path `usuarios/{uid}/`
   - Structure: `dadosPorMes`, `cartoes`, `faturas`, `categoriasCustomizadas`, `reservaEmergencia`, `metas`, `pessoasCadastradas`
   - Data subscribed via `onValue()` in dashboard; changes auto-sync to UI
   - All writes use `set()` to replace entire nested objects (not incremental updates)

3. **State Management:** React hooks + callback lifting
   - Dashboard (`src/app/dashboard/page.tsx`) is the main container; holds all user data in `sistema` state
   - Child components receive data + handlers as props
   - Modals are controlled via boolean flags (e.g., `modalDespesaAberto`)

### Key Data Types

Located in `src/types/index.ts`:

- **Transacao:** Single transaction (income/expense). Has `tipo` ('despesa'|'renda'), optional `cartaoId`, optional `parcelamento` for installments
- **CartaoCredito:** Credit card with `diaFechamento` (billing cycle close day) and `diaVencimento` (due day)
- **ItemFatura:** Line item on a credit card bill. Tracks `parcelaAtual`/`totalParcelas` for installment purchases
- **Fatura:** Monthly credit card statement, grouped by `cartaoId` and `mesReferencia` (year-month key)
- **CategoriaCustomizada:** User-defined category with emoji icon and keywords for smart categorization
- **SistemaFinanceiro:** Root object holding all nested data for a user

### Key Utility Modules

- **`src/utils/financeiro.ts`:** Month key generation (`gerarMesKey`), formatting (currency, dates), resume calculation (`calcularResumo`), category aggregation
- **`src/utils/categorias.ts`:** Category detection from natural language, emoji mapping, magic input parser (`parsearInputMagico`) that converts text like "50 gasolina" into transaction objects
- **`src/hooks/useDarkMode.ts`:** Dark mode toggle with localStorage persistence
- **`src/hooks/useIsMobile.ts`:** Responsive hook (breakpoint 768px), used to adapt UI layout

### UI Patterns

- **Inline Styles:** Almost all styling is JSX inline with conditional colors based on dark mode (`darkMode ? '#0f172a' : '#fafafa'`)
- **Responsive:** Mobile detection with grid layout changes (`isMobile ? '1fr' : 'repeat(N, 1fr)'`)
- **Modals:** Controlled via state flags; components like `ModalDespesa`, `ModalReceita` render when `aberto === true`
- **Toast Notifications:** Custom `Toast` component for user feedback (success/error/warning/info)
- **Tabs:** Main dashboard has tabs (Dashboard, Transações, Categorias, Cartões, Metas) with conditional rendering

### Transaction Flow Examples

#### Adding an Expense/Income
1. User fills modal → `handleInputMagico()` or modal form submits
2. Creates `Transacao` object, generates `gerarId()`, writes to `usuarios/{uid}/dadosPorMes/{mesKey}`
3. Component listens via `onValue()` → `setSistema()` updates state → UI re-renders

#### Credit Card Purchase (with Installments)
1. User enters purchase in `ModalCompraCartao` → `ItemFatura` created
2. If `parcelas > 1`, loop creates item for each month in `faturas[mesKey]`
3. Fatura for that card/month is created or updated with new items
4. `handleAdicionarCompra()` writes entire `faturas` object to Firebase

#### Paying a Credit Card Bill
1. `handlePagarFatura()` called with cartão ID + mesKey
2. Creates a `Transacao` (expense, categoria='Cartão de Crédito')
3. Updates `faturas[mesKey]` → sets `paga: true`, adds `dataPagamento`
4. Both writes committed to Firebase

### Important Conventions

- **Month Keys:** Format `"YYYY-MM"` (e.g., `"2025-05"`). Always generated with `gerarMesKey()` to ensure consistency
- **Dates:** Stored as ISO date strings (`"2025-05-13"`), never Date objects
- **User Names:** Hardcoded lookup by email in `dashboard/page.tsx` (lines 71–72)
- **Currency:** All values in BRL (Reais). Formatted via `formatarMoeda()`
- **Category Detection:** Fallback chain: custom categories → keyword matching in utils → default emoji via `obterIconeCategoria()`
- **Firebase Migrations:** Dashboard has inline migration logic (lines 90–118) to handle legacy object-based data structures; converts to arrays

### Responsive Breakpoints

- **Mobile:** `isMobile = window.innerWidth < 768px`
- **Layout Changes:** Grid columns, font sizes, button labels adjusted dynamically
- **Mobile Header:** Abbreviates "💎 FinControl" to "💎", hides chart descriptions, uses emoji-only tabs

### Styling & Dark Mode

- **Anti-flash Script:** In `layout.tsx`, reads `localStorage.getItem('fincontrol-theme')` before first render to apply theme and prevent white flash
- **Dark Mode Colors:** Primary bg `#0f172a`, card bg `#1e293b`, border `#334155`, text `#f1f5f9`
- **Light Mode Colors:** Primary bg `#fafafa`, card bg `white`, border `#e5e7eb`, text `#111827`
- All color variables in header and main layout use ternary checks on `darkMode`

## Common Tasks

### Adding a New Component
1. Create in `src/components/` as a client component (`'use client'`)
2. Accept props for data, userId, and callbacks (handlers)
3. Use inline styles with dark mode awareness or Tailwind (if needed)
4. Export handler functions to parent and use `useCallback()` for performance

### Adding a Calculation or Formatter
1. Add to `src/utils/financeiro.ts` or `src/utils/categorias.ts`
2. Keep pure functions (no side effects)
3. Test with sample data in dashboard to ensure month key logic is correct

### Modifying Firebase Data Structure
1. Dashboard has migration code—update lines 90–118 to handle old/new formats
2. Always preserve backward compatibility
3. Test by adding fresh transaction and checking write succeeds

### Adding a New Category
1. Edit `MAPA_ICONES` and `MAPA_CATEGORIAS_PALAVRAS` in `src/utils/categorias.ts`
2. Add keywords that trigger auto-detection
3. Categories can also be created dynamically by users in the UI (stored in `categoriasCustomizadas`)

## Firebase Configuration

**File:** `src/lib/firebase.ts` (contains API key—do not commit changes)

```javascript
const firebaseConfig = {
  projectId: "nossas-contas-ed340-v2",
  databaseURL: "https://nossas-contas-ed340-v2-default-rtdb.firebaseio.com",
  // ... other keys
};
```

**Firestore:** Not used. Uses Realtime Database only.

**Rules:** Set up in Firebase Console (not in repo).

## Deployment

**Command:** `npm run build && firebase deploy`

- Next.js builds to `/out` (static files)
- Firebase hosting config: `firebase.json` deploys `/out` to web
- Routes to `/dashboard` and `/dashboard/**` rewrite to `/dashboard.html` for SPA routing
- Cache headers: JS/CSS cached for 1 year, HTML never cached

## Notes for Future Development

- **No SSR/API Routes:** Next.js is configured for static export only. If you need server-side logic, use Firebase Cloud Functions.
- **No Tests:** Currently no Jest/Vitest setup. If adding, configure in `tsconfig.json` and ESLint.
- **Strict TypeScript:** `strict: true` in `tsconfig.json`. All components are typed.
- **React Strict Mode:** Disabled in `next.config.js` (`reactStrictMode: false`) to avoid double-rendering in dev.
- **Auth Persistence:** Firebase Auth uses browser's default localStorage. No custom persistence logic needed.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
