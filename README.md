# 🪵 Smart Console Logger

> Extensão VS Code para inserir e remover `console.log` estratégicos automaticamente em projetos **React**, **React Native** e **Next.js**.

---

## ✨ Funcionalidades

| Recurso | Detalhe |
|---|---|
| 🎯 **Inserção inteligente** | Detecta funções, try/catch, promises e insere logs no ponto certo |
| 🧹 **Remoção em um comando** | Remove apenas os logs inseridos pela extensão, sem tocar nos seus |
| 🔄 **Toggle** | Um atalho só para adicionar/remover conforme o estado atual |
| 🏷️ **Labels descritivos** | Cada log informa o nome da função, tipo de bloco e parâmetros |
| ⚙️ **Configurável** | Emojis, timestamps, estilo de log (simple/grouped/table) |
| 📊 **Status bar** | Indicador visual no rodapé do VS Code |

---

## 📦 Instalação

### Opção 1 – Instalar pelo `.vsix` (recomendado para uso local)

```bash
# 1. Clone ou baixe este repositório
git clone https://github.com/seu-usuario/smart-console-logger.git
cd smart-console-logger

# 2. Instale as dependências
npm install

# 3. Compile o TypeScript
npm run compile

# 4. Gere o pacote .vsix
npm run package
# → Gera: smart-console-logger-1.0.0.vsix

# 5. Instale no VS Code
code --install-extension smart-console-logger-1.0.0.vsix
```

### Opção 2 – Modo de desenvolvimento (para contribuir/testar)

```bash
npm install
# Abra a pasta no VS Code
code .
# Pressione F5 para abrir o Extension Development Host
```

---

## ⌨️ Atalhos

| Ação | Windows/Linux | macOS |
|---|---|---|
| Adicionar logs | `Ctrl+Shift+L` | `Cmd+Shift+L` |
| Remover logs | `Ctrl+Shift+K` | `Cmd+Shift+K` |
| Toggle (add/remove) | Via status bar ou paleta | Via status bar ou paleta |

> **Paleta de comandos** (`Ctrl+Shift+P` / `Cmd+Shift+P`): busque por `Smart Logger`.

---

## 🎬 Exemplo de uso

### Código original

```typescript
// userService.ts
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

### Após `Ctrl+Shift+L`

```typescript
// userService.ts
async function fetchUser(userId: string, token: string) {
  console.log('🪵 [async fn] fetchUser', { userId, token });   // ← inserido
  try {
    console.log('🔵 [try]');                                    // ← inserido
    const response = await api.get(`/users/${userId}`, {
      headers: { Authorization: token },
    });
    console.log('🔙 [return] fetchUser', { response });        // ← inserido
    return response.data;
  } catch (error) {
    console.log('🔴 [catch]', { error });                      // ← inserido
    throw error;
  } finally {
    console.log('🟡 [finally]');                               // ← inserido
    cleanupRequest();
  }
}

const loadProfile = async (id: string) => {
  console.log('🪵 [async fn] loadProfile', { id });            // ← inserido
  return api.get(`/profile/${id}`)
    .then((res) => {
      console.log('🟢 [.then]', { res });                      // ← inserido
      return res.data;
    })
    .catch((err) => {
      console.log('🟠 [.catch]', { err });                     // ← inserido
      return null;
    });
};
```

### Após `Ctrl+Shift+K`

Todos os logs marcados com 🪵 são removidos. Código volta ao original.

---

## ⚙️ Configurações

Acesse via `File > Preferences > Settings` e busque por **Smart Logger**.

```jsonc
{
  // Habilitar emojis nos logs (padrão: true)
  "smartConsoleLogger.emoji": true,

  // Estilo do log: "simple" | "grouped" | "table"
  "smartConsoleLogger.logStyle": "simple",

  // Incluir timestamp (padrão: false)
  "smartConsoleLogger.includeTimestamp": false,

  // Logar início das funções (padrão: true)
  "smartConsoleLogger.logFunctionStart": true,

  // Logar try/catch/finally (padrão: true)
  "smartConsoleLogger.logTryCatch": true,

  // Logar callbacks de Promises (padrão: true)
  "smartConsoleLogger.logPromises": true,

  // Logar antes de returns (padrão: true)
  "smartConsoleLogger.logReturn": true
}
```

### Estilos de log disponíveis

**simple** (padrão)
```js
console.log('🪵 [async fn] fetchUser', { userId, token });
```

**grouped**
```js
console.group('🪵 [async fn] fetchUser');
console.log({ userId, token });
console.groupEnd();
```

**table**
```js
console.log('🪵 [async fn] fetchUser');
console.table({ userId, token });
```

---

## 🎨 Emojis por tipo de ponto

| Emoji | Tipo |
|---|---|
| 🪵 | Início de função |
| 🔙 | Antes de return |
| 🔵 | Início de bloco try |
| 🔴 | Bloco catch |
| 🟡 | Bloco finally |
| 🟢 | Callback .then |
| 🟠 | Callback .catch (promise) |
| ⚪ | Callback .finally (promise) |

---

## 🗂️ Estrutura do projeto

```
smart-console-logger/
├── src/
│   ├── extension.ts          # Entry point – registra comandos e status bar
│   ├── astAnalyzer.ts        # Parse AST com Babel, encontra pontos de inserção
│   ├── logBuilder.ts         # Gera o texto do console.log conforme config
│   ├── editorManipulator.ts  # Insere/remove linhas no documento VS Code
│   ├── configManager.ts      # Lê configurações do workspace
│   └── types.ts              # Interfaces e tipos compartilhados
├── .vscode/
│   ├── launch.json           # Debug config
│   └── tasks.json            # Build task
├── package.json              # Manifesto da extensão
└── tsconfig.json
```

---

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Compilar (watch mode)
npm run watch

# Compilar (one-shot)
npm run compile

# Gerar .vsix para distribuição
npm run package
```

### Testando no VS Code

1. Abra a pasta do projeto no VS Code
2. Pressione **F5** → abre o _Extension Development Host_
3. No novo VS Code, abra qualquer arquivo `.ts`, `.tsx`, `.js` ou `.jsx`
4. Use `Ctrl+Shift+L` para adicionar logs
5. Use `Ctrl+Shift+K` para remover

---

## 📋 Formatos suportados

- ✅ `.js` — JavaScript
- ✅ `.jsx` — React JSX
- ✅ `.ts` — TypeScript
- ✅ `.tsx` — React TSX
- ✅ Funções normais, arrow functions, async functions
- ✅ Métodos de classe e objeto
- ✅ try / catch / finally
- ✅ Promise chains (`.then`, `.catch`, `.finally`)
- ✅ React hooks e componentes funcionais
- ✅ Next.js API routes e Server Actions
- ✅ React Native

---

## 🔒 Como a remoção funciona?

A extensão **só remove os logs que ela mesma inseriu**. O critério de identificação é o emoji 🪵 presente na mensagem. Seus próprios `console.log` nunca serão tocados.

---

## 📄 Licença

MIT
