/* =========================================================
   painel.js
   Casca do painel fiscal. Rotas por hash: #panorama, #cnpj,
   #divida, #mesa (ou #mesa/2 pra abrir um incentivo), #impostos.
   Dados vêm de painel-dados.js (exemplo). A consulta por CNPJ
   já é real (BrasilAPI, só cadastro).
   ========================================================= */

(function () {
  'use strict';

  const D = window.PAINEL_DADOS;
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const fmt = (n, d) => Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: d || 0,
    maximumFractionDigits: d || 0
  });

  const S = { k: 0, a: D.incentivos[0].a, nv: 0, ar: 0 };

  /* ---------- peças comuns ---------- */

  function head(titulo, sub, exemplo) {
    return '<header class="p-head"><div><h1>' + esc(titulo) + '</h1><p class="p-lead">' + esc(sub) + '</p></div>' +
      (exemplo ? '<span class="p-tag">Dados de exemplo</span>' : '') + '</header>';
  }

  function metric(rotulo, valor, sub, cor) {
    return '<div class="p-metric"><p class="p-metric-label">' + esc(rotulo) + '</p>' +
      '<p class="p-metric-value' + (cor ? ' ' + cor : '') + '">' + esc(valor) + '</p>' +
      '<p class="p-metric-sub">' + esc(sub || '') + '</p></div>';
  }

  function bar(rotulo, v, max, texto, href) {
    const pct = max > 0 ? Math.round((v / max) * 100) : 0;
    const inner = '<span class="p-bar-label">' + esc(rotulo) + '</span>' +
      '<span class="p-track"><span class="p-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="p-bar-value">' + esc(texto) + '</span>';
    return href
      ? '<a class="p-bar p-bar-link" href="' + href + '">' + inner + '</a>'
      : '<div class="p-bar">' + inner + '</div>';
  }

  /* ---------- Panorama ---------- */

  function vPanorama() {
    const r = D.renuncia;
    const maxS = Math.max.apply(null, D.setores.map((s) => s[1]));
    const maxE = Math.max.apply(null, r.serie.map((s) => s[1]));

    return head('Panorama de renúncia', 'Quanto o governo deixa de arrecadar por ano. Escolha um setor pra analisar o incentivo na Mesa.', true) +
      '<div class="p-grid p-grid-3">' +
        metric('Renúncia em ' + r.ano, 'R$ ' + fmt(r.total) + ' bi', 'por ano') +
        metric('Peso na arrecadação', fmt(r.peso) + '%', 'da arrecadação federal') +
        metric('Setores listados', String(D.setores.length), 'maiores renúncias') +
      '</div>' +
      '<div class="p-two">' +
        '<section class="p-card"><h2>Evolução por ano</h2><div class="p-cols">' +
          r.serie.map((s) => '<div class="p-col"><div class="p-col-bar" style="height:' + Math.round((s[1] / maxE) * 100) + '%"></div><span>' + esc(s[0]) + '</span></div>').join('') +
        '</div></section>' +
        '<section class="p-card"><h2>Maiores setores</h2>' +
          D.setores.map((s, i) => bar(s[0], s[1], maxS, 'R$ ' + s[1] + ' bi', '#mesa/' + i)).join('') +
          '<p class="p-note">Valores em R$ bi, ano ' + r.ano + '.</p>' +
        '</section>' +
      '</div>';
  }

  /* ---------- Consulta CNPJ ---------- */

  // Aceita CNPJ numérico e alfanumérico (formato de julho de 2026).
  // Valor de cada caractere = código ASCII - 48; pesos e módulo 11 como no CNPJ clássico.
  function cnpjValido(c) {
    if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)) return false;
    if (/^(.)\1{13}$/.test(c)) return false;
    const dv = (base) => {
      const pesos = base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let soma = 0;
      for (let i = 0; i < base.length; i++) soma += (base.charCodeAt(i) - 48) * pesos[i];
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
  }

  function cnpjFormatado(c) {
    return c.slice(0, 2) + '.' + c.slice(2, 5) + '.' + c.slice(5, 8) + '/' + c.slice(8, 12) + '-' + c.slice(12);
  }

  function dataBR(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
  }

  function vCnpj() {
    return head('Consulta CNPJ', 'Cadastro público da empresa. Os demais dados entram quando as fontes forem conectadas.', false) +
      '<form class="p-form" id="cnpj-form" novalidate>' +
        '<label class="p-label" for="cnpj-input">CNPJ</label>' +
        '<div class="p-form-row">' +
          '<input class="p-input" id="cnpj-input" type="text" inputmode="text" autocomplete="off" placeholder="00.000.000/0000-00" maxlength="18">' +
          '<button class="p-btn" type="submit" id="cnpj-btn">Buscar</button>' +
        '</div>' +
      '</form>' +
      '<div id="cnpj-out" aria-live="polite"></div>';
  }

  function cnpjMensagem(texto, tipo) {
    return '<div class="p-card p-msg ' + (tipo || '') + '">' + esc(texto) + '</div>';
  }

  function cnpjResultado(d, cnpj) {
    const ativa = /ativa/i.test(d.descricao_situacao_cadastral || '');
    const simples = d.opcao_pelo_simples === true ? ['Optante pelo Simples', 'accent']
      : d.opcao_pelo_simples === false ? ['Não optante pelo Simples', ''] : ['Simples: sem informação', ''];
    const mei = d.opcao_pelo_mei === true ? '<span class="p-badge accent">MEI</span>' : '';
    const capital = typeof d.capital_social === 'number' ? 'R$ ' + fmt(d.capital_social, 2) : '—';
    const local = [d.municipio, d.uf].filter(Boolean).join(' / ') || '—';

    const campos = [
      ['CNAE principal', (d.cnae_fiscal || '') + (d.cnae_fiscal_descricao ? ' · ' + d.cnae_fiscal_descricao : '')],
      ['Porte', d.porte],
      ['Natureza jurídica', d.natureza_juridica],
      ['Município / UF', local],
      ['Início da atividade', dataBR(d.data_inicio_atividade)],
      ['Capital social', capital]
    ];

    const pendente = (titulo, fonte) =>
      '<div class="p-metric p-metric-off"><p class="p-metric-label">' + esc(titulo) + '</p>' +
      '<p class="p-metric-value muted">Não conectado</p><p class="p-metric-sub">' + esc(fonte) + '</p></div>';

    return '<section class="p-card">' +
        '<div class="p-company-head"><div>' +
          '<h2 class="p-company">' + esc(d.razao_social || '—') + '</h2>' +
          '<p class="p-note">' + (d.nome_fantasia ? esc(d.nome_fantasia) + ' · ' : '') + esc(cnpjFormatado(cnpj)) + '</p>' +
        '</div><div class="p-badges">' +
          '<span class="p-badge ' + (ativa ? 'ok' : 'warn') + '">' + esc(d.descricao_situacao_cadastral || 'Situação desconhecida') + '</span>' +
          '<span class="p-badge ' + simples[1] + '">' + esc(simples[0]) + '</span>' + mei +
        '</div></div>' +
        '<dl class="p-dl">' + campos.map((c) => '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1] || '—') + '</dd></div>').join('') + '</dl>' +
      '</section>' +
      '<div class="p-grid p-grid-3">' +
        pendente('Recebido do governo', 'Portal da Transparência') +
        pendente('Dívida ativa', 'PGFN') +
        pendente('Sanções', 'CEIS e CNEP') +
      '</div>';
  }

  function bindCnpj() {
    const form = $('cnpj-form');
    const out = $('cnpj-out');
    const btn = $('cnpj-btn');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cnpj = $('cnpj-input').value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();

      if (cnpj.length !== 14 || !cnpjValido(cnpj)) {
        out.innerHTML = cnpjMensagem('CNPJ inválido. Confira os 14 caracteres.', 'erro');
        return;
      }

      out.innerHTML = cnpjMensagem('Consultando…');
      btn.disabled = true;

      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 15000);

      fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpj, { signal: ctl.signal })
        .then((r) => {
          if (r.status === 404) { const err = new Error('nao_encontrado'); err.tipo = 'nao_encontrado'; throw err; }
          if (!r.ok) { const err = new Error('http'); err.tipo = 'http'; err.status = r.status; throw err; }
          return r.json();
        })
        .then((d) => { out.innerHTML = cnpjResultado(d, cnpj); })
        .catch((err) => {
          if (err.tipo === 'nao_encontrado') {
            out.innerHTML = cnpjMensagem('CNPJ não encontrado na BrasilAPI. CNPJs muito recentes podem demorar a aparecer.', 'erro');
          } else if (err.tipo === 'http') {
            out.innerHTML = cnpjMensagem('A BrasilAPI respondeu com erro (' + err.status + '). Tente de novo em instantes.', 'erro');
          } else {
            out.innerHTML = cnpjMensagem('Não consegui consultar a BrasilAPI (sem rede, tempo esgotado ou bloqueio do navegador).', 'erro');
          }
        })
        .then(() => { clearTimeout(timer); btn.disabled = false; });
    });
  }

  /* ---------- Dívida ativa ---------- */

  function vDivida() {
    const dv = D.divida;
    return head('Dívida ativa', 'Débitos inscritos na PGFN, por devedor. Busca e filtros entram com a carga real.', true) +
      '<div class="p-grid p-grid-3">' +
        metric('Total inscrito na PGFN', dv.total, 'Atualizado em ' + dv.atualizado) +
      '</div>' +
      '<section class="p-card"><h2>Maiores devedores</h2><div class="p-list">' +
        dv.itens.map((i) =>
          '<div class="p-list-row"><div><p class="p-list-title">' + esc(i[0]) + '</p><p class="p-note">' + esc(i[1]) + '</p></div>' +
          '<div class="p-list-end"><p class="p-list-title">' + esc(i[2]) + '</p><span class="p-badge ' + esc(i[4]) + '">' + esc(i[3]) + '</span></div></div>'
        ).join('') +
      '</div></section>';
  }

  /* ---------- Mesa de análise ---------- */

  function vMesa() {
    return head('Mesa de análise', 'Compara o custo de um incentivo com o retorno estimado. O veredito é um indicador, não uma conclusão.', true) +
      '<div class="p-two p-two-mesa">' +
        '<section class="p-card">' +
          '<label class="p-label" for="inc">Incentivo</label>' +
          '<select class="p-input" id="inc">' +
            D.incentivos.map((p, i) => '<option value="' + i + '"' + (i === S.k ? ' selected' : '') + '>' + esc(p.n) + '</option>').join('') +
          '</select>' +
          '<div class="p-range-head"><label class="p-label" for="ad">Adicionalidade <span class="p-hint">parte do retorno que só existe por causa do incentivo</span></label><span class="p-range-val" id="adv"></span></div>' +
          '<input class="p-range" type="range" id="ad" min="10" max="100" step="5">' +
          '<div class="p-grid p-grid-2" id="mesa-metrics"></div>' +
        '</section>' +
        '<section class="p-card">' +
          '<div class="p-verdict-head"><span class="p-note">Retorno para cada R$ 1 renunciado</span><span class="p-badge" id="vb"></span></div>' +
          '<p class="p-ratio" id="rt"></p>' +
          '<div class="p-meter"><div class="p-fill" id="meter"></div></div>' +
          '<div class="p-meter-scale"><span>R$ 0</span><span>equilíbrio: R$ 1,00</span><span>R$ 2,00</span></div>' +
          '<p class="p-note p-note-gap">O DGT cobre só renúncias federais e não é completo, então o custo real pode ser maior.</p>' +
          '<a class="p-link" href="#impostos">Ver de onde vem o dinheiro dos impostos →</a>' +
        '</section>' +
      '</div>';
  }

  function calcMesa() {
    const p = D.incentivos[S.k];
    const a = S.a / 100;
    const ret = p.r * a;
    const emp = Math.round(p.e * a);
    const cpe = Math.round((p.c * 1e6) / emp);
    const ratio = ret / p.c;

    $('ad').value = S.a;
    $('adv').textContent = S.a + '%';
    $('mesa-metrics').innerHTML =
      metric('Custo da renúncia', 'R$ ' + fmt(p.c, 1) + ' bi', 'por ano') +
      metric('Retorno fiscal', 'R$ ' + fmt(ret, 1) + ' bi', 'arrecadação indireta') +
      metric('Empregos atribuíveis', fmt(emp), 'já com adicionalidade') +
      metric('Custo por emprego', 'R$ ' + fmt(cpe) + ' mil', 'por ano');
    $('rt').textContent = 'R$ ' + fmt(ratio, 2);

    let texto, cls;
    if (ratio >= 1) { texto = 'Manter'; cls = 'ok'; }
    else if (ratio >= 0.5) { texto = 'Revisar desenho'; cls = 'warn'; }
    else { texto = 'Reavaliar'; cls = 'danger'; }

    const vb = $('vb');
    vb.textContent = texto;
    vb.className = 'p-badge ' + cls;
    const m = $('meter');
    m.style.width = Math.min(100, (ratio / 2) * 100) + '%';
    m.className = 'p-fill ' + cls;
  }

  function bindMesa() {
    calcMesa();
    $('inc').addEventListener('change', function () {
      S.k = Number(this.value);
      S.a = D.incentivos[S.k].a;
      calcMesa();
    });
    $('ad').addEventListener('input', function () {
      S.a = Number(this.value);
      calcMesa();
    });
  }

  /* ---------- Para onde vai o imposto ---------- */

  const NIVEIS = ['Lado a lado', 'Proporcional', 'Por fonte'];

  function vImpostos() {
    const a = D.areas[S.ar];
    const total = D.tributos.reduce((s, t) => s + t[1], 0);
    const maxT = Math.max.apply(null, D.tributos.map((t) => t[1]));
    let corpo = '';

    if (S.nv === 0) {
      corpo = '<h2>Arrecadação e gasto, separados</h2>' +
        D.tributos.map((t) => bar(t[0], t[1], maxT, 'R$ ' + fmt(t[1]))).join('') +
        '<div class="p-total"><span class="p-note">Gasto em ' + esc(a.n) + '</span><strong>R$ ' + fmt(a.gasto) + ' bi</strong></div>' +
        '<p class="p-note">Dado real: aqui não há ligação entre um imposto e o gasto.</p>';
    } else if (S.nv === 1) {
      const maxF = (a.gasto * maxT) / total;
      corpo = '<h2>Se todos pagassem na mesma proporção</h2>' +
        D.tributos.map((t) => { const f = (a.gasto * t[1]) / total; return bar(t[0], f, maxF, 'R$ ' + fmt(f, 1)); }).join('') +
        '<p class="p-note">Estimativa: peso do tributo na arrecadação × gasto em ' + esc(a.n) + '. Não é rastreio real.</p>';
    } else {
      corpo = '<h2>De qual fonte saiu o dinheiro</h2>' +
        a.fontes.map((f) => bar(f[0], f[1], a.gasto, 'R$ ' + fmt(f[1]))).join('') +
        '<p class="p-note">Grupos de fonte de recursos do orçamento, não imposto por imposto.</p>';
    }

    return head('Para onde vai o imposto', 'De qual tributo vem o dinheiro de uma área. Três níveis de precisão, do dado real à estimativa.', true) +
      '<div class="p-toolbar">' +
        '<select class="p-input p-input-sm" id="area" aria-label="Área">' +
          D.areas.map((x, i) => '<option value="' + i + '"' + (i === S.ar ? ' selected' : '') + '>' + esc(x.nome) + '</option>').join('') +
        '</select>' +
        '<div class="p-tabs" role="group" aria-label="Nível de precisão">' +
          NIVEIS.map((n, i) => '<button type="button" class="p-tab" data-nv="' + i + '" aria-pressed="' + (i === S.nv) + '">' + (i + 1) + ' · ' + n + '</button>').join('') +
        '</div>' +
      '</div>' +
      '<section class="p-card">' + corpo + '</section>' +
      '<p class="p-rule"><strong>Regra vigente:</strong> ' + esc(a.regra) + '</p>';
  }

  function bindImpostos() {
    $('area').addEventListener('change', function () { S.ar = Number(this.value); render(); });
    document.querySelectorAll('.p-tab').forEach((b) => {
      b.addEventListener('click', () => { S.nv = Number(b.getAttribute('data-nv')); render(); });
    });
  }

  /* ---------- rotas ---------- */

  const ROTAS = [
    { id: 'panorama', titulo: 'Panorama de renúncia', curto: 'Panorama', view: vPanorama, bind: null },
    { id: 'cnpj', titulo: 'Consulta CNPJ', curto: 'CNPJ', view: vCnpj, bind: bindCnpj },
    { id: 'divida', titulo: 'Dívida ativa', curto: 'Dívida ativa', view: vDivida, bind: null },
    { id: 'mesa', titulo: 'Mesa de análise', curto: 'Mesa', view: vMesa, bind: bindMesa },
    { id: 'impostos', titulo: 'Para onde vai o imposto', curto: 'Impostos', view: vImpostos, bind: bindImpostos }
  ];

  let atual = 'panorama';

  function lerHash() {
    const partes = location.hash.replace(/^#/, '').split('/');
    const rota = ROTAS.filter((r) => r.id === partes[0])[0];
    atual = rota ? rota.id : 'panorama';

    if (atual === 'mesa' && partes[1] !== undefined) {
      const k = Number(partes[1]);
      if (Number.isInteger(k) && k >= 0 && k < D.incentivos.length) {
        S.k = k;
        S.a = D.incentivos[k].a;
      }
    }
  }

  function renderNav() {
    $('p-nav').innerHTML = '<p class="p-nav-label">Painel fiscal</p>' + ROTAS.map((r) =>
      '<a class="p-nav-item" href="#' + r.id + '"' + (r.id === atual ? ' aria-current="page"' : '') + '>' + esc(r.curto) + '</a>'
    ).join('');
  }

  function render() {
    const rota = ROTAS.filter((r) => r.id === atual)[0];
    $('p-view').innerHTML = rota.view();
    renderNav();
    document.title = rota.titulo + ' — Painel fiscal';
    if (rota.bind) rota.bind();
  }

  window.addEventListener('hashchange', () => { lerHash(); render(); window.scrollTo(0, 0); });

  lerHash();
  render();
})();
