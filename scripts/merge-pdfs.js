/**
 * Junta os PDFs dos 10 temas em um único arquivo:
 *   api/_arquivos/materiais/temas-modelos.pdf
 *
 * Uso (uma vez): node scripts/merge-pdfs.js
 * Precisa do pacote pdf-lib (desenvolvimento): npm install pdf-lib --no-save
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const ORIGENS = ["tema1.pdf", "tema2.pdf", "tema3.pdf", "tema4.pdf", "tema5.pdf", "tema6.pdf", "tema7.pdf", "tema8.pdf", "tema9.pdf", "tema10.pdf"];
const DESTINO = path.join(__dirname, "..", "api", "_arquivos", "materiais", "temas-modelos.pdf");

async function main() {
  const raiz = path.join(__dirname, "..");
  const final = await PDFDocument.create();

  for (const nome of ORIGENS) {
    const caminho = path.join(raiz, nome);
    if (!fs.existsSync(caminho)) {
      console.warn("Aviso: arquivo não encontrado, pulando:", nome);
      continue;
    }
    const buf = fs.readFileSync(caminho);
    const doc = await PDFDocument.load(buf);
    const paginas = await final.copyPages(doc, doc.getPageIndices());
    paginas.forEach((p) => final.addPage(p));
    console.log("Adicionado:", nome, "(" + doc.getPageCount() + " páginas)");
  }

  const bytes = await final.save();
  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.writeFileSync(DESTINO, bytes);
  console.log("");
  console.log("Gerado:", DESTINO, "(" + Math.round(bytes.length / 1024) + " KB)");
}

main().catch((e) => {
  console.error("Erro ao mesclar PDFs:", e);
  process.exit(1);
});