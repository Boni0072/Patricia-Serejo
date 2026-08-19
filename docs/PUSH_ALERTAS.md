# 🔔 Alertas Push — notificações mesmo com o app fechado

Este projeto entrega **alertas sonoros e visuais** para **mensagens** e
**agendamentos** (compromissos/lembretes) mesmo quando o aplicativo está
fechado, usando **Firebase Cloud Messaging (FCM) / Web Push**.

## Como funciona

```
┌────────────┐   nova mensagem / compromisso ──▶  coleção "notificacoes"
│   App/PWA  │         (criada pelo app)              │
└────────────┘                                        ▼
                                      ┌───────────────────────────────┐
                                      │  scripts/monitor-alertas.mjs  │
                                      │  (servidor Node — sempre de   │
                                      │   pé, mesmo sem ninguém       │
                                      │   logado)                     │
                                      │  • watcher em tempo real      │
                                      │  • lembretes de agenda 24h    │
                                      └───────────────────────────────┘
                                                 │ FCM (Web Push)
                                                 ▼
                              ┌────────────────────────────────────┐
                              │ Service Worker (public/sw.js)      │
                              │ → notificação do sistema: visual   │
                              │   + som + vibração (app fechado)   │
                              └────────────────────────────────────┘
```

Enquanto o app está **aberto**, o alerta continua sendo o atual (beep + toast),
com deduplicação para não tocar 2x (o app detecta que o push já foi entregue).
Com o app **fechado**, o monitor entrega o push e o sistema operacional exibe
a notificação (som + visual) — clicando, o app abre na página certa.

## Passo a passo (uma única vez)

### 1. Habilitar o FCM no projeto Firebase

1. Acesse o [Console Firebase](https://console.firebase.google.com/).
2. Abra o projeto `site-patricia-b5dff` (ou o seu).
3. **Engrenagem ⚙️ → Configurações do projeto → Cloud Messaging**.
4. Na seção **"Web Push certificates"**, clique **"Generate key pair"**.
5. Copie o valor gerado (parece `BAaZ8...`) e cole no arquivo **`.env`**:

   ```env
   VITE_FIREBASE_VAPID_KEY=AAAAxxxx_TOKEN_QUE_VOCE_COPIOU
   ```

   > O `messagingSenderId` já está configurado no `.env`.

### 2. Criar a credencial do servidor (Admin SDK)

1. No Console Firebase: **⚙️ → Configurações do projeto → Contas de serviço**.
2. Clique em **"Generate new private key"** → baixa um arquivo `.json`.
3. Renomeie para `firebase-service-account.json` e coloque na **raiz do
   projeto** (do lado do `.env`).
   > ⚠️ **Importante**: este arquivo é uma credencial secreta. **NÃO** suba
   > para o repositório/Git. Adicione-o ao `.gitignore`.

### 3. Subir a coleção de regras do Firestore

As regras já vêm atualizadas para `notificacoes` e `push_tokens`.
Publique-as com a CLI do Firebase:

```bash
npm i -g firebase-tools
firebase deploy --only firestore:rules
```

### 4. Instalar dependências e rodar o monitor

```bash
npm install
npm run build         # build do app (gera o service worker no /dist)
node scripts/monitor-alertas.mjs
```

O monitor deve ficar **sempre rodando**. Opções:

- **Máquina/VPS própria (PM2):**
  ```bash
  npm i -g pm2
  pm2 start "npm run alertas" --name monitor-alertas
  pm2 save       # recomenda-se configurar o pm2 startup
  ```
- **Nuvem (cron a cada minuto)**: basta chamar o modo pontual:
  ```bash
  npm run alertas:once
  ```
- **Consumo** didático com `APP_BASE_URL` apontando para o seu domínio público:
  ```bash
  APP_BASE_URL=https://seudominio.com.br npm run alertas
  ```

### 5. Testar o push

Com o app aberto num dispositivo/navegador:

1. Faça login e clique no **sino 🔔** → **"Ativar alertas mesmo com o app fechado"**.
2. Pegue o `uid` do usuário (o campo `id` do perfil no Firestore) e rode:

   ```bash
   node scripts/monitor-alertas.mjs --teste <uid>
   ```

3. Feche o app (não o navegador) e verifique se chega o alerta de teste.

## O que foi implementado (arquivos)

| Arquivo | Papel |
|---|---|
| `src/lib/push.ts` | Cliente FCM: permissão, token, entrega em 1º plano |
| `src/lib/db.ts` | Salvar/remover `push_tokens` no Firestore |
| `src/context/NotificacaoContext.tsx` | Integração: push ativo, dedup, alertas |
| `src/components/NotificacaoBell.tsx` | Botão de ativar/desativar alertas |
| `public/sw.js` | Service worker: `push`, `notificationclick` |
| `firestore.rules` | Regras de `push_tokens` + `notificacoes` |
| `scripts/monitor-alertas.mjs` | Servidor que envia os pushs + lembretes 24h |

## Limitações conhecidas

- **Push funciona com o navegador (mesmo com a aba fechada).** Feche o
  navegador por completo, so pode não entregar em todos os sistemas — por isso
  recomenda-se **instalar o app** (PWA, "Adicionar à tela inicial").
- Para disparo rigoroso em horário programado no celular, é recomendado
  habilitar o FCM em app nativo (futuro).
- A entrega/barulho da notificação depende das **notificações do sistema**
  do dispositivo (o toque padrão do SO é usado).