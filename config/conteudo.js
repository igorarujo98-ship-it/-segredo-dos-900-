/**
 * CONTEUDO — Textos e infográficos da página inicial.
 * Tudo aqui é editável sem tocar no resto do código.
 *
 * IMPORTANTE: os números do infográfico ("20%", "1 de 5 áreas") são valores
 * ilustrativos baseados na estrutura atual do ENEM. Se a metodologia mudar,
 * edite os valores abaixo — nada é "fixo" no código.
 */
(function (root, factory) {
  var CONFIG = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
  if (typeof window !== "undefined") window.CONTEUDO_CONFIG = CONFIG;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    curso: {
      nome: "O Segredo dos 900+",
      subtitulo: "Curso de Redação para o ENEM",
      professor: "Professor Igor Araujo da Rocha",
    },

    hero: {
      chamada: "Redação no ENEM não é sorte — é técnica.",
      cta: "QUERO SER 900+",
      badge: "Aprovação em Medicina · Método comprovado",
    },

    redacaoImportancia: {
      titulo: "Por que a redação é tão importante no ENEM?",
      textos: [
        "A redação do ENEM é uma das partes mais estratégicas da prova, pois pode representar uma grande diferença na nota final e, consequentemente, na classificação para o curso desejado.",
        "Para quem busca cursos concorridos, como Medicina, uma redação acima de 900 pontos pode ser decisiva: enquanto muitos candidatos concentram seus esforços apenas nas questões objetivas, dominar a estrutura dissertativo-argumentativa permite aumentar a pontuação de forma mais previsível.",
        "Além disso, a redação é uma prova em que o estudante consegue desenvolver uma estratégia de preparação: aprender a interpretar o tema, construir uma tese, utilizar repertórios produtivos, desenvolver argumentos e elaborar uma proposta de intervenção completa.",
      ],
    },

    infografico: {
      rotulo: "Peso da redação no ENEM",
      destaque: "1 de 5 áreas do conhecimento",
      // Editável: valor percentual ilustrativo (baseado na estrutura atual do ENEM).
      redacaoPorcentagem: 20,
      areas: [
        { nome: "Redação", ativa: true },
        { nome: "Linguagens", ativa: false },
        { nome: "Ciências Humanas", ativa: false },
        { nome: "Ciências da Natureza", ativa: false },
        { nome: "Matemática", ativa: false },
      ],
      legenda: "",
      notaMaxima: "nota máxima 1000",
      passo1: "Maior peso individual da prova",
      passo2: "Previsível para quem treina",
    },

    comoFunciona: {
      titulo: "Como funciona?",
      passos: [
        {
          n: "01",
          titulo: "Você se cadastra",
          texto:
            "Informa nome, CPF, e-mail e WhatsApp e escolhe o plano (Básico ou Ultra).",
        },
        {
          n: "02",
          titulo: "Paga pelo Mercado Pago",
          texto:
            "É direcionado ao checkout seguro do Mercado Pago — em até 6x.",
        },
        {
          n: "03",
          titulo: "Recebe seu código na tela",
          texto:
            "Assim que o pagamento for confirmado, seu código de acesso aparece na tela. Salve esse código: é com ele que você entra e ele não pode ser perdido.",
        },
        {
          n: "04",
          titulo: "Estuda onde quiser",
          texto:
            "Acessa as aulas, vídeos e materiais em PDF por 1 ano, em qualquer dispositivo.",
        },
      ],
    },

    contato: {
      titulo: "Ainda ficou com alguma dúvida?",
      whatsappExibicao: "(99) 98266-1111",
      // Número completo para o link do WhatsApp (DDI 55 + DDD + número).
      whatsapp: "5599982661111",
    },

    rodape: {
      nome: "O Segredo dos 900+",
      subtitulo: "Curso de Redação para o ENEM",
      whatsappExibicao: "(99) 98266-1111",
    },
  };
});