# O Segredo dos 900+ — Plataforma do Curso de Redação para o ENEM

Plataforma profissional para venda e distribuição do curso online **O Segredo dos 900+**.

## Sumário

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Por que existe um armazenamento (Vercel KV)?](#2-por-que-existe-um-armazenamento-vercel-kv)
3. [Como funciona o fluxo](#3-como-funciona-o-fluxo)
4. [Configuração — Passo a passo](#4-configuração--passo-a-passo)
5. [Como alterar vídeos, PDFs, preços e links](#5-como-alterar-vídeos-pdfs-preços-e-links)
6. [Deploy (publicar na Vercel)](#6-deploy-publicar-na-vercel)
7. [Roadmap / melhorias futuras](#7-roadmap--melhorias-futuras)

---

## 1. Visão geral da arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend | HTML / CSS / JavaScript puro (sem frameworks) |
| Serverless | Vercel Functions (Node.js 18+) |
| Pagamento | Mercado Pago — Checkout Pro (API) |
| E-mail | Resend (envio de token via API REST) |
| Persistência | **Vercel KV** (Upstash Redis) — armazenamento chave-valor |
| Hospedagem | Vercel (estático + funções serverless) |

**Nenhum banco de dados tradicional** (Supabase, Firebase, MongoDB, MySQL, PostgreSQL, Airtable) é utilizado.

O **Vercel KV** (baseado em Upstash Redis) é a solução adotada porque:
- as funções serverless são *stateless* (não guardam dados entre chamadas);
- gerar e validar tokens, sessões e evitar duplicidade de webhooks exige persistência;
- é a alternativa mais simples e segura disponível no ecossistema Vercel;
- funciona com uma camada HTTP protegida por token (não há servidor de banco exposto ao público).

---

## 2. Por que existe um armazenamento (Vercel KV)?

Para associar **Pagamento → Aluno → Plano → Token**, garantir idempotência de webhooks e validar sessões, o servidor precisa persistir dados entre chamadas. Sem isso, seria necessário um token autocontido (JWT), mas isso não permite revoacar tokens, bloquear acessos expirados ou recuperar um upgrade. O Vercel KV resolve isso com segurança usando uma chave-valor simples.

**Estrutura das chaves (usadas internamente):**

| Chave | Valor | Tempo de vida |
|---|---|---|
| `aluno:<id>` | JSON do aluno | sem TTL |
| `email:<email>` | ID do aluno | sem TTL |
| `token:<token>` | ID do aluno | sem TTL |
| `sessao:<sessao>` | ID do aluno | 30 dias |
| `webhook:<paymentId>` | ID do aluno | 3 dias |
| `pagamento:<paymentId>` | ID do aluno | 3 dias |

O Vercel KV é criado gratuitamente (plano Spark, 10.000 operações/dia) dentro da Vercel. Ao criar um projeto "Storage > KV" ele vincula automaticamente as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.

---

## 3. Como funciona o fluxo

```
ALUNO → cadastro.html
   ↓
Nome + CPF + E-mail (com confirmação) + WhatsApp
   ↓
Escolha do plano
   ↓
POST /api/cadastro (grava aluno no KV como "pendente")
   ↓
POST /api/mercadopago/preference (cria Checkout Pro no Mercado Pago)
   ↓
Redireciona para Mercado Pago
   ↓
Pagamento
   ↓
Mercado Pago envia webhook para /api/mercadopago/webhook
   ↓
Webhook consulta API do Mercado Pago (confirma status "approved")
   ↓
Se aprovado:
  1. Gera token criptográfico (900PLUS-XXXX-XXXX)
  2. Vincula Pagamento → Aluno → Plano → Token
  3. Envia e-mail automatico com o token (via Resend)
   ↓
Aluno recebe e-mail → acessa login.html com e-mail + token
   ↓
Login cria sessão → acesso ao conteudo no aluno.html
   ↓
Acesso valido por 1 ano
```

---

## 4. Configuração — Passo a passo

### 4.1 Mercado Pago

1. Acesse <https://www.mercadopago.com.br/developers>
2. Crie uma aplicação (Integração completa)
3. Copie o **Access Token de Produção** (ou de Sandbox para testes)
4. No painel da aplicação, crie um **Webhook Secret** (projetos novos, pós-2023)
5. Registre a URL do webhook: `https://<SEU-DOMINIO>.vercel.app/api/mercadopago/webhook`
6. Ative o evento: **Pagamentos** (payments)

> **Para testes locais:** use o Access Token de Sandbox do Mercado Pago, o `ngrok` para expor a URL local (`ngrok http 3000`) e configure o webhook no Mercado Pago para apontar para o endereço temporário do ngrok + `/api/mercadopago/webhook`.

### 4.2 Vercel KV (armazenamento)

1. Acesse o painel do projeto na Vercel
2. Vá em **Storage > Create Database > KV**
3. Escolha a região mais próxima
4. Clique em **Connect Project** — isso vincula as variáveis de ambiente automaticamente

As variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` são configuradas automaticamente.

### 4.3 Variáveis de Ambiente (Vercel)

Acesse Settings > Environment Variables no projeto Vercel e adicione:

| Variável | Descrição | Onde usar |
|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Token de acesso do Mercado Pago | Webhook, Preference, Upgrade |
| `WEBHOOK_SECRET` | Secret do webhook Mercado Pago (opcional mas recomendado) | Webhook |
| `RESEND_API_KEY` | Chave de API do Resend | Envio de e-mail |
| `EMAIL_FROM` | Remetente (ex: `O Segredo dos 900+ <contato@seudominio.com.br>`) | Envio de e-mail |
| `APP_URL` | URL pública (ex: `https://osegredodos900mais.vercel.app`) | Webhook, links no e-mail |
| `ADMIN_KEY` | Chave para reenvio manual de e-mail | `/api/email/enviar-token` |
| `KV_REST_API_URL` | Gerado automaticamente pelo Vercel KV | Armazenamento |
| `KV_REST_API_TOKEN` | Gerado automaticamente pelo Vercel KV | Armazenamento |

> **Importante:** Para testar com sandbox do Mercado Pago, crie um ** segundo conjunto** de variáveis usando o ambiente **Preview** ou **Development** na Vercel, ou use `vercel env pull .env.local` + `vercel dev`.

### 4.4 Serviço de e-mail (Resend)

1. Crie uma conta em <https://resend.com>
2. No painel, vá em **Domains** e adicione seu domínio (ex: `seudominio.com.br`)
3. Adicione os registros DNS (SPF, DKIM) que o Resend orienta no painel
4. Aguarde a verificação (pode levar alguns minutos)
5. Crie uma API Key em **API Keys**
6. Cole a chave na variável `RESEND_API_KEY`
7. Configure `EMAIL_FROM` usando o domínio verificado: `O Segredo dos 900+ <contato@seudominio.com.br>`

> Enquanto o domínio não estiver verificado, você pode usar o domínio padrão do Resend (`onboarding@resend.dev`) apenas para testes.

### 4.5 Testar um pagamento

1. Gire o projeto local com `vercel dev`
2. Se for testar com sandbox, use ngrok: `ngrok http 3000`, e atualize `APP_URL` no `.env.local` para o endereço do ngrok
3. Atualize o webhook no Mercado Pago para o endereço do ngrok
4. Preencha o cadastro no site e prossiga para o checkout do Mercado Pago
5. Use um cartão de teste do Mercado Pago Sandbox
6. Verifique os logs no Mercado Pago para ver se o webhook foi disparado

### 4.6 Testar a geração e o recebimento do token

Após o pagamento aprovado:

1. Verifique os logs da function webhook no painel da Vercel (ou no terminal com `vercel dev`)
2. Procure no Upstash KV (via Dashboard da Vercel > Storage > KV) pela chave `token:900PLUS-*`
3. Verifique se o e-mail foi enviado no painel do Resend (seção Logs/Emails)
4. Se não recebido, use o endpoint manual de reenvio:

```bash
curl -X POST https://<seu-app>/api/email/enviar-token \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <sua-ADMIN_KEY>" \
  -d '{"codigo":"900PLUS-XXXX-XXXX"}'
```

### 4.7 Testar o login

1. Acesse `login.html`
2. Informe o e-mail usado no cadastro + o código recebido
3. Verifique que o acesso foi liberado (cards das aulas aparecem, com vídeos e links de PDF)

### 4.8 Testar a validade de 1 ano

A data de expiração é calculada automaticamente no momento do pagamento (`new Date() + 365 dias`). Para simular acesso expirado durante testes:

1. Acesse o painel do Vercel KV
2. Busque a chave `aluno:<ID_DO_ALUNO>`
3. Edite o campo `expira_em` para uma data no passado (ex: `"2025-01-01T00:00:00.000Z"`)
4. Faça login novamente — a mensagem "Seu acesso ao curso expirou." deve aparecer

### 4.9 Alterar vídeos, PDFs, preços e links de pagamento

Tudo é editado nos arquivos de configuração na pasta `config/`:

| O que alterar | Arquivo | Campo |
|---|---|---|
| Título/descrição de aulas | `config/aulas.js` | `aulas[].titulo`, `aulas[].resumo`, `aulas[].assuntos` |
| ID do vídeo do YouTube | `config/aulas.js` | `aulas[].videoId` (substitua pelo ID real do YouTube) |
| Nome do arquivo PDF | `config/aulas.js` | `aulas[].pdf` (o arquivo deve ficar em `api/_arquivos/aulas/`) |
| Preço dos planos | `config/planos.js` | `basicas.preco`, `ultra.preco` |
| Links do Mercado Pago | `config/planos.js` | `basicas.urlPagamento`, `ultra.urlPagamento` (links estáticos de fallback) |
| Material exclusivo | `config/aulas.js` | `materialExclusivo.pdf` (arquivo em `api/_arquivos/materiais/`) |
| Texto da importância da redação | `config/conteudo.js` | `redacaoImportancia.textos` |
| WhatsApp de contato | `config/conteudo.js` | `contato.whatsapp` |
| Imagem do professor | `config/conteudo.js` | `hero.imagemProfessor` |

Após alterar, faça commit e push — a Vercel atualiza automaticamente.

### 4.10 Gerar um acesso grátis (presentear um amigo sem pagamento)

Por segurança, o fluxo normal **só libera** o acesso depois da confirmação do pagamento
no Mercado Pago. Para gerar um código manualmente (cortesia), use o **painel de administração**:

1. Acesse `https://SEU-APP.vercel.app/admin.html` (essa página não aparece no menu do site);
2. Digite a sua **ADMIN_KEY** (o valor da variável de ambiente `ADMIN_KEY`);
3. Preencha nome, e-mail e escolha o plano (Básico ou Ultra) e a validade;
4. Clique em **GERAR ACESSO**;
5. O código `900PLUS-XXXX-XXXX` é criado, salvo no KV e enviado por e-mail ao amigo (ou pode ser copiado manualmente).

O amigo entra em `login.html` com o **e-mail + código** normalmente. Se o e-mail não
chegou, o código também aparece na tela do painel para você copiar e enviar.

> ⚠️ **Segurança:** qualquer pessoa com a `ADMIN_KEY` consegue gerar acessos.
> Nunca compartilhe essa chave. O painel também funciona via API:
>
> ```bash
> curl -X POST https://SEU-APP.vercel.app/api/admin/gerar-acesso \
>   -H "Content-Type: application/json" \
>   -H "x-admin-key: SUA-ADMIN_KEY" \
>   -d '{"nome":"João Silva","email":"joao@email.com","plano":"basico","diasValidade":365}'
> ```

---

## 5. Estrutura de diretórios

```
/
├── index.html            ← Página comercial (landing page)
├── cadastro.html         ← Formulário de cadastro antes do pagamento
├── login.html            ← Login com e-mail + código de acesso
├── aluno.html            ← Área exclusiva do aluno
├── sucesso.html          ← Página exibida após o checkout do Mercado Pago
├── admin.html            ← Painel admin (gerar acesso grátis / reenvio)
├── styles.css            ← Estilos globais
├── script.js             ← JavaScript frontend
│
├── config/
│   ├── planos.js         ← Preços, parcelas e links de pagamento
│   ├── aulas.js          ← Títulos, descrições, vídeos e PDFs das aulas
│   └── conteudo.js       ← Textos editáveis da página inicial
│
├── api/
│   ├── cadastro.js       ← POST — cadastra aluno (status pendente)
│   ├── material.js       ← GET — baixa PDF protegido (requer sessão)
│   ├── admin/
│   │   └── gerar-acesso.js ← POST — gera acesso grátis (requer ADMIN_KEY)
│   ├── mercadopago/
│   │   ├── preference.js ← POST — cria preferência de pagamento
│   │   ├── webhook.js    ← POST — recebe notificação do Mercado Pago
│   │   └── upgrade.js   ← POST — gera pagamento de upgrade (Plano Ultra)
│   ├── auth/
│   │   ├── login.js      ← POST — autentica e-mail + código
│   │   └── me.js         ← GET  — valida sessão e retorna dados do aluno
│   ├── payment/
│   │   └── status.js     ← GET  — consulta status do pagamento
│   ├── email/
│   │   └── enviar-token.js ← POST — reenvio manual (protegido por ADMIN_KEY)
│   ├── lib/
│   │   ├── storage.js    ← Cliente Upstash KV (REST API)
│   │   ├── token.js      ← Geração criptográfica de tokens
│   │   ├── alunos.js     ← Regras de negócio: cadastro, login, token
│   │   ├── mailer.js     ← Template e envio de e-mail (Resend)
│   │   ├── mercadopago.js← Preferência, consulta e validação de assinatura
│   │   └── http.js       ← Helpers para funções serverless
│   └── _arquivos/        ← PDFs protegidos (não acessíveis diretamente pelo navegador)
│       ├── aulas/
│       │   ├── aula1.pdf ... aula5.pdf
│       │   └── aula6.pdf ← adicione quando disponível
│       └── materiais/
│           └── temas-modelos.pdf ← adicione quando disponível
│
├── aulas/                ← Cópias locais dos PDFs originais (para referência)
├── materiais/            ← Cópia local do temas-modelos.pdf (para referência)
├── imagens/
│   ├── hondaturbo.jpeg   ← Referência visual (identidade)
│   └── igor sem fuundo.png ← Foto do professor
│
├── package.json
├── vercel.json
├── .gitignore
├── .env.example          ← Modelo das variáveis de ambiente
└── README.md             ← Este arquivo
```

---

## 6. Deploy (publicar na Vercel)

1. Instale a CLI da Vercel: `npm i -g vercel`
2. Na raiz do projeto, rode: `vercel`
3. Siga as instruções no terminal
4. Configure todas as variáveis de ambiente no painel da Vercel
5. Crie o Storage KV no painel e vincule ao projeto
6. Configure o webhook no Mercado Pago apontando para o domínio da Vercel
7. Verifique o deploy: acesse o domínio gerado

**Envio dos arquivos ao repositório:**
```bash
git init
git add .
git commit -m "feat: plataforma completa O Segredo dos 900+"
git remote add origin https://github.com/usuario/repo.git
git push -u origin main
```

---

## 7. Roadmap / melhorias futuras

- [ ] Formatação automática de CPF no frontend (máscara completa com validação de dígitos verificadores)
- [ ] Página dedicada de "Termos de Uso", "Política de Privacidade" e "Direitos Autorais"
- [ ] Página de administração para consultar alunos e reenviar tokens
- [ ] Integração com YouTube Data API para obter thumbnails dos vídeos automaticamente
- [ ] Cache de assets (PDFs, vídeos) para melhor performance
- [ ] Testes automatizados (E2E)

---

*Plataforma desenvolvida para o curso O Segredo dos 900+ — Professor Igor Araujo da Rocha.*
