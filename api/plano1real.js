/**
 * GET /api/plano1real
 * Público: informa se o Plano R$ 1 está ativo para venda.
 * O site usa essa resposta para mostrar ou ocultar o cartão do plano.
 */
const { ok, erro } = require("./_lib/http.js");
const plano1real = require("./_lib/plano1real.js");

module.exports = async function handler(req, res) {
  try {
    ok(res, { ativo: await plano1real.status() });
  } catch (e) {
    console.error("plano1real:", e);
    erro(res, 500, "Erro ao consultar o Plano R$ 1.");
  }
};