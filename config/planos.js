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
    parcelas: 6, // máximo de parcelas exibido (até 6x)

    basicas: {
      id: "basico",
      nome: "Plano Básico",
      preco: 24.99, // parcela exibida no site (6x)
      // Valor cobrado à vista (base do checkout). O MP soma juros no parcelado;
      // este valor foi calibrado para o 6x sair ~R$ 24,99 (financiado = R$ 149,94).
      precoTotal: 131.15,
      parcelas: 6,
      urlPagamento: "https://mpago.li/2svJUT5", // link Mercado Pago (fallback)
    },

    ultra: {
      id: "ultra",
      nome: "Plano Ultra",
      preco: 33.99, // parcela exibida no site (6x)
      precoTotal: 178.38, // 6x ~R$ 33,99 (financiado = R$ 203,94)
      parcelas: 6,
      urlPagamento: "https://mpago.li/1bTigpL", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // acesso ao "10 temas com modelo nota mil"
    },

    // Pagamento de UPGRADE: do Plano Básico para o Plano Ultra.
    upgrade: {
      id: "upgrade",
      nome: "Upgrade para o Plano Ultra",
      planoDestino: "ultra", // plano liberado após o pagamento
      preco: 13.99, // parcela exibida no site (6x)
      precoTotal: 73.42, // 6x ~R$ 13,99 (financiado = R$ 83,94)
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