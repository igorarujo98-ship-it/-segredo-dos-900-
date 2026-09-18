/**
 * POST /api/admin/gerar-acesso
 * Gera um acesso MANUAL (sem pagamento) — ex.: presentear um amigo.
 * Requer o header x-admin-key com o valor de ADMIN_KEY (variável de ambiente).
 *
 * Body: {
 *   nome: string,
 *   email: string,
 *   whatsapp?: string,
 *   cpf?: string,
 *   plano?: "basico" | "ultra",
 *   diasValidade?: number (padrão 365),
 *   enviarEmail?: boolean (padrão true)
 * }
 */
const { lerJson, ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");
const mailer = require("../_lib/mailer.js");
const PLANOS = require("../../config/planos.js");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-admin-key"] || "";
    if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
      return erro(res, 401, "Não autorizado. Verifique a chave de administrador.");
    }

    const dados = await lerJson(req);
    const nome = String(dados.nome || "").trim();
    const email = String(dados.email || "").trim().toLowerCase();
    const whatsapp = String(dados.whatsapp || "").trim();
    const cpf = String(dados.cpf || "").trim();
    const planoId = String(dados.plano || "basico").trim();
    const diasValidade = parseInt(dados.diasValidade, 10) || 365;
    const enviarEmail = dados.enviarEmail !== false;

    if (nome.length < 2) return erro(res, 400, "Informe o nome do amigo.");
    if (!EMAIL_RE.test(email)) return erro(res, 400, "Informe um e-mail válido.");

    const plano = PLANOS.porId(planoId);
    if (!plano || plano.id === "1real") return erro(res, 400, "Plano inválido (use basico ou ultra).");
    if (diasValidade < 1 || diasValidade > 3660) {
      return erro(res, 400, "Validade inválida (min 1 dia, máx 10 anos).");
    }

    const aluno = await alunos.criarAlunoLiberado({
      nome,
      cpf,
      email,
      whatsapp,
      plano: plano.id,
      diasValidade,
    });

    let emailEnviado = false;
    let emailErro = null;
    if (enviarEmail) {
      try {
        await mailer.enviarToken({
          email: aluno.email,
          nome: aluno.nome,
          planoNome: plano.nome,
          codigo: aluno.token,
          expiraEm: aluno.expira_em,
        });
        emailEnviado = true;
      } catch (eEmail) {
        // E-mail não enviado (ex.: RESEND_API_KEY ausente) — o código continua
        // sendo gerado e exibido na tela para copiar e enviar manualmente.
        console.error("gerar-acesso: falha no e-mail:", eEmail);
        emailErro = "O e-mail não foi enviado. Copie o código acima e envie manualmente.";
      }
      aluno.email_enviado = emailEnviado;
      await alunos.salvarAluno(aluno);
    }

    ok(res, {
      alunoId: aluno.id,
      token: aluno.token,
      plano: plano.id,
      liberadoEm: aluno.liberado_em,
      expiraEm: aluno.expira_em,
      emailEnviado: emailEnviado,
      emailErro: emailErro,
    });
  } catch (e) {
    console.error("gerar-acesso:", e);
    erro(res, 500, "Erro ao gerar o acesso. Lembre-se de configurar a variável ADMIN_KEY na Vercel.");
  }
};