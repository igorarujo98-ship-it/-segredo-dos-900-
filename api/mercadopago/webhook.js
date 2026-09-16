/**
 * POST /api/mercadopago/webhook
 *
 * Recebe a notificação do Mercado Pago, CONSULTA A API para confirmar o
 * pagamento (approved) e só então:
 *   1. gera o token individual do aluno;
 *   2. vincula Pagamento -> Aluno -> Plano -> Token;
 *   3. envia o token por e-mail.
 *
 * Nunca confiamos no conteúdo da notificação: validamos na API do Mercado Pago.
 * Webhooks duplicados não geram token/e-mail em dobro (idempotência).
 */
const { lerCorpo, ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const mp = require("../_lib/mercadopago.js");
const mailer = require("../_lib/mailer.js");
const PLANOS = require("../../config/planos.js");

function idDoCorpo(body) {
  return (
    (body && body.data && (body.data.id || body.data.payment_id)) ||
    (body && body.payment_id) ||
    (body && body.id) ||
    null
  );
}

async function enviarAcesso(aluno) {
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
}

module.exports = async function handler(req, res) {
  try {
    const rawBody = await lerCorpo(req);
    let body = {};
    const texto = rawBody.toString("utf-8");
    try {
      body = JSON.parse(texto);
    } catch (_e) {
      new URLSearchParams(texto).forEach(function (v, k) {
        body[k] = v;
      });
    }

    const paymentId = idDoCorpo(body);

    // Extrai o id também da query string (webhooks antigos do MP)
    const query = new URL(req.url, "http://localhost").searchParams.get("data.id");
    const idFinal = String(paymentId || query || "").trim();
    if (!idFinal) return ok(res, { recebido: true });

    // Assinatura HMAC (se WEBHOOK_SECRET estiver configurada).
    const assinaturaOk = mp.assinaturaValida(body, rawBody, idFinal, req.headers);
    if (!assinaturaOk) return ok(res, { recebido: true, assinatura: "invalida" });

    // 1) Confirmação real via API do Mercado Pago (nunca confiar no navegador).
    const pagamento = await mp.obterPagamento(idFinal);
    if (!pagamento) return ok(res, { recebido: true, pagamento: "nao-encontrado" });

    if (pagamento.status !== "approved") {
      // pendente, recusado, cancelado... -> não libera nada.
      return ok(res, { recebido: true, statusPagamento: pagamento.status });
    }

    // 2) Localiza o aluno: primeiro pelo external_reference, depois pelo e-mail.
    let aluno = null;
    if (pagamento.external_reference) {
      aluno = await alunos.buscarAluno(pagamento.external_reference);
    }
    if (!aluno && pagamento.payer && pagamento.payer.email) {
      aluno = await alunos.buscarPorEmail(pagamento.payer.email);
    }
    if (!aluno) return ok(res, { recebido: true, aluno: "nao-encontrado" });

    // 3) Registra aprovação + gera token (idempotente).
    const resultado = await alunos.registrarPagamentoAprovado(aluno, pagamento);

    // 4) Envia o token por e-mail (só se ainda não foi enviado).
    const alunoAtual = await alunos.buscarAluno(aluno.id);
    if (alunoAtual && alunoAtual.token && !alunoAtual.email_enviado) {
      await enviarAcesso(alunoAtual);
    }

    ok(res, {
      recebido: true,
      processado: resultado.processado,
      planoAtualizado: resultado.planoAtualizado || null,
      statusPagamento: "approved",
    });
  } catch (e) {
    console.error("webhook:", e);
    // Responder 200 mesmo em erro de processamento evita reenvio infinito pelo MP.
    ok(res, { recebido: true, erro: e.message });
  }
};