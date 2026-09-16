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
      preco: 24.99, // valor de cada parcela (R$)
      precoTotal: 149.94, // valor total: 6x de R$ 24,99
      parcelas: 6,
      urlPagamento: "https://mpago.li/2svJUT5", // link Mercado Pago (fallback)
    },

    ultra: {
      id: "ultra",
      nome: "Plano Ultra",
      preco: 33.99,
      precoTotal: 203.94, // valor total: 6x de R$ 33,99
      parcelas: 6,
      urlPagamento: "https://mpago.li/1bTigpL", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // acesso ao "10 temas com modelo nota mil"
    },

    // Pagamento de UPGRADE: do Plano Básico para o Plano Ultra.
    // Diferença: R$ 203,94 - R$ 149,94 = R$ 83,94 (6x de R$ 13,99).
    upgrade: {
      id: "upgrade",
      nome: "Upgrade para o Plano Ultra",
      planoDestino: "ultra", // plano liberado após o pagamento
      preco: 13.99, // valor de cada parcela (R$)
      precoTotal: 83.94, // valor total: 6x de R$ 13,99
      parcelas: 6,
    },

    /** Lista de planos na ordem de exibição (não inclui o upgrade). */
    lista: function () {
      return [this.basicas, this.ultra];
    },

    /** Retorna um plano pelo id (basico | ultra | upgrade). */
    porId: function (id) {
      var plans = this.lista().concat([this.upgrade]);
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].id === id) return plans[i];
      }
      return null;
    },
  };
});