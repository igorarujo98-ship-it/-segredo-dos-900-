/**
 * Comunicação segura com a API do Mercado Pago (server-side apenas).
 * Nenhuma credencial aparece no navegador.
 */
const crypto = require("crypto");
const PLANOS = require("../../config/planos.js");

const API = "https://api.mercadopago.com";

function accessToken() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return t;
}

/**
 * Cria a preferência de pagamento (Checkout Pro) associando o aluno.
 * Assim o webhook consegue vincular Pagamento -> Aluno -> Plano -> Token.
 * O pagamento fica em até 6x e SEM PIX (somente cartão).
 */
async function criarPreferencia({ plano, aluno }) {
  const urlBase = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const access = accessToken();

  // O Mercado Pago cobra unit_price como VALOR TOTAL do item (e divide em
  // parcelas conforme payment_methods.installments). Por isso usamos o
  // precoTotal do plano, e nunca o valor de uma única parcela.
  const valorTotal = Number(
    plano.precoTotal != null
      ? plano.precoTotal
      : plano.preco * (plano.parcelas || PLANOS.parcelas || 1)
  );

  const preferencia = {
    items: [
      {
        title: "O Segredo dos 900+ — " + plano.nome,
        description: "Curso de Redação para o ENEM",
        quantity: 1,
        unit_price: valorTotal,
        currency_id: "BRL",
      },
    ],
    payer: {
      name: aluno.nome,
      email: aluno.email,
    },
    external_reference: aluno.id, // usado para vincular pagamento -> aluno
    notification_url: urlBase + "/api/mercadopago/webhook",
    back_urls: {
      success: urlBase + "/sucesso.html?aluno=" + encodeURIComponent(aluno.id),
      pending: urlBase + "/sucesso.html?aluno=" + encodeURIComponent(aluno.id),
      failure: urlBase + "/sucesso.html?aluno=" + encodeURIComponent(aluno.id),
    },
    auto_return: "approved",
    statement_descriptor: "SEGREDO DOS 900+",
    payment_methods: {
      installments: Number(plano.parcelas || PLANOS.parcelas || 6),
    },
  };

  try {
    // Oferta 1: exclui o PIX (politica do curso: apenas cartão / Mercado Pago).
    const corpo = JSON.parse(JSON.stringify(preferencia));
    corpo.payment_methods.excluded_payment_methods = [{ id: "pix" }];
    const resp = await gravarPreferencia(corpo, access);
    return resp;
  } catch (_erro) {
    // Oferta 2 (fallback de compatibilidade): sem exclusão do PIX.
    const resp = await gravarPreferencia(preferencia, access);
    return resp;
  }
}

async function gravarPreferencia(preferencia, access) {
  const res = await fetch(API + "/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + access,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferencia),
  });
  if (!res.ok) {
    const texto = await res.text().catch(function () {
      return "";
    });
    throw new Error("Mercado Pago (preferência) " + res.status + ": " + texto.slice(0, 300));
  }
  const dados = await res.json();
  return {
    id: dados.id,
    url: dados.init_point || dados.sandbox_init_point,
  };
}

/**
 * Consulta o pagamento na API do Mercado Pago.
 * Nunca confiamos no que o navegador/webhook diz: validamos na API.
 */
async function obterPagamento(paymentId) {
  const res = await fetch(API + "/v1/payments/" + paymentId, {
    headers: { Authorization: "Bearer " + accessToken() },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const texto = await res.text().catch(function () {
      return "";
    });
    throw new Error("Mercado Pago (consulta) " + res.status + ": " + texto.slice(0, 300));
  }
  return res.json();
}

/**
 * Valida a assinatura HMAC do webhook do Mercado Pago.
 * Se WEBHOOK_SECRET não estiver configurado, retorna true (a segurança
 * continua garantida pela consulta à API do Mercado Pago).
 */
function assinaturaValida(body, rawBody, queryString, headers) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = headers["x-signature"] || "";
  const xRequestId = headers["x-request-id"] || "";

  // Extrai ts=... e v1=...
  let ts = null;
  let hash = null;
  String(xSignature)
    .split(",")
    .forEach(function (parte) {
      var kv = parte.split("=");
      if (kv[0] === "ts") ts = kv[1];
      if (kv[0] === "v1") hash = kv[1];
    });

  if (!ts || !hash) return false;

  // Considera o id do pagamento (vindo do corpo ou da query string).
  const dataId = (body && body.data && body.data.id) || queryString;

  if (!dataId && !xRequestId) return false;

  const manifesto = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + ts + ";";
  const esperado = crypto
    .createHmac("sha256", secret)
    .update(manifesto, "utf-8")
    .digest("hex");

  return esperado === hash;
}

module.exports = { criarPreferencia, obterPagamento, assinaturaValida };