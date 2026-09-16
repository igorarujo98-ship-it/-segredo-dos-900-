/**
 * TEMPORÁRIO — apaga TODAS as contas/matrículas do KV.
 * Protegido pelo header x-purge-token == PURGE_TOKEN. Remover após o uso.
 */
const { ok, erro } = require("../_lib/http.js");
const storage = require("../_lib/storage.js");

const PREFIXOS = ["aluno:", "email:", "token:", "sessao:", "pagamento:", "webhook:"];

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-purge-token"] || "";
    if (!process.env.PURGE_TOKEN || chave !== process.env.PURGE_TOKEN) {
      return erro(res, 401, "Não autorizado.");
    }

    const apagadas = {};
    let total = 0;
    for (const prefixo of PREFIXOS) {
      const chaves = await storage.keys(prefixo + "*");
      let n = 0;
      for (const k of chaves) {
        if (await storage.del(k)) n++;
      }
      apagadas[prefixo] = n;
      total += n;
    }

    ok(res, { total: total, apagadas: apagadas });
  } catch (e) {
    console.error("admin/purge:", e);
    erro(res, 500, "Erro ao apagar as contas.");
  }
};
