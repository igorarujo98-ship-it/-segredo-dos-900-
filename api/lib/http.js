/** Helpers HTTP para as funções serverless. */

/** JSON simples de resposta. */
function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function ok(res, data) {
  json(res, 200, data || { ok: true });
}

function erro(res, status, mensagem) {
  json(res, status, { erro: mensagem });
}

/** Lê o corpo bruto da requisição (Buffer). */
function lerCorpo(req) {
  return new Promise(function (resolve, reject) {
    var pedacos = [];
    req.on("data", function (c) {
      pedacos.push(c);
    });
    req.on("end", function () {
      resolve(Buffer.concat(pedacos));
    });
    req.on("error", reject);
  });
}

/** Lê e interpreta o corpo como JSON (com fallback seguro). */
async function lerJson(req) {
  const buf = await lerCorpo(req);
  const texto = buf.toString("utf-8");
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch (_e) {
    // Pode vir como query string em alguns casos.
    const out = {};
    new URLSearchParams(texto).forEach(function (v, k) {
      out[k] = v;
    });
    return out;
  }
}

/** Extrai a sessão vinda no header ou na query string. */
function extrairSessao(req, url) {
  return (req.headers["x-sessao"] || req.headers["x-session"] || url.searchParams.get("sessao") || "").trim();
}

module.exports = { json, ok, erro, lerCorpo, lerJson, extrairSessao };