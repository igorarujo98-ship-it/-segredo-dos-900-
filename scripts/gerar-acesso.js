/**
 * Gera um código de acesso de teste LOCALMENTE, sem precisar de servidor
 * nem do painel da Vercel. O aluno é salvo no armazenamento local
 * (.storage-local.json) e já pode entrar em login.html via `vercel dev`.
 *
 * Uso:
 *   node scripts/gerar-acesso.js "Nome Completo" email@exemplo.com [basico|ultra] [dias]
 *
 * Exemplos:
 *   node scripts/gerar-acesso.js "João Silva" joao@email.com
 *   node scripts/gerar-acesso.js "Maria" maria@email.com ultra 365
 */
const alunos = require("../api/_lib/alunos.js");

async function main() {
  const args = process.argv.slice(2);
  const nome = args[0];
  const email = args[1];
  const plano = String(args[2] || "basico").toLowerCase() === "ultra" ? "ultra" : "basico";
  const diasValidade = parseInt(args[3], 10) || 365;

  if (!nome || !email) {
    console.log(
      "Uso: node scripts/gerar-acesso.js \"Nome Completo\" email@exemplo.com [basico|ultra] [dias]"
    );
    process.exit(1);
  }

  const emailLimpo = String(email).trim().toLowerCase();
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!EMAIL_RE.test(emailLimpo)) {
    console.error("E-mail inválido:", email);
    process.exit(1);
  }

  const aluno = await alunos.criarAlunoLiberado({
    nome: String(nome).trim(),
    cpf: "",
    email: emailLimpo,
    whatsapp: "",
    plano: plano,
    diasValidade: diasValidade,
  });

  console.log("");
  console.log("==============================================");
  console.log(" ACESSO GERADO!");
  console.log("----------------------------------------------");
  console.log(" Nome      : " + aluno.nome);
  console.log(" E-mail    : " + aluno.email);
  console.log(" Plano     : " + (plano === "ultra" ? "Plano Ultra" : "Plano Básico"));
  console.log(" Código    : " + aluno.token);
  console.log(" Válido até: " + new Date(aluno.expira_em).toLocaleDateString("pt-BR"));
  console.log("");
  console.log(" Entre em login.html com e-mail + código acima.");
  console.log(" (Para o login funcionar, rode: npm run dev)");
  console.log("==============================================");
  console.log("");
}

main().catch(function (e) {
  console.error("Erro ao gerar acesso:", e);
  process.exit(1);
});