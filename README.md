# Smart Console Logger

Extensao do VS Code para inserir e remover `console.log` estrategicos automaticamente em arquivos `js`, `jsx`, `ts` e `tsx`, com foco em projetos React, React Native e Next.js.

## Funcionalidades

- Insere logs em funcoes, `try/catch/finally` e callbacks de promises.
- Remove apenas os logs gerados pela propria extensao.
- Possui modo `toggle` para adicionar ou remover conforme o estado atual.
- Usa marcadores textuais padronizados como `[SCL] [func-start]`, `[SCL] [try]` e `[SCL] [catch]`.
- Permite ajustar estilo do log, timestamp e agressividade da analise.
- Inclui heuristicas mais seguras para React Native e callbacks de UI.

## Instalacao

### Opcao 1 - `.vsix`

```bash
npm install
npm run compile
npm run package
code --install-extension smart-console-logger-1.0.2.vsix --force
```

### Opcao 2 - desenvolvimento

```bash
npm install
code .
```

No VS Code, pressione `F5` para abrir o Extension Development Host.

## Atalhos

| Acao | Windows/Linux | macOS |
|---|---|---|
| Adicionar logs | `Ctrl+Shift+L` | `Cmd+Shift+L` |
| Remover logs | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Toggle | Paleta ou status bar | Paleta ou status bar |

Na paleta de comandos, procure por `Smart Logger`.

## Exemplo

### Codigo original

```ts
async function fetchUser(userId: string, token: string) {
  try {
    const response = await api.get(`/users/${userId}`, {
      headers: { Authorization: token },
    });
    return response.data;
  } catch (error) {
    throw error;
  } finally {
    cleanupRequest();
  }
}

const loadProfile = async (id: string) => {
  return api.get(`/profile/${id}`)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      return null;
    });
};
```

### Depois de adicionar logs

```ts
async function fetchUser(userId: string, token: string) {
  console.log('[SCL] [func-start] [async fn] fetchUser', { userId, token });
  try {
    console.log('[SCL] [try] [try]');
    const response = await api.get(`/users/${userId}`, {
      headers: { Authorization: token },
    });
    console.log('[SCL] [func-return] [return] fetchUser', { response });
    return response.data;
  } catch (error) {
    console.log('[SCL] [catch] [catch]', { error });
    throw error;
  } finally {
    console.log('[SCL] [finally] [finally]');
    cleanupRequest();
  }
}

const loadProfile = async (id: string) => {
  console.log('[SCL] [func-start] [async fn] loadProfile', { id });
  return api.get(`/profile/${id}`)
    .then((res) => {
      console.log('[SCL] [then] [.then]', { res });
      return res.data;
    })
    .catch((err) => {
      console.log('[SCL] [promise-catch] [.catch]', { err });
      return null;
    });
};
```

### Remocao

Todos os logs contendo o marcador `[SCL]` podem ser removidos com o comando de limpeza.

## Configuracoes

Abra `Settings` e procure por `Smart Logger`, ou configure no `settings.json`:

```jsonc
{
  "smartConsoleLogger.logAggressiveness": "balanced",
  "smartConsoleLogger.logStyle": "simple",
  "smartConsoleLogger.includeTimestamp": false,
  "smartConsoleLogger.logFunctionStart": true,
  "smartConsoleLogger.logTryCatch": true,
  "smartConsoleLogger.logPromises": true,
  "smartConsoleLogger.logReturn": true
}
```

## Modos de agressividade

Use `smartConsoleLogger.logAggressiveness` para controlar o quanto a extensao deve inserir logs.

### `conservative`

Modo mais seguro para React Native e telas com muitos handlers.

- Evita logs em `useMemo` e `useCallback`.
- Evita logs em callbacks de props JSX.
- Evita logs em callbacks de `setState`.
- Evita logs em callbacks de `map`, `filter`, `find`, `reduce` e afins.
- Evita logs em handlers ruidosos, como toque, desenho, pinch, drag, troca de cor e toggles de UI.

### `balanced`

Modo padrao. Mantem um meio-termo entre seguranca e cobertura.

- Continua evitando `useMemo` e `useCallback`.
- Continua evitando callbacks de JSX props, `setState` e array methods.
- Permite logs em mais funcoes nomeadas com bloco, incluindo parte dos handlers da tela.

### `verbose`

Modo mais expansivo, para investigacao mais profunda.

- Continua evitando `useMemo` e `useCallback`.
- Passa a permitir logs em callbacks com bloco de JSX props, `setState` e array methods.
- Mantem as protecoes sintaticas para nao inserir logs em arrows sem bloco e `if (...) return ...` sem escopo.

## Estilos de log

### `simple`

```js
console.log('[SCL] [func-start] [async fn] fetchUser', { userId, token });
```

### `grouped`

```js
console.group('[SCL] [func-start] [async fn] fetchUser');
console.log({ userId, token });
console.groupEnd();
```

### `table`

```js
console.log('[SCL] [func-start] [async fn] fetchUser');
console.table({ userId, token });
```

## Referencias de log

Os tipos de log gerados pela extensao seguem estas referencias:

```ts
const SMART_LOG = {
  'function-start': '[func-start]',
  'function-return': '[func-return]',
  'try-start': '[try]',
  'catch-block': '[catch]',
  'finally-block': '[finally]',
  'then-callback': '[then]',
  'promise-catch': '[promise-catch]',
  'promise-finally': '[promise-finally]',
  'if-branch': '[if]',
  'else-branch': '[else]',
};
```

Na saida final, a extensao prefixa essas referencias com o marcador `[SCL]`, por exemplo:

- `[SCL] [func-start]`
- `[SCL] [func-return]`
- `[SCL] [try]`
- `[SCL] [catch]`
- `[SCL] [finally]`
- `[SCL] [then]`
- `[SCL] [promise-catch]`
- `[SCL] [promise-finally]`
- `[SCL] [if]`
- `[SCL] [else]`

## Comportamentos de seguranca

A extensao evita inserir logs em alguns casos que tendem a quebrar ou poluir o codigo:

- `useMemo(() => ...)`
- `useCallback(() => ...)`
- arrows inline sem bloco, como `onPress={() => setOpen(true)}`
- `if (...) return ...` sem `{ }`
- varios callbacks estruturais de React Native, dependendo do modo de agressividade

## Desenvolvimento

```bash
npm install
npm run watch
```

Para gerar um pacote:

```bash
npm run compile
npm run package
```

## Como a remocao funciona

A extensao remove apenas linhas geradas por ela mesma. O criterio de identificacao e o marcador textual `[SCL]`. Seus `console.log` manuais nao sao removidos.

## Licenca

MIT
