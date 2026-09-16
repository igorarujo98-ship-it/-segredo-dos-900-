/**
 * POST /api/mercadopago/upgrade
 * Gera o pagamento de UPGRADE para o Plano Ultra usando a sessão do aluno
 * (que já está logado). O webhook reconhece o plano pelo título do item e
 * altera o plano do mesmo aluno para "ultra".
 * Body: { sessao }
 */
const { lerJson, ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const mp = require("../_lib/mercadopago.js");
const PLANOS = require("../../config/planos.js");

module.exports = async function handler(req, res) {
  try {
    const dados = await lerJson(req);
    const sessao = String(dados.sessao || "").trim();

    const aluno = await alunos.buscarAlunoPorSessao(sessao);
    if (!aluno) return erro(res, 401, "Sessão inválida ou expirada. Faça login novamente.");
    if (aluno.status !== "approved") return erro(res, 403, "Seu acesso ainda não foi liberado.");

    const plano = PLANOS.porId("upgrade");
    if (!plano) return erro(res, 400, "Upgrade indisponível no momento.");

    // Marca o upgrade: quando o webhook confirmar o pagamento, o aluno
    // é promovido para o plano de destino (ultra).
    await alunos.marcarUpgradePendente(aluno, plano.planoDestino || "ultra");

    try {
      const preferencia = await mp.criarPreferencia({ plano, aluno });
      ok(res, { url: preferencia.url, usandoFallback: false });
    } catch (e) {
      console.error("upgrade:", e);
      // Não existe link estático confiável para o valor do upgrade (R$ 83,94):
      // melhor avisar a falha do que mandar o aluno para um checkout com preço errado.
      await alunos.limparUpgradePendente(aluno);
      erro(res, 502, "Não foi possível gerar o pagamento do upgrade. Tente novamente.");
    }
  } catch (e) {
    console.error("upgrade:", e);
    erro(res, 500, "Erro ao gerar o upgrade.");
  }
};