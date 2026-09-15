/**
 * AULAS — Configuração das aulas do curso.
 * Use VERCEL/LOGIN para editar títulos, resumos, vídeos (YouTube) e PDFs.
 *
 * - videoId: ID do vídeo do YouTube (ex: "dQw4w9WgXcQ"). O vídeo é embutido.
 * - pdf: nome do arquivo dentro de api/_arquivos/aulas/ (é protegido por login).
 *        Para "breve", use pdf: null.
 */
(function (root, factory) {
  var CONFIG = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
  if (typeof window !== "undefined") window.AULAS_CONFIG = CONFIG;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    materialExclusivo: {
      titulo: "10 temas de redação com modelo nota mil pronto",
      resumo:
        "Material exclusivo do Plano Ultra: 10 temas selecionados com redações-modelo prontas para você usar como referência.",
      pdf: "temas-modelos.pdf", // arquivo em api/_arquivos/materiais/
    },

    /** Nível de plano mínimo para acessar cada aula (basico ou ultra). */
    planoMinimo: "basico",

    aulas: [
      {
        id: "aula1",
        numero: 1,
        titulo: "Aula 1 — Conceitos básicos: o mapa da nota máxima",
        area: "Fundamentos",
        resumo:
          "Redação no ENEM não é sorte — é técnica. Você entende o que a prova pede, o peso da redação na nota e os 5 pilares que estruturam um texto de topo.",
        assuntos: [
          "O que a prova pede",
          "O peso da redação na nota final",
          "As 5 competências (200 pontos cada)",
          "Roteiro dos 5 pilares do texto",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_1",
        pdf: "aula1.pdf",
      },
      {
        id: "aula2",
        numero: 2,
        titulo: "Aula 2 — A estrutura básica da redação",
        area: "Estrutura",
        resumo:
          "Quatro parágrafos, quatro funções: a espinha dorsal da dissertação. Introdução, dois desenvolvimentos e conclusão com o template completo.",
        assuntos: [
          "Os 4 parágrafos da redação",
          "Introdução — as 4 frases",
          "Desenvolvimento — a fórmula",
          "Conclusão — os 3 movimentos",
          "Template pronto da redação",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_2",
        pdf: "aula2.pdf",
      },
      {
        id: "aula3",
        numero: 3,
        titulo: "Aula 3 — A introdução nota 1000",
        area: "Introdução",
        resumo:
          "Aprendiza o parágrafo de abertura que impressiona o corretor: frase introdutória com repertório, relação com o tema, causadores e finalização.",
        assuntos: [
          "Nunca comece falando do tema",
          "Frase introdutória com repertório",
          "Relacionar com o tema",
          "Apontar os 2 causadores",
          "Frase de finalização",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_3",
        pdf: "aula3.pdf",
      },
      {
        id: "aula4",
        numero: 4,
        titulo: "Aula 4 — O desenvolvimento da redação",
        area: "Desenvolvimento",
        resumo:
          "Do tópico frasal à opinião cidadã: o parágrafo que carrega seu repertório e sua Competência 3 para nota máxima.",
        assuntos: [
          "Tópico frasal",
          "Repertório sociocultural",
          "Causa e consequência",
          "Opinião cidadã",
          "Conectivos que caíram em desuso",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_4",
        pdf: "aula4.pdf",
      },
      {
        id: "aula5",
        numero: 5,
        titulo: "Aula 5 — A conclusão da redação",
        area: "Conclusão",
        resumo:
          "O fechamento que coroa o texto: reforçar medidas, aplicar a fórmula da intervenção completa e retornar à citação da introdução.",
        assuntos: [
          "Reforçar a tomada de medidas",
          "O que será feito",
          "Fórmula da intervenção",
          "Frase de finalização",
          "Ciclo completo do texto",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_5",
        pdf: "aula5.pdf",
      },
      {
        id: "aula6",
        numero: 6,
        titulo: "Aula 6 — Fazendo redação do zero",
        area: "Prática",
        resumo:
          "A aplicação de tudo: redigimos uma redação completa do zero, do tema à intervenção, mostrando na prática cada etapa do método.",
        assuntos: [
          "Do tema ao repertório",
          "Escrevendo a introdução",
          "Construindo os desenvolvimentos",
          "Fechando com a intervenção",
          "Revisão final nota máxima",
        ],
        videoId: "TROQUE_AQUI_ID_DO_VIDEO_6",
        pdf: null, // PDF da Aula 6 (breve) — adicione em api/_arquivos/aulas/aula6.pdf
      },
    ],

    /** Aula pelo id. */
    aulaPorId: function (id) {
      for (var i = 0; i < this.aulas.length; i++) {
        if (this.aulas[i].id === id) return this.aulas[i];
      }
      return null;
    },
  };
});