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
      // Valor base (1x / PIX). Calibrado para o 6x sair ~R$ 24,99 com os juros
      // que o Mercado Pago aplica no parcelado (1x = R$ 131,15).
      precoTotal: 131.15,
      parcelas: 6,
      urlPagamento: "https://mpago.li/2svJUT5", // link Mercado Pago (fallback)
    },

    ultra: {
      id: "ultra",
      nome: "Plano Ultra",
      preco: 33.99, // parcela exibida no site (6x)
      precoTotal: 178.38, // 1x / PIX (6x ~R$ 33,99 com os juros do MP)
      parcelas: 6,
      urlPagamento: "https://mpago.li/1bTigpL", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // acesso ao "10 temas com modelo nota mil"
    },

    // Plano de captação por R$ 1. Fica oculto e bloqueado quando desativado.
    // A ativação/desativação é feita pelo administrador no painel (tempo real,
    // sem precisar publicar código) — o estado fica no armazenamento KV.
    // NÃO remover este bloco do arquivo: ele é o "cartão" que o painel liga/desliga.
    plano1real: {
      id: "1real",
      nome: "Plano R$ 1",
      preco: 1.0, // valor único (à vista)
      precoTotal: 1.0, // 1x / PIX
      parcelas: 1,
      urlPagamento: "https://mpago.li/1pvtrRC", // link Mercado Pago (fallback)
      incluimaterialExclusivo: true, // mesmo benefício do Ultra
    },

    // Pagamento de UPGRADE: do Plano Básico para o Plano Ultra.
    upgrade: {
      id: "upgrade",
      nome: "Upgrade para o Plano Ultra",
      planoDestino: "ultra", // plano liberado após o pagamento
      preco: 13.99, // parcela exibida no site (6x)
      precoTotal: 73.42, // 1x / PIX (6x ~R$ 13,99 com os juros do MP)
      parcelas: 6,
    },

    /** Lista de planos na ordem de exibição (não inclui o upgrade). */
    lista: function () {
      return [this.basicas, this.ultra];
    },

    /** Retorna um plano pelo id (basico | ultra | 1real | upgrade). */
    porId: function (id) {
      var plans = this.lista().concat([this.upgrade, this.plano1real]);
      for (var i = 0; i < plans.length; i++) {
        if (plans[i].id === id) return plans[i];
      }
      return null;
    },
  };
});