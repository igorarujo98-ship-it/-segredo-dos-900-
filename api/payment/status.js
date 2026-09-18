/**
 * GET /api/payment/status?aluno=ID
 * Usado pela página de sucesso para acompanhar a confirmação do pagamento.
 * Retorna o status geral (pendente/approved) sem expor o token.
 *
 * GET /api/payment/status?modo=plano1
 * Público: informa se o Plano R$ 1 está ativo para venda (o site usa para
 * mostrar/ocultar o cartão). Unido a este endpoint para não estourar o
 * limite de 12 Serverless Functions do plano Hobby da Vercel.
 */
const { ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const plano1real = require("../_lib/plano1real.js");

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");

    if (String(url.searchParams.get("modo") || "").trim() === "plano1") {
      return ok(res, { ativo: await plano1real.status() });
    }

    const alunoId = String(url.searchParams.get("aluno") || "").trim();

    if (!alunoId) return erro(res, 400, "Parâmetro aluno não informado.");

    const aluno = await alunos.buscarAluno(alunoId);
    if (!aluno) return erro(res, 404, "Cadastro não encontrado.");

    ok(res, {
      status: aluno.status,
      aprovado: aluno.status === "approved",
      tokenEnviado: !!aluno.email_enviado,
      // O token só é exposto APÓS o pagamento aprovado, para o aluno
      // copiá-lo na plataforma (página de sucesso) sem depender do e-mail.
      token: aluno.status === "approved" ? aluno.token : undefined,
      plano: aluno.plano,
      liberadoEm: aluno.liberado_em,
      expiraEm: aluno.expira_em,
    });
  } catch (e) {
    console.error("payment/status:", e);
    erro(res, 500, "Erro ao consultar o pagamento.");
  }
};