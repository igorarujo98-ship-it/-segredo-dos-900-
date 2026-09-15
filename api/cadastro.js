/**
 * POST /api/cadastro
 * Cadastra o aluno (status pendente) ANTES de seguir para o pagamento.
 * Body: { nome, cpf, email, emailConfirm, whatsapp, plano }
 */
const { lerJson, ok, erro } = require("./_lib/http.js");
const alunos = require("./_lib/alunos.js");
const PLANOS = require("../config/planos.js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validarCpf(cpf) {
  const numeros = String(cpf || "").replace(/\D/g, "");
  return numeros.length === 11;
}

function validarWhatsapp(wa) {
  const numeros = String(wa || "").replace(/\D/g, "");
  return numeros.length >= 10 && numeros.length <= 13;
}

module.exports = async function handler(req, res) {
  try {
    const dados = await lerJson(req);

    const nome = String(dados.nome || "").trim();
    const cpf = String(dados.cpf || "").trim();
    const email = String(dados.email || "").trim().toLowerCase();
    const emailConfirm = String(dados.emailConfirm || "").trim().toLowerCase();
    const whatsapp = String(dados.whatsapp || "").trim();
    const plano = String(dados.plano || "").trim();

    if (nome.length < 2) return erro(res, 400, "Informe seu nome completo.");
    if (!validarCpf(cpf)) return erro(res, 400, "CPF inválido. Informe os 11 dígitos.");
    if (!EMAIL_RE.test(email)) return erro(res, 400, "Informe um e-mail válido.");
    if (!email) return erro(res, 400, "O e-mail é obrigatório.");
    if (email !== emailConfirm) return erro(res, 400, "Os e-mails informados não são iguais.");
    if (!validarWhatsapp(whatsapp)) return erro(res, 400, "Informe um WhatsApp válido com DDD.");

    const planoObj = PLANOS.porId(plano);
    if (!planoObj) return erro(res, 400, "Escolha um plano válido (basico ou ultra).");

    const aluno = await alunos.criarAluno({ nome, cpf, email, whatsapp, plano });

    ok(res, {
      alunoId: aluno.id,
      plano: planoObj.id,
      planoNome: planoObj.nome,
    });
  } catch (e) {
    erro(res, 500, "Erro interno ao cadastrar. Tente novamente.");
    console.error("cadastro:", e);
  }
};