/**
 * POST /api/mercadopago/preference
 * Cria a preferência (Checkout Pro) no Mercado Pago já vinculada ao aluno,
 * e devolve a URL para onde o navegador será redirecionado.
 * Body: { alunoId, plano }
 */
const { lerJson, ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const mp = require("../_lib/mercadopago.js");
const PLANOS = require("../../config/planos.js");
const plano1real = require("../_lib/plano1real.js");

module.exports = async function handler(req, res) {
  try {
    const dados = await lerJson(req);
    const alunoId = String(dados.alunoId || "").trim();
    const planoId = String(dados.plano || "").trim();

    const aluno = await alunos.buscarAluno(alunoId);
    if (!aluno) return erro(res, 400, "Cadastro não encontrado. Refaça o cadastro.");

    const plano = PLANOS.porId(planoId);
    if (!plano) return erro(res, 400, "Plano inválido.");
    if (plano.id === "1real" && !(await plano1real.ativo())) {
      return erro(res, 400, "O Plano R$ 1 está desativado no momento.");
    }

    try {
      const preferencia = await mp.criarPreferencia({ plano, aluno });
      ok(res, { url: preferencia.url, id: preferencia.id, usandoFallback: false });
    } catch (ePreferencia) {
      console.error("preference:", ePreferencia);
      // Fallback: usa o link estático configurado. A associação pagamento->aluno
      // continua via e-mail informado no checkout (webhook tenta por e-mail).
      ok(res, { url: plano.urlPagamento, id: null, usandoFallback: true });
    }
  } catch (e) {
    erro(res, 500, "Erro ao gerar o pagamento.");
    console.error("preference:", e);
  }
};