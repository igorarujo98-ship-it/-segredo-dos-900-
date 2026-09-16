/**
 * POST /api/admin/excluir-aluno
 * Exclui um aluno e TODOS os registros relacionados (código, sessões,
 * vínculos de pagamento e de webhook). Ação permanente.
 *
 * Requer o header x-admin-key com o valor de ADMIN_KEY (variável de ambiente).
 * Body: { id: string } ou { email: string }
 */
const { lerJson, ok, erro } = require("../_lib/http.js");
const alunos = require("../_lib/alunos.js");

module.exports = async function handler(req, res) {
  try {
    const chave = req.headers["x-admin-key"] || "";
    if (!process.env.ADMIN_KEY || chave !== process.env.ADMIN_KEY) {
      return erro(res, 401, "Não autorizado. Verifique a chave de administrador.");
    }

    const dados = await lerJson(req);
    const id = String(dados.id || "").trim();
    const email = String(dados.email || "").trim();

    let aluno = null;
    if (id) aluno = await alunos.buscarAluno(id);
    else if (email) aluno = await alunos.buscarPorEmail(email);

    if (!aluno) return erro(res, 404, "Aluno não encontrado.");

    const removidos = await alunos.excluirAluno(aluno.id);
    ok(res, {
      removido: true,
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      removidos: removidos,
    });
  } catch (e) {
    console.error("admin/excluir-aluno:", e);
    erro(res, 500, "Erro ao excluir o aluno.");
  }
};
