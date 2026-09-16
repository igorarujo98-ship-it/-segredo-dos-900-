/**
 * Armazenamento seguro server-side.
 *
 * NÃO usamos banco de dados tradicional (Supabase, Firebase, MySQL, etc.).
 * Para persistir alunos, tokens e sessões de forma SEGURA em funções
 * serverless (que são stateless), utilizamos um armazenamento chave-valor:
 * Vercel KV (baseado em Upstash Redis), acessado via REST API.
 *
 * Ele é a alternativa mais simples e segura à exigência de "sem banco de dados",
 * permitindo idempotência de webhooks e controle de acesso sem expor nada no navegador.
 *
 * Variáveis de ambiente usadas:
 *   KV_REST_API_URL   (criadas ao vincular Storage > KV na Vercel)
 *   KV_REST_API_TOKEN
 *
 * MODO LOCAL (testes): se KV_REST_API_URL / KV_REST_API_TOKEN não estiverem
 * configuradas, usa um arquivo JSON local (gitignorado) para que cadastro,
 * login, painel admin e download de PDFs funcionem em "vercel dev" sem
 * precisar criar um Storage KV. Em produção as variáveis existem e o KV real
 * é usado normalmente.
 */
const fs = require("fs");
const path = require("path");

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

// ---------------------------------------------------------------------------
// Armazenamento local (fallback para desenvolvimento)
// ---------------------------------------------------------------------------
const ARQUIVO_LOCAL = path.join(__dirname, "..", "..", ".storage-local.json");

let cacheLocal = null;

function carregarLocal() {
  if (cacheLocal) return cacheLocal;
  try {
    cacheLocal = JSON.parse(fs.readFileSync(ARQUIVO_LOCAL, "utf8"));
  } catch (_e) {
    cacheLocal = {};
  }
  return cacheLocal;
}

function gravarLocal() {
  const dados = carregarLocal();
  try {
    fs.writeFileSync(ARQUIVO_LOCAL, JSON.stringify(dados, null, 2));
  } catch (e) {
    console.error("storage-local:", e);
  }
}

/** Registro local válido: existe e (se tiver TTL) ainda não expirou. */
function validoLocal(reg) {
  return !!reg && (!reg.exp || reg.exp > Date.now());
}

function limparExpiradoLocal() {
  const dados = carregarLocal();
  let mudou = false;
  Object.keys(dados).forEach(function (k) {
    if (!validoLocal(dados[k])) {
      delete dados[k];
      mudou = true;
    }
  });
  if (mudou) gravarLocal();
}

function temKV() {
  return !!BASE && !!TOKEN;
}

function checarConfiguracao() {
  if (!temKV()) {
    throw new Error(
      "KV não configurado. Crie um Storage " +
        "(Tipo KV) no projeto da Vercel e vincule as variáveis KV_REST_API_URL / KV_REST_API_TOKEN."
    );
  }
}

async function comando(url, init) {
  checarConfiguracao();
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      Authorization: "Bearer " + TOKEN,
      "Content-Type": "application/json",
      ...((init && init.headers) || {}),
    },
  });
  if (!res.ok) {
    throw new Error("KV error " + res.status + ": " + (await res.text().catch(function () { return ""; })));
  }
  return res.json();
}

/** Lê um valor. Retorna null se a chave não existir. */
async function get(key) {
  if (!temKV()) {
    return getLocal(key);
  }
  const dados = await comando(BASE + "/get/" + encodeURIComponent(key));
  if (!dados || dados.result === null || dados.result === undefined) return null;
  try {
    return JSON.parse(dados.result);
  } catch (_e) {
    return dados.result;
  }
}

/** Grava um valor (com TTL opcional, em segundos). */
async function set(key, value, ttlSeconds) {
  if (!temKV()) {
    return setLocal(key, value, ttlSeconds);
  }
  let url = BASE + "/set/" + encodeURIComponent(key);
  if (ttlSeconds) url += "?EX=" + Math.floor(ttlSeconds);
  const corpo = typeof value === "string" ? value : JSON.stringify(value);
  const dados = await comando(url, { method: "POST", body: corpo });
  return dados && dados.result === "OK";
}

/**
 * Grava SOMENTE se a chave ainda não existir (atomic).
 * Retorna true se gravou; false se a chave já existia.
 * Usado para linkar pagamento->aluno e garantir idempotência de webhook.
 */
async function setnx(key, value, ttlSeconds) {
  if (!temKV()) {
    return setnxLocal(key, value, ttlSeconds);
  }
  let url = BASE + "/set/" + encodeURIComponent(key) + "?NX=1";
  if (ttlSeconds) url += "&EX=" + Math.floor(ttlSeconds);
  const corpo = typeof value === "string" ? value : JSON.stringify(value);
  const dados = await comando(url, { method: "POST", body: corpo });
  return dados && dados.result === "OK";
}

/** Remove uma chave. */
async function del(key) {
  if (!temKV()) {
    return delLocal(key);
  }
  const dados = await comando(BASE + "/del/" + encodeURIComponent(key), { method: "POST" });
  return dados && (dados.result === 1 || dados.result === "1");
}

/** Verifica se a chave existe (1 ou 0). */
async function exists(key) {
  if (!temKV()) {
    return existsLocal(key);
  }
  const dados = await comando(BASE + "/exists/" + encodeURIComponent(key));
  return dados && (dados.result === 1 || dados.result === "1");
}

/** Define TTL de uma chave. */
async function expire(key, ttlSeconds) {
  if (!temKV()) {
    return expireLocal(key, ttlSeconds);
  }
  const dados = await comando(BASE + "/expire/" + encodeURIComponent(key) + "?EX=" + Math.floor(ttlSeconds), {
    method: "POST",
  });
  return dados && dados.result === 1;
}

// ---------------------------------------------------------------------------
// Implementação local (arquivo JSON)
// ---------------------------------------------------------------------------
async function getLocal(key) {
  const dados = carregarLocal();
  const reg = dados[key];
  if (!validoLocal(reg)) {
    if (reg) {
      delete dados[key];
      gravarLocal();
    }
    return null;
  }
  return reg.v;
}

async function setLocal(key, value, ttlSeconds) {
  const dados = carregarLocal();
  dados[key] = {
    v: typeof value === "string" ? value : JSON.parse(JSON.stringify(value)),
    exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
  };
  gravarLocal();
  return true;
}

async function setnxLocal(key, value, ttlSeconds) {
  const dados = carregarLocal();
  if (validoLocal(dados[key])) return false;
  await setLocal(key, value, ttlSeconds);
  return true;
}

async function delLocal(key) {
  const dados = carregarLocal();
  const tinha = validoLocal(dados[key]);
  if (tinha) {
    delete dados[key];
    gravarLocal();
  }
  return !!tinha;
}

async function existsLocal(key) {
  limparExpiradoLocal();
  return validoLocal(carregarLocal()[key]);
}

async function expireLocal(key, ttlSeconds) {
  const dados = carregarLocal();
  if (!validoLocal(dados[key])) return false;
  dados[key].exp = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
  gravarLocal();
  return true;
}

module.exports = { get, set, setnx, del, exists, expire };