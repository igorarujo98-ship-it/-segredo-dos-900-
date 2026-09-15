/**
 * POST /api/email/enviar-token
 * Reenvio MANUAL do e-mail com o código, feito pelo admin (professor).
 * Header: x-admin-key  (valor da variável ADMIN_KEY)
 * Body: { codigo }   (código de acesso do aluno)
 */
const { lerJson, ok, erro } = require("../lib/http.js");
const alunos = require("../lib/alunos.js");
const mailer = require("../lib/mailer.js");
const PLANOS = require("../../config/planos.js");

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-admin-key"] || "";
    if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
      return erro(res, 401, "Não autorizado.");
    }

    const dados = await lerJson(req);
    const codigo = String(dados.codigo || "").trim();

    const aluno = await alunos.buscarPorToken(codigo);
    if (!aluno) return erro(res, 404, "Código não encontrado.");
    if (aluno.status !== "approved" || !aluno.token) {
      return erro(res, 400, "Esse código ainda não foi liberado (pagamento não aprovado).");
    }

    const plano = PLANOS.porId(aluno.plano) || {};
    await mailer.enviarToken({
      email: aluno.email,
      nome: aluno.nome,
      planoNome: plano.nome || aluno.plano,
      codigo: aluno.token,
      expiraEm: aluno.expira_em,
    });

    aluno.email_enviado = true;
    await alunos.salvarAluno(aluno);

    ok(res, { enviado: true, para: aluno.email });
  } catch (e) {
    console.error("enviar-token:", e);
    erro(res, 500, "Erro no reenvio do e-mail.");
  }
};