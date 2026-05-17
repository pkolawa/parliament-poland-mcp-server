# TODO

> Wygenerowano przez /recognize — 2026-05-17
> Fokus: jakość kodu

## Krytyczne

- [ ] Zastąpić `any` w handlerach narzędzi typami interfejsów — stworzyć `src/types/api.ts` z interfejsami dla odpowiedzi API (MP, Club, Committee, etc.)
- [ ] Poprawić `makeSejmRequest` — zwracać szczegóły błędu (status code, message) zamiast połykać je i zwracać null

## Ważne

- [ ] Dodać typy generyczne do każdego toola — zamiast `makeSejmRequest<any>` użyć konkretnych interfejsów (np. `makeSejmRequest<Mp>`)
- [ ] Wyciągnąć powtarzalny wzorzec handler → helper `buildToolResponse(data, successMsg, failMsg)` aby zredukować boilerplate
- [ ] Dodać timeout do fetch w `src/utils/api.ts` — użyć `AbortController` z 15s limitem
- [ ] Zsynchronizować wersję — importować z package.json lub użyć jednego źródła prawdy zamiast hardcode w `src/server.ts`
- [ ] Dodać linter (biome lub eslint) i skonfigurować jako pre-commit lub script npm

## Drobne usprawnienia

- [ ] Dodać `strict` typy do `tool.handler` w `src/server.ts` — zamiast `(params: any)` użyć `z.infer` na schemacie
- [ ] Dodać `.nvmrc` z wersją Node (>=18) dla spójności środowiska
- [ ] Rozważyć enum/stałe dla endpointów API zamiast template strings w każdym toolu
