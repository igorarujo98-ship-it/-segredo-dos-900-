/**
 * PLANOS — Configuração de planos e pagamento.
 * Fonte única de verdade usada pelo site E pelas funções serverless.
 * Para alterar preços, parcelas ou links do Mercado Pago, edite somente aqui.
 */
(function (root, factory) {
  var CONFIG = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = CONFIG;
  if (typeof window !== "undefined") window.PLANOS_CONFIG = CONFIG;
})(typeof self !== "undefined" ? self : this, function () {
  return {
    parcelas: 6, // máximo de parcelas exibido (até 6x sem juros)

    basicas: {
      id: "basico",
      nome: "Plano Básico",
      preco: 24.99, // valor exibido (R$)
      parcelas: 6,
      urlPagamento: "https://mpago.li/2svJUT5", // link Mercado Pago (fallback)
    },

    ultra: {
      id: "ultra",
      nome: "Plano Ultra",
      preco: 33.99,
      parcelas: 6,
      urlPagamento: "https://mpago.li/1bTigpL", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // acesso ao "10 temas com modelo nota mil"
    },

    // Plano TEMPORÁRIO de teste: R$ 1 para validar o fluxo de pagamento.
    // Remova esta entrada (e da lista abaixo) quando for divulgar o site.
    teste: {
      id: "teste",
      nome: "Plano Ultra — Teste R$ 1",
      preco: 1.0,
      parcelas: 1,
      urlPagamento: "https://mpago.li/1pvtrRC", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // opção "ultra"
    },

    /** Lista de planos na ordem de exibição. */
    lista: function () {
      return [this.basicas, this.ultra, this.teste];
    },

    /** Retorna um plano pelo id (basico | ultra). */
    porId: function (id) {
      var plans = this.lista();
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].id === id) return plans[i];
      }
      return null;
    },
  };
});