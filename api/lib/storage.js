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
 */
const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

function checarConfiguracao() {
  if (!BASE || !TOKEN) {
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
  let url = BASE + "/set/" + encodeURIComponent(key) + "?NX=1";
  if (ttlSeconds) url += "&EX=" + Math.floor(ttlSeconds);
  const corpo = typeof value === "string" ? value : JSON.stringify(value);
  const dados = await comando(url, { method: "POST", body: corpo });
  return dados && dados.result === "OK";
}

/** Remove uma chave. */
async function del(key) {
  const dados = await comando(BASE + "/del/" + encodeURIComponent(key), { method: "POST" });
  return dados && (dados.result === 1 || dados.result === "1");
}

/** Verifica se a chave existe (1 ou 0). */
async function exists(key) {
  const dados = await comando(BASE + "/exists/" + encodeURIComponent(key));
  return dados && (dados.result === 1 || dados.result === "1");
}

/** Define TTL de uma chave. */
async function expire(key, ttlSeconds) {
  const dados = await comando(BASE + "/expire/" + encodeURIComponent(key) + "?EX=" + Math.floor(ttlSeconds), {
    method: "POST",
  });
  return dados && dados.result === 1;
}

module.exports = { get, set, setnx, del, exists, expire };