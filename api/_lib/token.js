/**
 * Geração criptograficamente segura de códigos e utilitários de validade.
 */
const crypto = require("crypto");

/** Validade do acesso em dias (1 ano, contado a partir da liberação). */
const VALIDADE_DIAS = 365;

/**
 * Gera o código de acesso individual do aluno.
 * Formato: 900PLUS-XXXX-XXXX (48 bits de aleatoriedade por varredura).
 */
function gerarToken() {
  const hex = crypto.randomBytes(6).toString("hex").toUpperCase();
  return "900PLUS-" + hex.slice(0, 4) + "-" + hex.slice(4, 8);
}

/** ID interno do aluno (não é o código de acesso). */
function gerarIdAluno() {
  return "A" + crypto.randomBytes(8).toString("hex");
}

/** ID de sessão de login (nunca é enviado o token real). */
function gerarSessao() {
  return crypto.randomBytes(24).toString("base64url");
}

/** Soma 'dias' à data atual (UTC) e retorna ISO. */
function calcularExpiracao(desde, dias) {
  const d = desde ? new Date(desde) : new Date();
  d.setDate(d.getDate() + (dias || VALIDADE_DIAS));
  return d.toISOString();
}

/** Veredito simples de expiração. */
function expirado(expiraEmIso) {
  if (!expiraEmIso) return false;
  return new Date(expiraEmIso).getTime() <= Date.now();
}

module.exports = {
  VALIDADE_DIAS,
  gerarToken,
  gerarIdAluno,
  gerarSessao,
  calcularExpiracao,
  expirado,
};