/**
 * Servidor local de desenvolvimento (sem depender da Vercel CLI).
 *
 * - Serve as páginas estáticas (index, login, aluno, etc.);
 * - Roteia as mesmas rotas da API para os mesmos arquivos usados na Vercel;
 * - Usa o armazenamento local (.storage-local.json) quando não há Vercel KV.
 *
 * Uso: node scripts/dev-server.js   (ou: npm run dev)
 * Abra: http://localhost:3000/login.html
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const PORTA = process.env.PORT || 3000;

/** Carrega o .env.local (se existir) para as variáveis de ambiente. */
function carregarEnvLocal() {
  const arquivo = path.join(RAIZ, ".env.local");
  try {
    const texto = fs.readFileSync(arquivo, "utf8");
    texto.split(/\r?\n/).forEach(function (linha) {
      const t = linha.trim();
      if (!t || t.startsWith("#")) return;
      const i = t.indexOf("=");
      if (i < 0) return;
      const chave = t.slice(0, i).trim();
      const valor = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (chave && process.env[chave] === undefined) process.env[chave] = valor;
    });
  } catch (_e) {}
}
carregarEnvLocal();

const ROTAS_API = [
  { caminho: "/api/cadastro", arquivo: "api/cadastro.js" },
  { caminho: "/api/mercadopago/preference", arquivo: "api/mercadopago/preference.js" },
  { caminho: "/api/mercadopago/webhook", arquivo: "api/mercadopago/webhook.js" },
  { caminho: "/api/mercadopago/upgrade", arquivo: "api/mercadopago/upgrade.js" },
  { caminho: "/api/payment/status", arquivo: "api/payment/status.js" },
  { caminho: "/api/auth/me", arquivo: "api/auth/me.js" },
  { caminho: "/api/auth/login", arquivo: "api/auth/login.js" },
  { caminho: "/api/admin/gerar-acesso", arquivo: "api/admin/gerar-acesso.js" },
  { caminho: "/api/admin/alunos", arquivo: "api/admin/alunos.js" },
  { caminho: "/api/email/enviar-token", arquivo: "api/email/enviar-token.js" },
  { caminho: "/api/material", arquivo: "api/material.js" },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
};

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://localhost:" + PORTA);
  let caminho;
  try {
    caminho = decodeURIComponent(url.pathname);
  } catch (_e) {
    caminho = url.pathname;
  }

  // ----- API: usa o handler do mesmo arquivo que roda na Vercel -----
  for (const rota of ROTAS_API) {
    if (caminho === rota.caminho) {
      try {
        const handler = require(path.join(RAIZ, rota.arquivo));
        return handler(req, res);
      } catch (e) {
        console.error("api:", rota.caminho, e);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(JSON.stringify({ erro: "Erro interno: " + e.message }));
      }
    }
  }

  // ----- Arquivos estáticos / páginas -----
  if (caminho === "/") caminho = "/index.html";
  const arquivo = path.join(RAIZ, caminho);
  if (!arquivo.startsWith(RAIZ + path.sep)) {
    res.statusCode = 403;
    return res.end("Proibido");
  }

  fs.readFile(arquivo, function (erro, buf) {
    if (erro) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("Não encontrado: " + caminho);
    }
    const ext = path.extname(arquivo).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(buf);
  });
});

server.listen(PORTA, function () {
  console.log("");
  console.log("Servidor local rodando!");
  console.log("Abra no navegador: http://localhost:" + PORTA + "/login.html");
  console.log("");
});