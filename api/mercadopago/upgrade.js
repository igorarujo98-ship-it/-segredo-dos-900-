/**
 * POST /api/mercadopago/upgrade
 * Gera o pagamento de UPGRADE para o Plano Ultra usando a sessão do aluno
 * (que já está logado). O webhook reconhece o plano pelo título do item e
 * altera o plano do mesmo aluno para "ultra".
 * Body: { sessao }
 */
const { lerJson, ok, erro } = require("../lib/http.js");
const alunos = require("../lib/alunos.js");
const mp = require("../lib/mercadopago.js");
const PLANOS = require("../../config/planos.js");

module.exports = async function handler(req, res) {
  try {
    const dados = await lerJson(req);
    const sessao = String(dados.sessao || "").trim();

    const aluno = await alunos.buscarAlunoPorSessao(sessao);
    if (!aluno) return erro(res, 401, "Sessão inválida ou expirada. Faça login novamente.");
    if (aluno.status !== "approved") return erro(res, 403, "Seu acesso ainda não foi liberado.");

    const plano = PLANOS.porId("ultra");
    if (!plano) return erro(res, 400, "Plano Ultra indisponível no momento.");

    try {
      const preferencia = await mp.criarPreferencia({ plano, aluno });
      ok(res, { url: preferencia.url, usandoFallback: false });
    } catch (e) {
      console.error("upgrade:", e);
      ok(res, { url: plano.urlPagamento, usandoFallback: true });
    }
  } catch (e) {
    console.error("upgrade:", e);
    erro(res, 500, "Erro ao gerar o upgrade.");
  }
};