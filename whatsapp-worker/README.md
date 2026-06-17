# Integração WhatsApp → FinControl

Mandar uma mensagem no WhatsApp tipo `150 mercado` e ela vira uma transação no app, com resposta de confirmação. **100% grátis, sem servidor próprio.**

## Arquitetura

```
WhatsApp (Anderson/Evelin)
      │  envia "150 mercado"
      ▼
Meta WhatsApp Cloud API (oficial, grátis até 1000 conversas/mês)
      │  webhook POST
      ▼
Cloudflare Worker  ──►  fincontrol-whats.andersonfvsti.workers.dev
  (worker.js)            • acha a pessoa pelo telefone (últimos 8 dígitos)
      │                  • parseia texto (cópia de parsearInputMagico)
      │                  • monta a Transacao
      ▼
Firebase Realtime DB (REST API)
   usuarios/{uid}/dadosPorMes/{YYYY-MM}  ← read-modify-write (append no array)
      │
      ▼
Worker responde no WhatsApp: "✅ Registrado: R$ 150,00 — Mercado"
```

**Por que essa stack:** Meta API oficial é grátis e confiável; Cloudflare Workers é grátis (100k req/dia, sem cartão); como o usuário **sempre inicia** a conversa, a janela de 24h fica aberta e o bot responde texto livre sem precisar de template aprovado.

## Arquivos

| Arquivo | O que é |
|---------|---------|
| `worker.js` | Código completo do Cloudflare Worker (webhook). Fonte da verdade — editar aqui e re-colar na Cloudflare. |

## Configuração

### Cloudflare (Worker: `fincontrol-whats`)
4 variáveis de ambiente (Settings → Variables):

| Variável | Tipo | Valor |
|----------|------|-------|
| `WHATSAPP_TOKEN` | 🔒 Secret | token do Meta (System User) |
| `PHONE_NUMBER_ID` | texto | `1138829055987180` |
| `VERIFY_TOKEN` | texto | `fincontrol-verify-2026` |
| `FIREBASE_SECRET` | 🔒 Secret | database secret do Firebase (REST auth) |

> ⚠️ Os dois Secrets **nunca** vão pro git nem pro chat — só colados direto no painel da Cloudflare (guardados criptografados).

### Meta (App Dashboard → WhatsApp → Configuration)
- **Callback URL:** `https://fincontrol-whats.andersonfvsti.workers.dev/`
- **Verify token:** `fincontrol-verify-2026`
- **Webhook fields:** subscrever **`messages`**

### Mapeamento pessoa → UID (`worker.js` → array `PESSOAS`)
Casa pelos **últimos 8 dígitos** do telefone (resolve variação do 9º dígito / código de país do Brasil).

| Pessoa | Últimos 8 | UID |
|--------|-----------|-----|
| Anderson Ferreira | `95976134` | `KH17mEyb6LQgRZztktRecPpvgT83` |
| Evelin Mulbaier | (pendente) | `q9jbIxoA5Oh6IIuUPfi5K8PGFbD3` |

## Status — PENDENTE

- [ ] Colar `worker.js` no editor da Cloudflare (estava com "Hello World" padrão) → **Implantar**
- [ ] Configurar webhook no Meta (callback URL + verify token + subscrever `messages`)
- [ ] Testar ponta a ponta: mandar `150 mercado` do WhatsApp do Anderson → confirmar que registra + responde
- [ ] Trocar o token temporário (expira em 24h) por **token permanente de System User**
- [ ] (Depois) Adicionar telefone da Evelin — número de teste do Meta só atende 5 números verificados; para liberar geral precisa de verificação de negócio/produção

## Quirks

- **Token de teste expira em 24h** → criar System User token permanente no Business Manager.
- **Número de teste = máx 5 destinatários verificados.** Suficiente pra família, mas exige verificar cada número.
- **Firebase database secret** é legado/deprecado mas ainda funciona pra REST API (`?auth={secret}`). Dá acesso total ao banco — manter só na Cloudflare.
- **Webhook sempre responde 200**, mesmo em erro, pra evitar retries do Meta.
- O worker usa **GET + PUT** (append no array) em vez de POST push-keys, pra manter o formato de array que o app espera.
