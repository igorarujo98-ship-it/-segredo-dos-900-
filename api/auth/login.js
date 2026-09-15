/**
 * POST /api/auth/login
 * Autentica o aluno com E-mail + Código de acesso (token).
 * Body: { email, codigo }
 */
const { lerJson, ok, erro } = require("../lib/http.js");
const alunos = require("../lib/alunos.js");
const tokenLib = require("../lib/token.js");
const PLANOS = require("../../config/planos.js");

module.exports = async function handler(req, res) {
  try {
    const dados = await lerJson(req);
    const email = alunos.normalizarEmail(dados.email);
    const codigo = String(dados.codigo || "").trim();

    if (!email || !codigo) {
      return erro(res, 400, "Informe seu e-mail e seu código de acesso.");
    }

    const aluno = await alunos.buscarPorToken(codigo);
    if (!aluno) return erro(res, 401, "Código de acesso inválido. Confira o e-mail recebido.");

    if (aluno.email !== email) {
      return erro(res, 401, "O código informado não corresponde a este e-mail.");
    }

    if (aluno.status !== "approved") {
      return erro(
        res,
        403,
        "Seu pagamento ainda não foi confirmado pelo Mercado Pago. Assim que for aprovado, seu acesso será liberado automaticamente."
      );
    }

    if (tokenLib.expirado(aluno.expira_em)) {
      return erro(res, 403, "Seu acesso ao curso expirou.");
    }

    const planoNome = (PLANOS.porId(aluno.plano) || {}).nome || aluno.plano;
    const sessao = await alunos.criarSessao(aluno.id);

    ok(res, {
      sessao: sessao,
      aluno: alunos.dadosPublicos(aluno),
      planoNome: planoNome,
    });
  } catch (e) {
    console.error("login:", e);
    erro(res, 500, "Erro ao fazer login. Tente novamente.");
  }
};