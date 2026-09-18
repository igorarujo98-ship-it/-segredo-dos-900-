/* ============================================================
   O SEGREDO DOS 900+ — script principal (página comercial, e páginas
   de cadastro, login, área do aluno e sucesso).
   ============================================================ */

(function () {
  "use strict";

  var PLANOS = window.PLANOS_CONFIG || {};
  var AULAS = window.AULAS_CONFIG || {};
  var CONTEUDO = window.CONTEUDO_CONFIG || {};

  var SESSAO_KEY = "sessao900";
  var ALUNO_KEY = "alunoId900";

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function fmtBRL(valor) {
    return "R$ " + Number(valor).toFixed(2).replace(".", ",");
  }

  function fmtData(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  async function api(url, opts) {
    var opt = Object.assign(
      { headers: { "Content-Type": "application/json" } },
      opts || {}
    );
    var res = await fetch(url, opt);
    var dados = {};
    try {
      dados = await res.json();
    } catch (_e) {}
    return { ok: res.ok, status: res.status, dados: dados };
  }

  function mostrarAlerta(txt, tipo) {
    var el = $("#js-alerta");
    if (!el) return;
    el.textContent = txt;
    el.className = "alerta " + (tipo === "ok" ? "alerta--ok" : "alerta--erro") + " visivel";
  }

  function esconderAlerta() {
    var el = $("#js-alerta");
    if (el) el.className = "alerta";
  }

  function addErro(campo) {
    var pai = campo.closest(".campo");
    if (pai) pai.classList.add("erro");
  }
  function limparErros() {
    $qsa(".campo.erro").forEach(function (c) {
      c.classList.remove("erro");
    });
  }

  /* ---------------- Validações ---------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validaEmail(email) {
    return EMAIL_RE.test(String(email || "").trim());
  }
  function validaCpf(cpf) {
    return String(cpf || "").replace(/\D/g, "").length === 11;
  }
  function validaWhatsapp(wa) {
    var n = String(wa || "").replace(/\D/g, "");
    return n.length >= 10 && n.length <= 13;
  }

  /* ============================================================
     INICIALIZAÇÃO GERAL
     ============================================================ */
  function initGeral() {
    // Ano no rodapé
    $qsa("#ano").forEach(function (e) {
      e.textContent = new Date().getFullYear();
    });

    // Menu mobile
    var burger = $("#burger");
    var nav = $("#nav-links");
    if (burger && nav) {
      burger.addEventListener("click", function () {
        nav.classList.toggle("aberto");
      });
      $qsa("a", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          nav.classList.remove("aberto");
        });
      });
    }

    // Animações de scroll (disparadas no fim do carregamento)
    // A observação real está em observarAnimacao(), chamada após os renders.

    // FAQ (acordeão)
    $qsa(".faq-item").forEach(function (item) {
      var pergunta = $(".faq-pergunta", item);
      if (pergunta) {
        pergunta.addEventListener("click", function () {
          item.classList.toggle("aberto");
        });
      }
    });

    // Diálogo legal do rodapé
    var dialog = $("#js-legal-dialog");
    if (dialog) {
      var LEGAL = {
        termos:
          "<h3>Termos de Uso</h3><p>Ao contratar o curso, você declara que as informações fornecidas no cadastro são verdadeiras. O acesso é pessoal e intransferível, com validade de 1 ano a partir da confirmação da compra.</p>",
        privacidade:
          "<h3>Política de Privacidade</h3><p>Seus dados (nome, CPF, e-mail e WhatsApp) são utilizados apenas para gerenciar sua matrícula, enviar o código de acesso e prestar suporte. Eles não são vendidos ou compartilhados com terceiros, exceto o processamento de pagamento pelo Mercado Pago.</p>",
        direitos:
          "<h3>Direitos Autorais</h3><p>Todo o conteúdo (vídeos, PDFs, aulas e materiais) é protegido por direitos autorais. É proibido compartilhar, revender, copiar, gravar, reproduzir ou distribuir sem autorização.</p>",
      };
      $qsa("[data-legal]").forEach(function (link) {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          $("#js-legal-conteudo").innerHTML = LEGAL[link.getAttribute("data-legal")] || "";
          dialog.showModal();
        });
      });
      $("#js-legal-fechar").addEventListener("click", function () {
        dialog.close();
      });
      dialog.addEventListener("click", function (e) {
        if (e.target === dialog) dialog.close();
      });
    }

    // Configura WhatsApp no rodapé/contato
    var wa = CONTEUDO.contato && CONTEUDO.contato.whatsapp;
    if (wa) {
      var linkWa = $("#js-whatsapp");
      if (linkWa) linkWa.href = "https://wa.me/" + wa;
    }
  }

  /* ============================================================
     ANIMAÇÃO DE SCROLL — elementos surgem ao rolar
     ============================================================ */
  var obsAnimacao = null;

  function observarAnimacao() {
    var alvos = $qsa(".reveal:not(.visivel), .entrada:not(.visivel)");
    if (!alvos.length) return;

    if (!("IntersectionObserver" in window)) {
      alvos.forEach(function (el) {
        el.classList.add("visivel");
      });
      return;
    }

    if (!obsAnimacao) {
      obsAnimacao = new IntersectionObserver(
        function (entradas) {
          entradas.forEach(function (ent) {
            if (ent.isIntersecting) {
              ent.target.classList.add("visivel");
              obsAnimacao.unobserve(ent.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
    }

    alvos.forEach(function (el) {
      obsAnimacao.observe(el);
    });
  }

  /* ============================================================
     PÁGINA INICIAL — renderização dos blocos dinâmicos
     ============================================================ */
  function renderInfografico() {
    var alvo = $("#js-infografico");
    if (!alvo || !CONTEUDO.infografico) return;
    var info = CONTEUDO.infografico;

    var html =
      '<div class="rotulo">' + escapeHtml(info.rotulo) + "</div>" +
      '<div class="destaque">' + escapeHtml(info.destaque) + "</div>";

    (info.areas || []).forEach(function (area) {
      if (area.ativa) {
        html +=
          '<div class="barra-area ativa">' +
          '<div class="area-destaque">' +
          '<span class="area-nome">' + escapeHtml(area.nome) + "</span>" +
          '<span class="percent">' + (info.redacaoPorcentagem || 20) + "%</span>" +
          "</div>" +
          '<div class="pit"><i></i></div>' +
          "</div>";
      } else {
        html +=
          '<div class="barra-area">' +
          "<div>" + escapeHtml(area.nome) + "</div>" +
          '<div class="pit"><i></i></div>' +
          '<span class="percent">&nbsp;</span>' +
          "</div>";
      }
    });

    var passos = "";
    if (info.passo1) passos += '<div class="passo"><b>01</b>' + escapeHtml(info.passo1) + "</div>";
    if (info.passo2) passos += '<div class="passo"><b>02</b>' + escapeHtml(info.passo2) + "</div>";
    if (passos) html += '<div class="passos">' + passos + "</div>";

    if (info.legenda) html += '<p class="legenda">' + escapeHtml(info.legenda) + "</p>";

    alvo.innerHTML = html;
  }

  function escapeHtml(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderAulasPublicas() {
    var alvo = $("#js-aulas-grid");
    if (!alvo || !AULAS.aulas) return;

    alvo.innerHTML = AULAS.aulas
      .map(function (aula) {
        var assuntos = (aula.assuntos || [])
          .map(function (a) {
            return "<span>" + escapeHtml(a) + "</span>";
          })
          .join("");
        return (
          '<article class="aula-card entrada">' +
          '<div class="topo"><span class="num">AULA ' + aula.numero + "</span>" +
          '<span class="area">' + escapeHtml(aula.area) + "</span></div>" +
          "<h3>" + escapeHtml(aula.titulo) + "</h3>" +
          '<p class="descricao">' + escapeHtml(aula.resumo) + "</p>" +
          '<div class="assuntos">' + assuntos + "</div>" +
          '<span class="nota">Conteúdo liberado após a compra</span>' +
          "</article>"
        );
      })
      .join("");

    // Toque no celular: expandir
    $qsa(".aula-card", alvo).forEach(function (card) {
      card.addEventListener("click", function () {
        var jaAtivo = card.classList.contains("ativo");
        $qsa(".aula-card", alvo).forEach(function (c) {
          c.classList.remove("ativo");
        });
        if (!jaAtivo) card.classList.add("ativo");
      });
    });
  }

  function renderPlanos() {
    var alvo = $("#js-planos");
    if (!alvo || !PLANOS.lista) return;

    alvo.innerHTML = PLANOS.lista()
      .map(cardPlano)
      .join("");

    // Plano R$ 1: só aparece quando o admin o ativa (consulta em tempo real).
    if (PLANOS.plano1real) {
      api("/api/plano1real")
        .then(function (r) {
          if (r && r.ok && r.dados && r.dados.ativo) {
            alvo.insertAdjacentHTML("beforeend", cardPlano(PLANOS.plano1real));
          }
        })
        .catch(function () {});
    }
  }

  function cardPlano(plano) {
    var ultra = plano.id === "ultra";
    var avista = Number(plano.parcelas) === 1;
    var selo = ultra
      ? '<span class="plano-selo">Mais completo</span>'
      : "";
    var destaque = ultra ? " plano-card--ultra" : "";

    var itens = [
      { txt: "Aulas 1 a 6 do curso completo", tem: true },
      { txt: "Vídeos de todas as aulas", tem: true },
      { txt: "PDF de todos os materiais das aulas", tem: true },
      { txt: "Acesso por 1 ano", tem: true },
      {
        txt: "10 temas de redação com modelo nota mil pronto",
        tem: !!plano.incluimaterialExclusivo,
      },
    ];

    var lista = itens
      .map(function (it) {
        return (
          '<li class="' + (it.tem ? "" : "excluido") + '">' +
          escapeHtml(it.txt) +
          "</li>"
        );
      })
      .join("");

    var badgeForma = avista ? "À vista" : "Até " + plano.parcelas + "x";
    var textoForma = avista
      ? "Pague " + fmtBRL(plano.preco) + " à vista pelo Mercado Pago."
      : "Parcele em até " + plano.parcelas + "x pelo Mercado Pago.";
    var noteForma = avista
      ? "Pague à vista pelo Mercado Pago."
      : "Pague em até " + plano.parcelas + "x pelo Mercado Pago.";

    return (
      '<article class="plano-card' + destaque + ' entrada">' +
      selo +
      '<h3 class="plano-nome">' + escapeHtml(plano.nome) + "</h3>" +
      '<div class="plano-parcela">' + plano.parcelas + "x de " + fmtBRL(plano.preco) +
      "</div>" +
      '<div style="margin: 10px 0;"><span class="badge badge--verde">' + badgeForma + "</span></div>" +
      '<p class="plano-vezes">' + textoForma + "</p>" +
      '<ul class="plano-lista">' + lista + "</ul>" +
      '<a class="btn ' + (ultra ? "btn--primario" : "btn--azul") + ' btn--bloco" href="cadastro.html?plano=' +
      plano.id + '">ASSINAR ' + escapeHtml(plano.nome.toUpperCase()) + "</a>" +
      '<p class="plano-note">' + noteForma + "</p>" +
      "</article>"
    );
  }

  function renderComoFunciona() {
    var alvo = $("#js-como-funciona");
    if (!alvo || !CONTEUDO.comoFunciona) return;
    alvo.innerHTML = (CONTEUDO.comoFunciona.passos || [])
      .map(function (p) {
        return (
          '<div class="passo-card entrada">' +
          '<span class="n">' + escapeHtml(p.n) + "</span>" +
          "<h3>" + escapeHtml(p.titulo) + "</h3>" +
          "<p>" + escapeHtml(p.texto) + "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ============================================================
     PÁGINA DE CADASTRO
     ============================================================ */
  function initCadastro() {
    var form = $("#js-form-cadastro");
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var planoId = "basico";
    if (PLANOS.porId) {
      var planoParam = params.get("plano");
      if (PLANOS.porId(planoParam)) planoId = planoParam;
    }
    var plano = PLANOS.porId ? PLANOS.porId(planoId) : null;

    function preencherResumo(p) {
      var resumo = $("#js-resumo-plano");
      if (!resumo || !p) return;
      resumo.style.display = "flex";
      $("#js-plano-nome").textContent = p.nome;
      $("#js-plano-preco").textContent = p.parcelas + "x de " + fmtBRL(p.preco);
    }
    preencherResumo(plano);

    // Plano R$ 1: se o admin desativou, cai para o Básico (o servidor recusa).
    if (plano && plano.id === "1real") {
      api("/api/plano1real")
        .then(function (r) {
          if (!r || !r.ok || !r.dados || !r.dados.ativo) {
            planoId = "basico";
            preencherResumo(PLANOS.porId(planoId));
            mostrarAlerta("O Plano R$ 1 está desativado por enquanto. Exibindo o Plano Básico.", "erro");
          }
        })
        .catch(function () {
          planoId = "basico";
          preencherResumo(PLANOS.porId(planoId));
        });
    }

    // Máscaras leves
    var cpf = $("#campo-cpf");
    if (cpf) {
      cpf.addEventListener("input", function () {
        var dig = cpf.value.replace(/\D/g, "").slice(0, 11);
        var out = dig;
        if (dig.length > 9) out = dig.slice(0, 3) + "." + dig.slice(3, 6) + "." + dig.slice(6, 9) + "-" + dig.slice(9);
        else if (dig.length > 6) out = dig.slice(0, 3) + "." + dig.slice(3, 6) + "." + dig.slice(6);
        else if (dig.length > 3) out = dig.slice(0, 3) + "." + dig.slice(3);
        cpf.value = out;
      });
    }

    var wa = $("#campo-whatsapp");
    if (wa) {
      wa.addEventListener("input", function () {
        var dig = wa.value.replace(/\D/g, "").slice(0, 11);
        if (dig.length > 6) wa.value = "(" + dig.slice(0, 2) + ") " + dig.slice(2, 7) + "-" + dig.slice(7);
        else if (dig.length > 2) wa.value = "(" + dig.slice(0, 2) + ") " + dig.slice(2);
        else if (dig.length) wa.value = "(" + dig;
      });
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      esconderAlerta();
      limparErros();

      var nome = $("#campo-nome").value.trim();
      var email = $("#campo-email").value.trim();
      var emailConfirm = $("#campo-email-confirm").value.trim();
      var termos = $("#campo-termos").checked;

      var ok = true;
      if (nome.length < 2) { addErro($("#campo-nome")); ok = false; }
      if (!validaCpf($("#campo-cpf").value)) { addErro($("#campo-cpf")); ok = false; }
      if (!validaEmail(email)) { addErro($("#campo-email")); ok = false; }
      if (email !== emailConfirm) { addErro($("#campo-email-confirm")); ok = false; }
      if (!validaWhatsapp($("#campo-whatsapp").value)) { addErro($("#campo-whatsapp")); ok = false; }
      if (!termos) { addErro($("#campo-termos")); ok = false; }

      if (!ok) {
        mostrarAlerta("Revise os campos destacados e tente novamente.", "erro");
        return;
      }

      var botao = $("#js-btn-cadastro");
      botao.disabled = true;
      botao.textContent = "ENVIANDO PARA O MERCADO PAGO…";

      try {
        // 1) Cadastra o aluno (server-side, status pendente)
        var cad = await api("/api/cadastro", {
          method: "POST",
          body: JSON.stringify({
            nome: nome,
            cpf: $("#campo-cpf").value,
            email: email,
            emailConfirm: emailConfirm,
            whatsapp: $("#campo-whatsapp").value,
            plano: planoId,
          }),
        });
        if (!cad.ok) {
          mostrarAlerta(cad.dados.erro || "Não foi possível realizar o cadastro.", "erro");
          botao.disabled = false;
          botao.textContent = "IR PARA O PAGAMENTO";
          return;
        }

        // Guarda o aluno id para a página de sucesso
        try {
          sessionStorage.setItem(ALUNO_KEY, cad.dados.alunoId);
        } catch (_e) {}

        // 2) Gera a preferência de pagamento do Mercado Pago
        var pref = await api("/api/mercadopago/preference", {
          method: "POST",
          body: JSON.stringify({ alunoId: cad.dados.alunoId, plano: planoId }),
        });
        if (!pref.ok || !pref.dados.url) {
          mostrarAlerta(pref.dados.erro || "Não foi possível gerar o pagamento.", "erro");
          botao.disabled = false;
          botao.textContent = "IR PARA O PAGAMENTO";
          return;
        }

        window.location.href = pref.dados.url;
      } catch (err) {
        console.error(err);
        mostrarAlerta("Erro de conexão. Tente novamente em instantes.", "erro");
        botao.disabled = false;
        botao.textContent = "IR PARA O PAGAMENTO";
      }
    });
  }

  /* ============================================================
     PAINEL ADMIN — gerar acesso grátis (sem pagamento)
     ============================================================ */
  function initAdmin() {
    var form = $("#js-form-admin");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      esconderAlerta();
      $("#js-resultado").style.display = "none";

      var chave = $("#campo-admin-key").value.trim();
      var nome = $("#campo-nome").value.trim();
      var email = $("#campo-email").value.trim();

      if (!chave || !nome || !validaEmail(email)) {
        mostrarAlerta("Preencha a chave de administrador, o nome e um e-mail válido.", "erro");
        return;
      }

      guardarAdminKey(chave);
      var campoChaveAlunos = $("#campo-admin-key-alunos");
      if (campoChaveAlunos) campoChaveAlunos.value = chave;

      var botao = $("#js-btn-gerar");
      botao.disabled = true;
      botao.textContent = "GERANDO…";

      try {
        var r = await api("/api/admin/gerar-acesso", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
          body: JSON.stringify({
            nome: nome,
            email: email,
            whatsapp: $("#campo-whatsapp").value.trim(),
            cpf: $("#campo-cpf").value.trim(),
            plano: $("#campo-plano").value,
            diasValidade: parseInt($("#campo-validade").value, 10) || 365,
            enviarEmail: $("#campo-enviar-email").checked,
          }),
        });

        if (!r.ok) {
          mostrarAlerta(r.dados.erro || "Não foi possível gerar o acesso.", "erro");
          botao.disabled = false;
          botao.textContent = "GERAR ACESSO";
          return;
        }

        $("#js-codigo").textContent = r.dados.token;
        $("#js-result-plano").textContent = r.dados.plano === "ultra" ? "Plano Ultra" : "Plano Básico";
        $("#js-result-expira").textContent = fmtData(r.dados.expiraEm);
        $("#js-result-email-msg").textContent = r.dados.emailEnviado
          ? "O código também foi enviado para o e-mail dele(a)."
          : (r.dados.emailErro || "O e-mail não foi enviado (opção desmarcada). Copie o código acima.");

        $("#js-resultado").style.display = "block";
        esconderAlerta();
        botao.disabled = false;
        botao.textContent = "GERAR ACESSO";
      } catch (err) {
        console.error(err);
        mostrarAlerta("Erro de conexão. Tente novamente.", "erro");
        botao.disabled = false;
        botao.textContent = "GERAR ACESSO";
      }
    });
  }

  /* ============================================================
     PAINEL ADMIN — abas (Gerar acesso / Alunos & códigos)
     ============================================================ */
  var ADMIN_KEY_STORAGE = "adminKey900";

  function guardarAdminKey(chave) {
    if (!chave) return;
    try {
      sessionStorage.setItem(ADMIN_KEY_STORAGE, chave);
    } catch (_e) {}
  }

  function aplicarAdminKeyLembrada() {
    var chave = null;
    try {
      chave = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    } catch (_e) {}
    if (!chave) return;
    ["#campo-admin-key", "#campo-admin-key-alunos"].forEach(function (sel) {
      var el = $(sel);
      if (el && !el.value) el.value = chave;
    });
  }

  function initAdminAbas() {
    var abas = $qsa(".admin-tab");
    if (!abas.length) return;

    abas.forEach(function (aba) {
      aba.addEventListener("click", function () {
        var alvo = aba.getAttribute("data-aba");
        abas.forEach(function (t) {
          t.classList.toggle("ativo", t === aba);
        });
        $qsa(".admin-painel").forEach(function (painel) {
          painel.classList.toggle("ativo", painel.id === "painel-" + alvo);
        });
      });
    });
  }

  /* ============================================================
     PAINEL ADMIN — listar alunos, consultar/recuperar códigos
     ============================================================ */
  function initAdminAlunos() {
    var btn = $("#js-btn-carregar");
    if (!btn) return;

    var campoChave = $("#campo-admin-key-alunos");
    var alerta = $("#js-alerta-alunos");
    var campoStatus = $("#campo-status-filtro");
    var campoBusca = $("#campo-busca");
    var corpoTabela = $("#js-linha-alunos");
    var resumo = $("#js-resumo-alunos");

    var cache = [];

    function setAlerta(txt, tipo) {
      alerta.textContent = txt;
      alerta.className = "alerta " + (tipo === "ok" ? "alerta--ok" : "alerta--erro") + " visivel";
    }

    function badgeStatus(aluno) {
      if (aluno.status === "approved") {
        return '<span class="badge-status badge-status--approved">LIBERADO</span>';
      }
      if (aluno.status === "pendente") {
        return '<span class="badge-status badge-status--pendente">PENDENTE</span>';
      }
      return '<span class="badge-status badge-status--outro">' + escapeHtml(aluno.status || "—") + "</span>";
    }

    async function carregar() {
      var chave = campoChave.value.trim();
      if (!chave) {
        setAlerta("Informe a ADMIN_KEY para carregar os alunos.", "erro");
        return;
      }
      guardarAdminKey(chave);
      var campoGerar = $("#campo-admin-key");
      if (campoGerar) campoGerar.value = chave;

      btn.disabled = true;
      btn.textContent = "CARREGANDO…";
      corpoTabela.innerHTML = '<tr><td colspan="7" class="carregando">Carregando alunos…</td></tr>';

      try {
        var r = await api("/api/admin/alunos", {
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
        });

        if (!r.ok || !Array.isArray(r.dados.alunos)) {
          corpoTabela.innerHTML =
            '<tr><td colspan="7" class="sem-dados">Não foi possível carregar a lista.</td></tr>';
          setAlerta(r.dados.erro || "Erro na API. Verifique a ADMIN_KEY.", "erro");
          return;
        }

        cache = r.dados.alunos;
        alerta.className = "alerta";
        renderizar();
      } catch (err) {
        console.error("admin/alunos:", err);
        corpoTabela.innerHTML = '<tr><td colspan="7" class="sem-dados">Erro de conexão.</td></tr>';
        setAlerta("Erro de conexão. Tente novamente.", "erro");
      } finally {
        btn.disabled = false;
        btn.textContent = "CARREGAR ALUNOS";
      }
    }

    function copiarCodigo(codigo) {
      if (!codigo) return;
      var okCopiar = function () {
        setAlerta("Código copiado: " + codigo, "ok");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigo).then(okCopiar).catch(function () {
          setAlerta("Código: " + codigo, "ok");
        });
      } else {
        setAlerta("Código: " + codigo, "ok");
      }
    }

    async function reenviarEmail(aluno) {
      if (!aluno || !aluno.token) return;
      var chave = campoChave.value.trim();
      if (!chave) {
        setAlerta("Informe a ADMIN_KEY para reenviar o e-mail.", "erro");
        return;
      }

      try {
        var r = await api("/api/email/enviar-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
          body: JSON.stringify({ codigo: aluno.token }),
        });

        if (r.ok) {
          aluno.email_enviado = true;
          renderizar();
          setAlerta("E-mail reenviado para " + aluno.email + ".", "ok");
        } else {
          setAlerta(r.dados.erro || "Falha ao reenviar o e-mail.", "erro");
        }
      } catch (err) {
        console.error("reenviar-token:", err);
        setAlerta("Erro de conexão ao reenviar o e-mail.", "erro");
      }
    }

    async function excluirAluno(id) {
      var aluno = null;
      for (var i = 0; i < cache.length; i++) {
        if (String(cache[i].id) === String(id)) {
          aluno = cache[i];
          break;
        }
      }
      if (!aluno) return;

      var chave = campoChave.value.trim();
      if (!chave) {
        setAlerta("Informe a ADMIN_KEY para excluir.", "erro");
        return;
      }

      var rotulo = aluno.nome || aluno.email || aluno.id;
      var confirmar = window.confirm(
        'Excluir definitivamente o aluno "' +
          rotulo +
          '"?\n\nIsso apaga o cadastro, o código de acesso e as sessões. Não pode ser desfeito.'
      );
      if (!confirmar) return;

      try {
        var r = await api("/api/admin/excluir-aluno", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
          body: JSON.stringify({ id: aluno.id }),
        });

        if (r.ok) {
          cache = cache.filter(function (a) {
            return String(a.id) !== String(aluno.id);
          });
          renderizar();
          setAlerta("Aluno excluído: " + rotulo + ".", "ok");
        } else {
          setAlerta(r.dados.erro || "Falha ao excluir o aluno.", "erro");
        }
      } catch (err) {
        console.error("excluir-aluno:", err);
        setAlerta("Erro de conexão ao excluir o aluno.", "erro");
      }
    }

    function renderizar() {
      var busca = (campoBusca.value || "").trim().toLowerCase();
      var statusF = campoStatus.value;

      var linhas = cache.filter(function (a) {
        if (statusF && a.status !== statusF) return false;
        if (!busca) return true;
        return (
          String(a.nome || "").toLowerCase().indexOf(busca) !== -1 ||
          String(a.email || "").toLowerCase().indexOf(busca) !== -1
        );
      });

      if (resumo) {
        var rotulo = statusF === "approved" ? "liberados" : statusF === "pendente" ? "pendentes" : "todos";
        resumo.style.display = "block";
        resumo.textContent =
          cache.length + " aluno(s) no total · exibindo " + linhas.length + " (" + rotulo + ")";
      }

      if (!linhas.length) {
        corpoTabela.innerHTML =
          '<tr><td colspan="7" class="sem-dados">Nenhum aluno encontrado.</td></tr>';
        return;
      }

      corpoTabela.innerHTML = linhas
        .map(function (a) {
          var codigoCell = a.token
            ? '<span class="codigo-cell">' + escapeHtml(a.token) + "</span>"
            : '<span class="mutado" style="font-size:0.8rem;">— sem código —</span>';

          var acoes =
            '<button type="button" class="acao-btn" data-copiar="' +
            escapeHtml(a.token || "") +
            '"' +
            (a.token ? "" : " disabled") +
            '>Copiar</button> ' +
            '<button type="button" class="acao-btn acao-btn--enviar" data-reenviar="' +
            escapeHtml(a.token || "") +
            '"' +
            (a.token ? "" : " disabled") +
            ">" +
            (a.email_enviado ? "Reenviar e-mail" : "Enviar e-mail") +
            "</button> " +
            '<button type="button" class="acao-btn acao-btn--excluir" data-excluir="' +
            escapeHtml(a.id) +
            '">Excluir</button>';

          return (
            "<tr>" +
            '<td><div class="aluno-nome">' + escapeHtml(a.nome) + "</div>" +
            '<div class="aluno-email">' + escapeHtml(a.email) + "</div>" +
            (a.whatsapp ? '<div class="aluno-email">📱 ' + escapeHtml(a.whatsapp) + "</div>" : "") +
            "</td>" +
            "<td>" + escapeHtml(a.planoNome || a.plano) + "</td>" +
            "<td>" + badgeStatus(a) + "</td>" +
            "<td>" + fmtData(a.liberado_em || a.criado_em) + "</td>" +
            "<td>" + fmtData(a.expira_em) + "</td>" +
            "<td>" + codigoCell + "</td>" +
            "<td>" + acoes + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    btn.addEventListener("click", carregar);

    if (campoBusca) campoBusca.addEventListener("input", renderizar);
    if (campoStatus) campoStatus.addEventListener("change", renderizar);

    // Delegação de cliques: copiar código / reenviar e-mail / excluir aluno.
    corpoTabela.addEventListener("click", function (e) {
      var botao = e.target.closest ? e.target.closest("button") : null;
      if (!botao || botao.disabled) return;

      if (botao.hasAttribute("data-excluir")) {
        excluirAluno(botao.getAttribute("data-excluir") || "");
        return;
      }

      var codigo = botao.getAttribute("data-copiar") || botao.getAttribute("data-reenviar");
      if (!codigo) return;

      var aluno = null;
      for (var i = 0; i < cache.length; i++) {
        if (cache[i].token === codigo) {
          aluno = cache[i];
          break;
        }
      }

      if (botao.hasAttribute("data-copiar")) {
        copiarCodigo(codigo);
      } else if (botao.hasAttribute("data-reenviar")) {
        reenviarEmail(aluno);
      }
    });
  }

  /* ============================================================
     PAINEL ADMIN — ativar/desativar o Plano R$ 1
     ============================================================ */
  function initAdminPlano1real() {
    var btn = $("#js-btn-plano1-carregar");
    if (!btn) return;

    var campoChave = $("#campo-admin-key-plano1");
    var alerta = $("#js-alerta-plano1");
    var estado = $("#js-plano1-estado");
    var chk = $("#campo-plano1-ativo");
    var rotulo = $("#js-switch-rotulo");
    var row = $("#js-switch-row");

    function setAlerta(txt, tipo) {
      if (!alerta) return;
      alerta.textContent = txt;
      alerta.className = "alerta " + (tipo === "ok" ? "alerta--ok" : "alerta--erro") + " visivel";
    }

    function aplicar(dados) {
      if (chk) chk.checked = !!dados.ativo;
      if (rotulo) {
        rotulo.textContent = dados.ativo ? "Plano R$ 1 ATIVO" : "Plano R$ 1 DESATIVADO";
      }
      if (estado) {
        estado.className = "badge " + (dados.ativo ? "badge--verde" : "badge--vermelho");
        estado.textContent = dados.ativo ? "ATIVO" : "DESATIVADO";
      }
      if (row) row.style.display = "flex";
      if (chk) chk.disabled = false;
    }

    async function carregar() {
      var chave = campoChave ? campoChave.value.trim() : "";
      if (!chave) {
        setAlerta("Informe a ADMIN_KEY para consultar o status do plano.", "erro");
        return;
      }
      guardarAdminKey(chave);
      var campoGerar = $("#campo-admin-key");
      var campoAlunos = $("#campo-admin-key-alunos");
      if (campoGerar) campoGerar.value = chave;
      if (campoAlunos) campoAlunos.value = chave;

      btn.disabled = true;
      btn.textContent = "CONSULTANDO…";
      try {
        var r = await api("/api/admin/plano1real", {
          method: "GET",
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
        });
        if (!r.ok || !r.dados || typeof r.dados.ativo !== "boolean") {
          setAlerta(r.dados.erro || "Falha ao consultar o status. Verifique a ADMIN_KEY.", "erro");
          return;
        }
        aplicar(r.dados);
        alerta.className = "alerta";
      } catch (err) {
        console.error("admin/plano1real:", err);
        setAlerta("Erro de conexão. Tente novamente.", "erro");
      } finally {
        btn.disabled = false;
        btn.textContent = "CONSULTAR STATUS";
      }
    }

    async function salvar(ativar) {
      var chave = campoChave ? campoChave.value.trim() : "";
      if (!chave) {
        if (chk) chk.checked = !ativar;
        setAlerta("Informe a ADMIN_KEY para salvar a mudança.", "erro");
        return;
      }
      if (chk) chk.disabled = true;
      try {
        var r = await api("/api/admin/plano1real", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": chave },
          body: JSON.stringify({ ativo: ativar }),
        });
        if (!r.ok || !r.dados || typeof r.dados.ativo !== "boolean") {
          if (chk) chk.checked = !ativar;
          setAlerta(r.dados.erro || "Falha ao salvar. Verifique a ADMIN_KEY.", "erro");
          if (chk) chk.disabled = false;
          return;
        }
        aplicar(r.dados);
        setAlerta(
          r.dados.ativo
            ? "Plano R$ 1 ATIVO. O cartão já apareceu na página inicial e o cadastro aceita esse plano."
            : "Plano R$ 1 DESATIVADO. O cartão sumiu do site e cadastros novos com esse plano serão recusados.",
          "ok"
        );
      } catch (err) {
        console.error("admin/plano1real:", err);
        if (chk) chk.checked = !ativar;
        setAlerta("Erro de conexão ao salvar. Tente novamente.", "erro");
      }
    }

    btn.addEventListener("click", carregar);
    if (chk) {
      chk.addEventListener("change", function () {
        salvar(chk.checked);
      });
    }
  }

  /* ============================================================
     PÁGINA DE LOGIN
     ============================================================ */
  function destinoAposLogin() {
    var next = null;
    try {
      next = new URLSearchParams(window.location.search).get("next");
    } catch (_e) {}
    // Aceita apenas nomes de página locais (evita redirecionamento externo).
    if (next && /^[a-z0-9_\-]+\.html$/i.test(next)) return next;
    return "aluno.html";
  }

  function initLogin() {
    var form = $("#js-form-login");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      esconderAlerta();

      var email = $("#campo-email").value.trim();
      var codigo = $("#campo-codigo").value.trim();

      if (!validaEmail(email) || !codigo) {
        mostrarAlerta("Informe seu e-mail e seu código de acesso.", "erro");
        return;
      }

      var botao = $("#js-btn-login");
      botao.disabled = true;
      botao.textContent = "ENTRANDO…";

      try {
        var r = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email, codigo: codigo }),
        });

        if (!r.ok) {
          mostrarAlerta(r.dados.erro || "Não foi possível entrar.", "erro");
          botao.disabled = false;
          botao.textContent = "ENTRAR NA ÁREA DO ALUNO";
          return;
        }

        try {
          sessionStorage.setItem(SESSAO_KEY, r.dados.sessao);
        } catch (_e) {}

        window.location.href = destinoAposLogin();
      } catch (err) {
        console.error(err);
        mostrarAlerta("Erro de conexão. Tente novamente.", "erro");
        botao.disabled = false;
        botao.textContent = "ENTRAR NA ÁREA DO ALUNO";
      }
    });
  }

  /* ============================================================
     ÁREA DO ALUNO
     ============================================================ */
  function videoEmbed(aula) {
    var vid = aula.videoId;
    if (!vid || String(vid).indexOf("TROQUE_") === 0) {
      return (
        '<div class="aula-bloqueada"><div class="selo">🎬</div>' +
        "<p>Aula gravada chegando na sua plataforma. Em breve você poderá assistir aqui.</p></div>"
      );
    }
    return (
      '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(vid) +
      '" title="' + escapeHtml(aula.titulo) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
    );
  }

  function initAluno() {
    var sessao;
    try {
      sessao = sessionStorage.getItem(SESSAO_KEY);
    } catch (_e) {}

    if (!sessao) {
      window.location.href = "login.html?next=aluno.html";
      return;
    }

    fetch("/api/auth/me", { headers: { "x-sessao": sessao } })
      .then(function (res) {
        return res.json().then(function (d) {
          return { status: res.status, d: d };
        });
      })
      .then(function (r) {
        if (r.status !== 200) {
          console.warn("me:", r.d);
          window.location.href = "login.html?next=aluno.html";
          return;
        }
        montarAluno(r.d.aluno, sessao);
      })
      .catch(function (err) {
        console.error("me:", err);
        window.location.href = "login.html?next=aluno.html";
      });
  }

  function montarAluno(aluno, sessao) {
    var nome = aluno.nome || "Aluno";
    var ini = $("#js-saudacao-nome");
    if (ini) ini.textContent = nome.split(" ")[0];

    var avatar = $("#js-avatar");
    if (avatar) avatar.textContent = nome.split(" ").slice(0, 2).map(function (p) { return p[0]; }).join("") || "A";

    var topoNome = $("#js-nome-topo");
    if (topoNome) topoNome.textContent = nome;
    var topoPlano = $("#js-plano-topo");
    if (topoPlano) topoPlano.textContent = aluno.planoNome;

    $("#js-status-plano").textContent = aluno.planoNome;
    $("#js-status-liberado").textContent = fmtData(aluno.liberadoEm);
    var exp = $("#js-status-expira");
    exp.textContent = fmtData(aluno.expiraEm);
    exp.classList.add("vence");

    // Aulas
    var grid = $("#js-aulas-aluno");
    if (grid && AULAS.aulas) {
      grid.innerHTML = AULAS.aulas
        .map(function (aula) {
          var pdfBtn = aula.pdf
            ? '<a class="btn btn--azul" href="/api/material?aula=' + aula.id + "&sessao=" +
              encodeURIComponent(sessao) + '">BAIXAR MATERIAL DA AULA</a>'
            : '<span class="btn btn--contorno" style="cursor: default;">Material em breve</span>';
          return (
            "<article class=\"aula-aluno\">" +
            videoEmbed(aula) +
            '<div class="info">' +
            '<span class="num">Aula ' + aula.numero + " · " + escapeHtml(aula.area) + "</span>" +
            "<h3>" + escapeHtml(aula.titulo) + "</h3>" +
            "<p>" + escapeHtml(aula.resumo) + "</p>" +
            '<div class="acoes">' + pdfBtn + "</div>" +
            "</div></article>"
          );
        })
        .join("");
    }

    // Upgrade para Ultra
    var upgrade = $("#js-upgrade-banner");
    if (upgrade) {
      if (!aluno.materialExclusivo) {
        upgrade.classList.remove("escondido");

        var planoUp = PLANOS.porId && PLANOS.porId("upgrade");
        var precoUp = $("#js-upgrade-preco");
        if (precoUp && planoUp) {
          precoUp.textContent =
            "Upgrade por " + planoUp.parcelas + "x de " + fmtBRL(planoUp.preco) + ".";
        }

        var btnUp = $("#js-upgrade-btn");
        if (btnUp) {
          btnUp.addEventListener("click", async function (e) {
            e.preventDefault();
            btnUp.textContent = "GERANDO PAGAMENTO…";
            var pref = await api("/api/mercadopago/upgrade", {
              method: "POST",
              body: JSON.stringify({ sessao: sessao }),
            });
            if (pref.ok && pref.dados.url) {
              window.location.href = pref.dados.url;
            } else {
              // Sem link de fallback para o valor do upgrade (evita preço errado).
              btnUp.textContent = "FAZER UPGRADE PARA ULTRA (" + (pref.dados.erro || "tente novamente") + ")";
            }
          });
        }
      }
    }

    // Material exclusivo (Plano Ultra) — só aparece se o PDF já foi enviado.
    var mat = $("#js-material-ultra");
    var temMaterial = AULAS.materialExclusivo && AULAS.materialExclusivo.pdf;
    if (mat && aluno.materialExclusivo && temMaterial) {
      mat.classList.remove("escondido");
      var btnMat = $("#js-material-baixar");
      btnMat.setAttribute("href", "materiais.html#s=" + encodeURIComponent(sessao));
      btnMat.setAttribute("target", "_blank");
      btnMat.setAttribute("rel", "noopener");
    }

    ligarSair();
  }

  function ligarSair() {
    var sair = $("#js-sair");
    if (sair) {
      sair.addEventListener("click", function () {
        try {
          sessionStorage.removeItem(SESSAO_KEY);
        } catch (_e) {}
        window.location.href = "login.html";
      });
    }
  }

  /* ============================================================
     PÁGINA DE MATERIAIS (10 temas — Plano Ultra)
     ============================================================ */
  function initMateriais() {
    var sessao;
    try {
      sessao = sessionStorage.getItem(SESSAO_KEY);
    } catch (_e) {}

    // Abriu em nova aba: a sessão pode vir no fragmento da URL (#s=...).
    if (!sessao) {
      var m = /(?:^#|&)s=([^&]+)/.exec(window.location.hash || "");
      if (m) {
        try {
          sessao = decodeURIComponent(m[1]);
          sessionStorage.setItem(SESSAO_KEY, sessao);
        } catch (_e) {
          sessao = m[1];
        }
        try {
          history.replaceState(null, "", window.location.pathname);
        } catch (_e) {}
      }
    }

    if (!sessao) {
      window.location.href = "login.html?next=materiais.html";
      return;
    }

    ligarSair();

    fetch("/api/auth/me", { headers: { "x-sessao": sessao } })
      .then(function (res) {
        return res.json().then(function (d) {
          return { status: res.status, d: d };
        });
      })
      .then(function (r) {
        if (r.status !== 200) {
          window.location.href = "login.html?next=materiais.html";
          return;
        }

        var aluno = r.d.aluno || {};
        var lista = $("#js-temas-lista");
        var semAcesso = $("#js-materiais-sem-acesso");
        var loading = $("#js-materiais-loading");

        if (loading) loading.classList.add("escondido");

        if (!aluno.materialExclusivo) {
          if (semAcesso) semAcesso.classList.remove("escondido");
          return;
        }

        var temas = (AULAS.materialExclusivo && AULAS.materialExclusivo.temas) || [];
        if (lista) {
          lista.innerHTML = temas
            .map(function (t) {
              return (
                '<article class="tema-item">' +
                '<div class="tema-num">' + t.numero + "</div>" +
                '<div class="tema-info">' +
                "<h3>" + escapeHtml(t.titulo) + "</h3>" +
                "<p>Tema + redação-modelo nota mil · PDF para download.</p>" +
                "</div>" +
                '<a class="btn btn--primario" target="_blank" rel="noopener" href="/api/material?material=' +
                t.id + "&sessao=" + encodeURIComponent(sessao) + '">BAIXAR PDF</a>' +
                "</article>"
              );
            })
            .join("");
          lista.classList.remove("escondido");
        }

        var tudo = $("#js-materiais-baixar-tudo");
        if (tudo) {
          tudo.setAttribute(
            "href",
            "/api/material?material=exclusivo&sessao=" + encodeURIComponent(sessao)
          );
        }
      })
      .catch(function (err) {
        console.error("materiais:", err);
        window.location.href = "login.html?next=materiais.html";
      });
  }

  /* ============================================================
     PÁGINA DE SUCESSO (acompanha o pagamento)
     ============================================================ */
  function initSucesso() {
    var icone = $("#js-icone");
    var titulo = $("#js-titulo");
    var mensagem = $("#js-mensagem");
    var passos = $("#js-passos");
    var acoes = $("#js-acoes");
    var rodapeMsg = $("#js-rodape-msg");

    if (!titulo) return;

    var params = new URLSearchParams(window.location.search);
    // O Mercado Pago volta para esta página com "external_reference" (o id do aluno).
    var alunoId = params.get("aluno") || params.get("external_reference");
    try {
      if (!alunoId) alunoId = sessionStorage.getItem(ALUNO_KEY);
      if (alunoId) sessionStorage.setItem(ALUNO_KEY, alunoId);
    } catch (_e) {}

    if (!alunoId) {
      titulo.textContent = "Pagamento em andamento";
      mensagem.textContent = "Assim que o Mercado Pago confirmar a aprovação, seu acesso será liberado e seu código aparecerá aqui. Salve-o: ele não pode ser perdido.";
      return;
    }

    var tentativas = 0;

    function renderAprovado(dados) {
      icone.className = "sucesso-icone ok";
      icone.textContent = "✓";
      titulo.textContent = "Pagamento confirmado! 🎉";
      mensagem.innerHTML =
        "Seu acesso foi liberado. Copie o código abaixo e <strong>salve-o em um lugar seguro</strong> — ele não pode ser perdido.";
      passos.classList.remove("escondido");
      $qsa("p", passos).forEach(function (p) {
        p.style.display = "flex";
      });
      var token = (dados && dados.token) || "";
      if (token) {
        var bloco = $("#js-bloco-codigo");
        if (bloco) bloco.classList.remove("escondido");
        var codigoEl = $("#js-codigo");
        if (codigoEl) codigoEl.textContent = token;
      }
      acoes.innerHTML =
        '<a class="btn btn--primario btn--bloco" href="login.html">ENTRAR COM MEU CÓDIGO</a>' +
        '<div class="btn-sessoes">' +
        '<a class="btn btn--contorno" href="index.html">VOLTAR AO INÍCIO</a>' +
        "</div>";
      rodapeMsg.textContent =
        "Este código é o seu acesso: é individual, intransferível e não pode ser perdido. Guarde-o.";
    }

    function renderAguardando() {
      icone.className = "sucesso-icone pendente";
      icone.textContent = "…";
      titulo.textContent = "Aguardando confirmação do pagamento";
      mensagem.innerHTML =
        "<span class=\"spinner\"></span> Seu pagamento ainda não foi confirmado. Assim que o Mercado Pago confirmar, seu código de acesso aparece aqui.";
      passos.classList.add("escondido");
      acoes.innerHTML =
        '<a class="btn btn--contorno" href="index.html">VOLTAR AO INÍCIO</a>';
      rodapeMsg.textContent = "Não feche esta página enquanto aguarda.";
    }

    async function consultar() {
      try {
        var r = await api("/api/payment/status?aluno=" + encodeURIComponent(alunoId));
        if (r.ok && r.dados.aprovado) {
          renderAprovado(r.dados);
          return;
        }
      } catch (_e) {}

      tentativas += 1;
      // Mantém a consulta por até ~10 minutos (150 tentativas de 4s).
      if (tentativas < 150) {
        renderAguardando();
        setTimeout(consultar, 4000);
      } else {
        renderAguardando();
        acoes.innerHTML =
          '<a class="btn btn--contorno" href="login.html">Já tenho o código — Entrar</a>' +
          '<button type="button" class="btn btn--primario btn--bloco" id="js-reconsultar" style="margin-top: 12px;">VERIFICAR NOVAMENTE</button>';
        rodapeMsg.textContent =
          "Se o pagamento foi feito, atualize esta página (F5) para ver seu código de acesso. Você também pode usar o botão acima.";
        var btn = $("#js-reconsultar");
        if (btn) {
          btn.addEventListener("click", function () {
            tentativas = 0;
            consultar();
          });
        }
      }
    }

    consultar();
  }

  /* ============================================================
     DISPATCH POR PÁGINA
     ============================================================ */
  document.addEventListener("DOMContentLoaded", function () {
    initGeral();
    renderInfografico();
    renderAulasPublicas();
    renderPlanos();
    renderComoFunciona();

    // Observa os elementos de scroll APÓS os renders dinâmicos.
    observarAnimacao();

    var pagina = window.location.pathname.split("/").pop();

    if (pagina === "cadastro.html" || window.location.pathname.indexOf("cadastro") !== -1) initCadastro();
    if (pagina === "login.html" || window.location.pathname.indexOf("login") !== -1) initLogin();
    if (pagina === "admin.html" || window.location.pathname.indexOf("admin") !== -1) {
      aplicarAdminKeyLembrada();
      initAdmin();
      initAdminAbas();
      initAdminAlunos();
      initAdminPlano1real();
    }
    if (pagina === "aluno.html" || window.location.pathname.indexOf("aluno") !== -1) initAluno();
    if (pagina === "materiais.html" || window.location.pathname.indexOf("materiais") !== -1) initMateriais();
    if (pagina === "sucesso.html" || window.location.pathname.indexOf("sucesso") !== -1) initSucesso();
  });
})();