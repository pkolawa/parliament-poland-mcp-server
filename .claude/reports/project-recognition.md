# Project Recognition Report

> Generated: 2026-05-17

## Overview

**Parliament Poland MCP Server** — serwer MCP (Model Context Protocol) udostępniający publiczne API Sejmu RP jako narzędzia dla modeli językowych (LLM).

- **Typ:** MCP Server (stdio transport)
- **Wersja:** 1.2.3
- **Język:** TypeScript (ESM)
- **Framework:** @modelcontextprotocol/sdk v1.18
- **Walidacja:** Zod v3.25
- **Build:** esbuild → single bundle
- **Dystrybucja:** npm (npx)
- **API źródłowe:** https://api.sejm.gov.pl/sejm

## Struktura

```
src/
├── index.ts          — entry point (stdio transport)
├── server.ts         — rejestracja narzędzi w McpServer
├── utils/api.ts      — generyczny klient HTTP
└── tools/            — 18 narzędzi MCP
    ├── index.ts      — eksport wszystkich narzędzi
    ├── mps.ts        — posłowie (lista + szczegóły)
    ├── clubs.ts      — kluby parlamentarne
    ├── committees.ts — komisje
    ├── interpellations.ts
    ├── prints.ts     — druki sejmowe
    ├── proceedings.ts
    ├── process.ts / processes.ts — procesy legislacyjne
    ├── terms.ts      — kadencje
    ├── transcripts.ts
    ├── videos.ts
    ├── votings.ts
    ├── writtenQuestions.ts
    └── bilateralGroups.ts

tests/
├── server.test.ts
├── tools/            — unit testy (mock API) dla każdego narzędzia
├── integration/      — live API tests (opcjonalne, wymagają internetu)
└── utils/api.test.ts
```

## Wzorzec narzędzi

Każdy tool eksportuje obiekt:
```typescript
{
  description: string,
  schema: { [key]: z.ZodType },
  handler: (args) => Promise<{ content: [{ type: "text", text: string }] }>
}
```

## Ocena jakości

### Mocne strony
- Pełne pokrycie testami jednostkowymi (każdy tool + utils)
- Testy integracyjne z żywym API (oddzielna konfiguracja)
- Prosty, powtarzalny wzorzec
- Strict TypeScript
- Minimalne zależności

### Problemy
1. **Brak typów odpowiedzi API** — wszędzie `any`, brak interfejsów
2. **Połykanie błędów** — `makeSejmRequest` loguje do stderr i zwraca null, tracąc kontekst
3. **Hardcoded wersja** — w package.json i server.ts niezależnie
4. **Brak lintingu** — ani eslint, ani biome
5. **Brak CI/CD** — brak GitHub Actions
6. **Brak timeout** na fetch — ryzyko zawieszenia

## Rekomendacje (fokus: jakość kodu)

1. Stworzyć `src/types/api.ts` z interfejsami odpowiedzi
2. Poprawić error handling w `makeSejmRequest`
3. Dodać helper `buildToolResponse` redukujący boilerplate
4. Dodać linter + CI
5. Zsynchronizować wersję z jednego źródła
