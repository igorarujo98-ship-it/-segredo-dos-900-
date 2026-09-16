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

/**
 * Lista TODOS os alunos cadastrados (pendentes e liberados),
 * do mais recente para o mais antigo. Usado pelo painel de administração.
 */
async function listarAlunos() {
  const chaves = await storage.keys(PREFIXO_ALUNO + "*");
  const alunos = [];
  for (const chave of chaves) {
    const aluno = await storage.get(chave);
    if (aluno && aluno.id) alunos.push(aluno);
  }
  alunos.sort(function (a, b) {
    return new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime();
  });
  return alunos;
}

/**
 * Exclui um aluno e TODOS os registros relacionados: índice de e-mail,
 * índice de token, sessões ativas, vínculos de pagamento e de webhook.
 * Retorna um resumo do que foi removido, ou null se o aluno não existir.
 */
async function excluirAluno(id) {
  if (!id) return null;
  const aluno = await buscarAluno(id);
  if (!aluno) return null;

  const removidos = { aluno: 0, email: 0, token: 0, sessoes: 0, pagamentos: 0, webhooks: 0 };

  if (await storage.del(PREFIXO_ALUNO + aluno.id)) removidos.aluno++;

  if (aluno.email && (await storage.del(PREFIXO_EMAIL + normalizarEmail(aluno.email)))) {
    removidos.email++;
  }

  if (aluno.token && (await storage.del(PREFIXO_TOKEN + aluno.token))) {
    removidos.token++;
  }

  async function apagarVinculos(prefixo, contador) {
    const chaves = await storage.keys(prefixo + "*");
    for (const chave of chaves) {
      if ((await storage.get(chave)) === aluno.id) {
        if (await storage.del(chave)) removidos[contador]++;
      }
    }
  }

  await apagarVinculos(PREFIXO_SESSAO, "sessoes");
  await apagarVinculos(PREFIXO_PAGAMENTO, "pagamentos");
  await apagarVinculos(PREFIXO_WEBHOOK, "webhooks");

  return removidos;
}

/**
 * Marca um upgrade pendente no aluno. Quando o pagamento do upgrade for
 * aprovado, o webhook move o aluno para o plano de destino (ex.: "ultra").
 */
async function marcarUpgradePendente(aluno, planoDestino) {
  aluno.upgrade_pendente = planoDestino;
  await salvarAluno(aluno);
}

/** Remove a marcação de upgrade pendente (ex.: quando o pagamento não pôde ser gerado). */
async function limparUpgradePendente(aluno) {
  if (aluno && aluno.upgrade_pendente) {
    delete aluno.upgrade_pendente;
    await salvarAluno(aluno);
  }
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

  // Upgrade pendente: o pagamento aprovado promove o aluno para o plano de destino.
  let planoAtualizado = null;
  if (aluno.upgrade_pendente) {
    const destino = PLANOS.porId(aluno.upgrade_pendente);
    if (destino && destino.id !== aluno.plano) {
      aluno.plano = destino.id;
      planoAtualizado = destino.id;
    }
    delete aluno.upgrade_pendente;
  }

  aluno.pagamento_id = pagamento.id;
  aluno.metodo_pagamento = pagamento.payment_method_id || null;

  await salvarAluno(aluno);
  await storage.set(PREFIXO_PAGAMENTO + pagamento.id, aluno.id, TTL_PAGAMENTO);

  return { processado: true, novoToken: novoToken, token: aluno.token, planoAtualizado: planoAtualizado };
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
  listarAlunos,
  excluirAluno,
  registrarPagamentoAprovado,
  marcarUpgradePendente,
  limparUpgradePendente,
  criarSessao,
  buscarAlunoPorSessao,
  dadosPublicos,
  normalizarEmail,
};