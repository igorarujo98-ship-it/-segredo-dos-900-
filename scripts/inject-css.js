/**
 * scripts/inject-css.js — Embuti o styles.css dentro do HTML e versiona os scripts.
 *
 * Por que existe:
 *   Navegadores internos de mensageiros (WhatsApp / WhatsApp Business, Instagram,
 *   Facebook) e alguns WebViews "perdem" o stylesheet externo depois de navegar
 *   PARA FORA da plataforma e voltar (ex.: ida e volta pelo checkout do Mercado
 *   Pago), deixando o site em fundo branco, sem formatação.
 *
 *   Este script troca <link rel="stylesheet" href="styles.css" /> por um bloco
 *   <style> inline com o conteúdo atual do styles.css — o visual passa a não
 *   depender de um segundo download de rede. Também adiciona ?v=<hash> nos
 *   <script> para evitar JS em cache velho.
 *
 * Como usar (sempre antes de publicar, depois de mudar o styles.css):
 *   node scripts/inject-css.js
 *
 * Idempotente: pode rodar quantas vezes quiser.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.resolve(__dirname, "..");
const CSS_PATH = path.join(RAIZ, "styles.css");

const LINK_RE = /<link\s+rel="stylesheet"\s+href="styles\.css"\s*\/?>/gi;
const INLINE_RE = /<style\s+data-inlined-css[\s\S]*?<\/style>\s*/gi;

function hashArquivo(caminho) {
  const conteudo = fs.readFileSync(caminho, "utf8");
  return crypto.createHash("sha1").update(conteudo).digest("hex").slice(0, 8);
}

function versaoScript(html, nomeArquivo, hash) {
  // Troca src="config/planos.js" -> src="config/planos.js?v=<hash>"
  // e src="config/planos.js?v=antigo" -> src="config/planos.js?v=<hash>"
  const base = nomeArquivo.replace(/\./g, "\\.");
  const re = new RegExp(
    '(src="' + base + ')(\\?v=[a-f0-9]{8})?(")',
    "g"
  );
  return html.replace(re, "$1?v=" + hash + "$3");
}

function processar() {
  if (!fs.existsSync(CSS_PATH)) {
    console.error("styles.css não encontrado em:", CSS_PATH);
    process.exit(1);
  }

  const css = fs.readFileSync(CSS_PATH, "utf8").trim();
  const arquivos = fs
    .readdirSync(RAIZ)
    .filter((f) => f.toLowerCase().endsWith(".html"));

  const hashes = {
    "config/planos.js": hashArquivo(path.join(RAIZ, "config/planos.js")),
    "config/aulas.js": hashArquivo(path.join(RAIZ, "config/aulas.js")),
    "config/conteudo.js": hashArquivo(path.join(RAIZ, "config/conteudo.js")),
    "script.js": hashArquivo(path.join(RAIZ, "script.js")),
  };

  let alterados = 0;

  for (const nome of arquivos) {
    const caminho = path.join(RAIZ, nome);
    let html = fs.readFileSync(caminho, "utf8");

    // Normaliza quebras de linha para manter o padrão do arquivo.
    const eol = /\r\n/.test(html) ? "\r\n" : "\n";
    const original = html;
    html = html.replace(/\r\n/g, "\n");

    let marcado = false;
    let htmlNovo = html;

    if (LINK_RE.test(html)) {
      htmlNovo = htmlNovo.replace(INLINE_RE, "");
      htmlNovo = htmlNovo.replace(
        LINK_RE,
        "<style data-inlined-css>\n" + css + "\n</style>"
      );
      marcado = true;
    } else if (INLINE_RE.test(html)) {
      // Já está inline: atualiza o conteúdo caso o styles.css tenha mudado.
      htmlNovo = htmlNovo.replace(INLINE_RE, "<style data-inlined-css>\n" + css + "\n</style>");
      marcado = true;
    }

    for (const arq of Object.keys(hashes)) {
      htmlNovo = versaoScript(htmlNovo, arq, hashes[arq]);
    }

    const saida = htmlNovo.replace(/\n/g, eol);
    if (saida !== original) {
      fs.writeFileSync(caminho, saida);
      alterados++;
      console.log("atualizado:", nome + (marcado ? " (CSS inline + scripts versionados)" : " (scripts versionados)"));
    } else {
      console.log("sem mudanças:", nome);
    }
  }

  console.log("\nPronto. " + alterados + " arquivo(s) alterado(s).");
}

processar();