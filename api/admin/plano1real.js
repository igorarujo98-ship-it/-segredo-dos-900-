/**
 * [ADMIN] GET/POST /api/admin/plano1real
 * GET  -> { ativo } com o estado atual do Plano R$ 1.
 * POST -> body { ativo: boolean } liga ou desliga a venda do Plano R$ 1.
 * Requer o header x-admin-key com o valor de ADMIN_KEY (variável de ambiente).
 */
const { lerJson, ok, erro } = require("../_lib/http.js");
const plano1real = require("../_lib/plano1real.js");

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-admin-key"] || "";
    if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
      return erro(res, 401, "Não autorizado. Verifique a chave de administrador.");
    }

    const metodo = String(req.method || "GET").toUpperCase();

    if (metodo === "GET") {
      return ok(res, { ativo: await plano1real.status() });
    }

    const dados = await lerJson(req);
    const ativo = dados && typeof dados.ativo === "boolean" ? dados.ativo : true;
    const novo = await plano1real.setarStatus(ativo);
    ok(res, { ativo: novo });
  } catch (e) {
    console.error("admin/plano1real:", e);
    erro(res, 500, "Erro ao atualizar o Plano R$ 1.");
  }
};