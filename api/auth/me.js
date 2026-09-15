/**
 * GET /api/auth/me
 * Valida a sessão do aluno (header x-sessao ou ?sessao=) e devolve os dados
 * públicos. Bloqueia acesso expirado.
 */
const { ok, erro, extrairSessao } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const tokenLib = require("../_lib/token.js");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const sessao = extrairSessao(req, url);

    if (!sessao) return erro(res, 401, "Sessão não informada.");

    const aluno = await alunos.buscarAlunoPorSessao(sessao);
    if (!aluno) return erro(res, 401, "Sessão inválida ou expirada. Faça login novamente.");

    if (aluno.status !== "approved") {
      return erro(res, 403, "Seu pagamento ainda não foi confirmado.");
    }

    if (tokenLib.expirado(aluno.expira_em)) {
      return erro(res, 403, "Seu acesso ao curso expirou.");
    }

    ok(res, { aluno: alunos.dadosPublicos(aluno) });
  } catch (e) {
    console.error("me:", e);
    erro(res, 500, "Erro ao validar a sessão.");
  }
};