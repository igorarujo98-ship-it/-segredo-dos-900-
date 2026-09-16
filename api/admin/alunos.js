/**
 * GET /api/admin/alunos
 * Lista todos os alunos cadastrados (pendentes e liberados) com o código
 * de acesso de cada um. Serve para o admin consultar quem já adquiriu o
 * curso e, se o aluno perdeu o código, recuperar/enviar novamente.
 *
 * Requer o header x-admin-key com o valor de ADMIN_KEY (variável de ambiente).
 *
 * Query opcional:
 *   ?status=approved|pendente  filtra pelo status do aluno.
 */
const { ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const PLANOS = require("../../config/planos.js");

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-admin-key"] || "";
    if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
      return erro(res, 401, "Não autorizado. Verifique a chave de administrador.");
    }

    const statusFiltro = (new URL(req.url, "http://localhost").searchParams.get("status") || "").trim();
    const todas = await alunos.listarAlunos();

    let lista = todas;
    if (statusFiltro) {
      lista = todas.filter(function (a) {
        return a.status === statusFiltro;
      });
    }

    const dados = lista.map(function (a) {
      const plano = PLANOS.porId(a.plano) || {};
      return {
        id: a.id,
        nome: a.nome,
        email: a.email,
        whatsapp: a.whatsapp,
        cpf: a.cpf,
        plano: a.plano,
        planoNome: plano.nome || a.plano,
        status: a.status,
        metodo_pagamento: a.metodo_pagamento,
        token: a.token || null,
        email_enviado: !!a.email_enviado,
        criado_em: a.criado_em,
        liberado_em: a.liberado_em,
        expira_em: a.expira_em,
        pagamento_id: a.pagamento_id || null,
      };
    });

    ok(res, { total: dados.length, alunos: dados });
  } catch (e) {
    console.error("admin/alunos:", e);
    erro(res, 500, "Erro ao listar os alunos.");
  }
};