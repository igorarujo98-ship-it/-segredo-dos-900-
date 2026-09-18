/**
 * Plano R$ 1 — estado de ativação (ligado/desligado) controlado pelo admin.
 *
 * O estado é guardado no mesmo armazenamento (Vercel KV / arquivo local dos
 * alunos), então vale para todas as funções serverless e para o site na hora,
 * sem precisar republicar código. Desativar apenas bloqueia NOVAS vendas:
 * alunos já aprovados continuam com acesso normal.
 */
const storage = require("./storage.js");

const CHAVE = "config:plano1real";
const ATIVO_PADRAO = false; // começa desativado até o admin ligar (seguro)

async function status() {
  const guardado = await storage.get(CHAVE);
  if (guardado && typeof guardado.ativo === "boolean") return guardado.ativo;
  return ATIVO_PADRAO;
}

async function ativo() {
  return status();
}

async function setarStatus(ativar) {
  const valor = !!ativar;
  await storage.set(CHAVE, { ativo: valor });
  return valor;
}

module.exports = { CHAVE, status, ativo, setarStatus };