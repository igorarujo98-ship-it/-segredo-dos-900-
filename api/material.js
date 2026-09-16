/**
 * GET /api/material?aula=aula1&sessao=...   ou
 * GET /api/material?material=exclusivo&sessao=...   (todos os temas juntos)
 * GET /api/material?material=tema1&sessao=...       (um tema individual)
 *
 * Entrega os PDFs das aulas e do material exclusivo SOMENTE para alunos
 * logados (sessão válida) com o plano permitido. Os arquivos ficam em
 * api/_arquivos/ e nunca são servidos publicamente.
 */
const path = require("path");
const fs = require("fs");
const { erro, extrairSessao } = require("./_lib/http.js");
const alunos = require("./_lib/alunos.js");
const tokenLib = require("./_lib/token.js");
const AULAS = require("../config/aulas.js");
const PLANOS = require("../config/planos.js");

const DIR_ARQUIVOS = path.join(__dirname, "_arquivos");

function caminhoSeguro(subdir, arquivo) {
  const destino = path.join(DIR_ARQUIVOS, subdir, arquivo);
  const raiz = path.join(DIR_ARQUIVOS, subdir);
  if (!destino.startsWith(raiz + path.sep)) return null;
  return destino;
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://localhost");
    const sessao = extrairSessao(req, url);
    const tipoAula = url.searchParams.get("aula");
    const tipoMaterial = url.searchParams.get("material");

    if (!sessao) return erro(res, 401, "Faça login para acessar os materiais.");

    const aluno = await alunos.buscarAlunoPorSessao(sessao);
    if (!aluno) return erro(res, 401, "Sessão inválida ou expirada. Faça login novamente.");
    if (aluno.status !== "approved") return erro(res, 403, "Pagamento ainda não confirmado.");
    if (tokenLib.expirado(aluno.expira_em)) return erro(res, 403, "Seu acesso ao curso expirou.");

    let arquivo = null;
    let subdir = null;
    let nomeExibicao = null;

    if (tipoAula) {
      const aula = AULAS.aulaPorId(tipoAula);
      if (!aula) return erro(res, 404, "Aula não encontrada.");

      // Nível mínimo: todas as aulas exigem o plano básico (configuração atual).
      const minimo = AULAS.planoMinimo || "basico";
      if (minimo === "ultra" && !(PLANOS.porId(aluno.plano) || {}).incluimaterialExclusivo) {
        return erro(res, 403, "Conteúdo exclusivo do Plano Ultra.");
      }

      if (!aula.pdf) return erro(res, 404, "Material desta aula em breve.");
      arquivo = aula.pdf;
      subdir = "aulas";
      nomeExibicao = "aula " + aula.numero + " - curso.pdf";
    } else if (tipoMaterial === "exclusivo") {
      const plano = PLANOS.porId(aluno.plano) || {};
      if (!plano.incluimaterialExclusivo) {
        return erro(
          res,
          403,
          "Este material é exclusivo do Plano Ultra. Faça upgrade para ter acesso."
        );
      }
      const mat = AULAS.materialExclusivo;
      arquivo = mat.pdf;
      subdir = "materiais";
      nomeExibicao = mat.pdf;
    } else if (tipoMaterial && tipoMaterial.indexOf("tema") === 0) {
      const plano = PLANOS.porId(aluno.plano) || {};
      if (!plano.incluimaterialExclusivo) {
        return erro(
          res,
          403,
          "Este material é exclusivo do Plano Ultra. Faça upgrade para ter acesso."
        );
      }
      const temas = (AULAS.materialExclusivo || {}).temas || [];
      const t = temas.filter(function (x) {
        return x.id === tipoMaterial;
      })[0];
      if (!t) return erro(res, 404, "Tema não encontrado.");
      arquivo = t.pdf;
      subdir = "materiais";
      nomeExibicao = "tema " + t.numero + " - modelos.pdf";
    } else {
      return erro(res, 400, "Informe a aula ou o material desejado.");
    }

    const caminho = caminhoSeguro(subdir, arquivo);
    if (!caminho || !fs.existsSync(caminho)) {
      return erro(res, 404, "Arquivo não encontrado. Ainda não foi enviado para a plataforma.");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="' + nomeExibicao + '"');
    res.setHeader("Cache-Control", "private, no-store");
    const stream = fs.createReadStream(caminho);
    stream.on("error", function (e) {
      console.error("material:", e);
      if (!res.headersSent) erro(res, 500, "Erro ao ler o arquivo.");
    });
    stream.pipe(res);
  } catch (e) {
    console.error("material:", e);
    if (!res.headersSent) erro(res, 500, "Erro ao acessar o material.");
  }
};