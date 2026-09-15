/**
 * GET /api/payment/status?aluno=ID
 * Usado pela página de sucesso para acompanhar a confirmação do pagamento.
 * Retorna o status geral (pendente/approved) sem expor o token.
 */
const { ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const alunoId = String(url.searchParams.get("aluno") || "").trim();

    if (!alunoId) return erro(res, 400, "Parâmetro aluno não informado.");

    const aluno = await alunos.buscarAluno(alunoId);
    if (!aluno) return erro(res, 404, "Cadastro não encontrado.");

    ok(res, {
      status: aluno.status,
      aprovado: aluno.status === "approved",
      tokenEnviado: !!aluno.email_enviado,
      plano: aluno.plano,
      liberadoEm: aluno.liberado_em,
      expiraEm: aluno.expira_em,
    });
  } catch (e) {
    console.error("payment/status:", e);
    erro(res, 500, "Erro ao consultar o pagamento.");
  }
};