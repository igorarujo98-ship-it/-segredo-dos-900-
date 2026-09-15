/**
 * Regras de negócio do aluno: cadastro, vínculo com pagamento,
 * geração de token e sessões.
 */
const storage = require("./storage");
const tokenLib = require("./token");
const PLANOS = require("../../config/planos.js");

const PREFIXO_ALUNO = "aluno:";
const PREFIXO_EMAIL = "email:";
const PREFIXO_TOKEN = "token:";
const PREFIXO_SESSAO = "sessao:";
const PREFIXO_PAGAMENTO = "pagamento:";
const PREFIXO_WEBHOOK = "webhook:";

const TTL_SESSAO = 30 * 24 * 60 * 60; // 30 dias
const TTL_WEBHOOK = 3 * 24 * 60 * 60; // 3 dias (período em que o MP reenvia notificações)
const TTL_PAGAMENTO = 3 * 24 * 60 * 60;

/** Normaliza e-mail para índices. */
function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Cria o registro do aluno com status "pendente" (antes do pagamento). */
async function criarAluno({ nome, cpf, email, whatsapp, plano }) {
  const id = tokenLib.gerarIdAluno();
  const emailLimp = normalizarEmail(email);

  const aluno = {
    id: id,
    nome: String(nome || "").trim(),
    cpf: String(cpf || "").trim(),
    email: emailLimp,
    whatsapp: String(whatsapp || "").trim(),
    plano: plano,
    status: "pendente", // pendente -> approved
    pagamento_id: null,
    metodo_pagamento: null,
    token: null,
    email_enviado: false,
    criado_em: new Date().toISOString(),
    liberado_em: null,
    expira_em: null,
  };

  await salvarAluno(aluno);
  await storage.set(PREFIXO_EMAIL + emailLimp, id); // índice e-mail -> aluno
  return aluno;
}

async function salvarAluno(aluno) {
  await storage.set(PREFIXO_ALUNO + aluno.id, aluno);
}

/**
 * Cria o aluno JÁ LIBERADO (sem passar por pagamento).
 * Usado pelo painel de administração para "presentear" um acesso
 * (gerar token grátis para um amigo). Somente o admin (ADMIN_KEY) acessa.
 */
async function criarAlunoLiberado({ nome, cpf, email, whatsapp, plano, diasValidade }) {
  const id = tokenLib.gerarIdAluno();
  const emailLimp = normalizarEmail(email);
  const agora = new Date();
  const token = tokenLib.gerarToken();

  const aluno = {
    id: id,
    nome: String(nome || "").trim(),
    cpf: String(cpf || "").trim(),
    email: emailLimp,
    whatsapp: String(whatsapp || "").trim(),
    plano: plano,
    status: "approved",
    pagamento_id: null,
    metodo_pagamento: "manual",
    token: token,
    email_enviado: false,
    criado_em: agora.toISOString(),
    liberado_em: agora.toISOString(),
    expira_em: tokenLib.calcularExpiracao(agora, diasValidade || tokenLib.VALIDADE_DIAS),
  };

  await salvarAluno(aluno);
  await storage.set(PREFIXO_EMAIL + emailLimp, id); // índice e-mail -> aluno
  await storage.set(PREFIXO_TOKEN + token, id); // índice token -> aluno
  return aluno;
}

async function buscarAluno(id) {
  if (!id) return null;
  return storage.get(PREFIXO_ALUNO + id);
}

async function buscarPorEmail(email) {
  const id = await storage.get(PREFIXO_EMAIL + normalizarEmail(email));
  if (!id) return null;
  return buscarAluno(id);
}

async function buscarPorToken(token) {
  const id = await storage.get(PREFIXO_TOKEN + String(token || "").trim());
  if (!id) return null;
  return buscarAluno(id);
}

/** Marca o pagamento como aprovado, gera o token (uma única vez) e libera 1 ano. */
async function registrarPagamentoAprovado(aluno, pagamento) {
  const jaProcessado = !(await storage.setnx(PREFIXO_WEBHOOK + pagamento.id, aluno.id, TTL_WEBHOOK));
  if (jaProcessado) {
    // Webhook duplicado: não gera outro token nem envia e-mail novamente.
    return { processado: false };
  }

  let novoToken = false;
  if (!aluno.token) {
    aluno.token = tokenLib.gerarToken();
    await storage.set(PREFIXO_TOKEN + aluno.token, aluno.id); // índice token -> aluno
    novoToken = true;
  }

  const agora = new Date();
  if (aluno.status !== "approved") {
    aluno.status = "approved";
    aluno.liberado_em = aluno.liberado_em || agora.toISOString();
    aluno.expira_em = aluno.expira_em || tokenLib.calcularExpiracao(agora, tokenLib.VALIDADE_DIAS);
  }

  aluno.pagamento_id = pagamento.id;
  aluno.metodo_pagamento = pagamento.payment_method_id || null;

  await salvarAluno(aluno);
  await storage.set(PREFIXO_PAGAMENTO + pagamento.id, aluno.id, TTL_PAGAMENTO);

  return { processado: true, novoToken: novoToken, token: aluno.token };
}

/** Cria uma sessão de login para o aluno. */
async function criarSessao(alunoId) {
  const sessao = tokenLib.gerarSessao();
  await storage.set(PREFIXO_SESSAO + sessao, alunoId, TTL_SESSAO);
  return sessao;
}

/** Retorna o aluno a partir da sessão, ou null se inválida/expirada. */
async function buscarAlunoPorSessao(sessao) {
  if (!sessao) return null;
  const alunoId = await storage.get(PREFIXO_SESSAO + String(sessao));
  if (!alunoId) return null;
  return buscarAluno(alunoId);
}

/** Dados públicos do aluno (nunca expõe token). */
function dadosPublicos(aluno) {
  return {
    nome: aluno.nome,
    plano: aluno.plano,
    planoNome: (PLANOS.porId(aluno.plano) || {}).nome || aluno.plano,
    status: aluno.status,
    liberadoEm: aluno.liberado_em,
    expiraEm: aluno.expira_em,
    materialExclusivo: !!(PLANOS.porId(aluno.plano) || {}).incluimaterialExclusivo,
  };
}

module.exports = {
  criarAluno,
  criarAlunoLiberado,
  salvarAluno,
  buscarAluno,
  buscarPorEmail,
  buscarPorToken,
  registrarPagamentoAprovado,
  criarSessao,
  buscarAlunoPorSessao,
  dadosPublicos,
  normalizarEmail,
};