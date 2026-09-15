/**
 * Envio de e-mail via Resend (compatível com Vercel).
 * O token SÓ é enviado depois da confirmação do Mercado Pago (a partir do webhook).
 */
const RESEND_API_URL = "https://api.resend.com/emails";

/** Formata ISO para dd/mm/aaaa. */
function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = function (n) {
    return String(n).padStart(2, "0");
  };
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}

function escapa(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Template de e-mail profissional e responsivo. */
function html({ nome, planoNome, codigo, expiraEm, botaoUrl }) {
  const plano = escapa(planoNome);
  const nomeU = escapa(nome);
  const codigoU = escapa(codigo);
  const expira = formatarData(expiraEm);
  const urlCurso = escapa(botaoUrl);

  return [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Seu acesso foi liberado!</title>",
    '<style>',
    "body{margin:0;padding:0;background:#0b1430;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}",
    ".wrap{max-width:600px;margin:0 auto;padding:24px 12px}",
    ".card{background:#101c45;border:1px solid rgba(74,150,255,.25);border-radius:18px;overflow:hidden}",
    ".top{background:linear-gradient(135deg,#1d4ed8 0%,#0ea5e9 100%);padding:28px 28px;text-align:center}",
    ".brand{font-size:22px;font-weight:800;color:#fff;letter-spacing:.3px}",
    ".brand span{color:#4ade80}",
    ".sub{color:#dbeafe;font-size:13px;margin-top:4px}",
    ".body{padding:26px 28px;color:#e2e8f0;font-size:15px;line-height:1.65}",
    ".body p{margin:0 0 14px}",
    ".tag{display:inline-block;font-size:12px;font-weight:700;color:#4ade80;border:1px solid rgba(74,222,128,.4);border-radius:999px;padding:5px 12px;margin-bottom:16px;background:rgba(74,222,128,.08)}",
    ".codigo{background:#0b1430;border:1px dashed #4ade80;border-radius:12px;padding:16px;font-size:22px;font-weight:800;letter-spacing:2px;color:#4ade80;text-align:center;margin:8px 0 16px;font-family:monospace,Consolas,Menlo,monospace}",
    ".linha{height:1px;background:rgba(148,163,184,.25);margin:18px 0}",
    ".meta{font-size:13px;color:#94a3b8;margin:6px 0}",
    ".meta b{color:#cbd5e1;font-weight:600}",
    ".btn{display:block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#ffffff;text-decoration:none;text-align:center;font-weight:800;font-size:15px;padding:15px 20px;border-radius:12px;margin:22px 0 6px}",
    ".foot{text-align:center;color:#64748b;font-size:12px;padding:16px 18px}",
    '</style></head>',
    "<body><div class=\"wrap\"><div class=\"card\">",
    '<div class="top"><div class="brand">O SEGREDO DOS <span>900+</span></div><div class="sub">Curso de Redação para o ENEM</div></div>',
    '<div class="body">',
    "<p>Olá, <strong>" + nomeU + "</strong>!</p>",
    "<p>Seu pagamento foi confirmado com sucesso.</p>",
    '<p>Seu acesso ao <strong>O Segredo dos 900+ — Curso de Redação para o ENEM</strong> já está disponível.</p>',
    '<span class="tag">Plano: ' + plano + "</span>",
    "<p>Seu código de acesso:</p>",
    '<div class="codigo">' + codigoU + "</div>",
    '<div class="linha"></div>',
    '<p class="meta">Acesso válido até: <b>' + expira + "</b></p>",
    '<p class="meta">Use seu e-mail + código de acesso para entrar na área do aluno.</p>',
    '<a class="btn" href="' + urlCurso + '">ACESSAR MEU CURSO</a>',
    "<p>Bons estudos!</p>",
    "</div>",
    '<div class="foot">Este é um e-mail automático do curso O Segredo dos 900+. Não compartilhe seu código: ele é individual e intransferível.</div>',
    "</div></div></body></html>",
  ].join("");
}

/**
 * Envia o e-mail de liberação de acesso com o token.
 * model: { nome, planoNome, codigo, expiraEm }
 * Retorna { ok: true, id } em caso de sucesso.
 */
async function enviarToken(model) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "O Segredo dos 900+ <onboarding@resend.dev>";
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from,
      to: [model.email],
      subject: "Seu acesso ao curso O Segredo dos 900+ foi liberado!",
      html: html({
        nome: model.nome,
        planoNome: model.planoNome,
        codigo: model.codigo,
        expiraEm: model.expiraEm,
        botaoUrl: appUrl + "/aluno.html",
      }),
    }),
  });

  if (!res.ok) {
    const texto = await res.text().catch(function () {
      return "";
    });
    throw new Error("Erro no envio do e-mail: " + res.status + " " + texto.slice(0, 300));
  }

  return res.json();
}

module.exports = { enviarToken };