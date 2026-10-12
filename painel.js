/* =========================================================
   painel.js
   Casca do painel fiscal. Rotas por hash: #panorama, #cnpj,
   #divida, #mesa (ou #mesa/2 pra abrir um incentivo), #impostos.
   Dados vêm de painel-dados.js (exemplo). A consulta por CNPJ
   é real: cadastro na BrasilAPI e, se a Edge Function consulta-gov
   estiver publicada, sanções, contratos e renúncias do Portal da
   Transparência.
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

  function bar(rotulo, v, max, texto, href, classe) {
    const pct = max > 0 ? Math.round((v / max) * 100) : 0;
    const inner = '<span class="p-bar-label">' + esc(rotulo) + '</span>' +
      '<span class="p-track"><span class="p-fill" style="width:' + pct + '%"></span></span>' +
      '<span class="p-bar-value">' + esc(texto) + '</span>';
    const extra = classe ? ' ' + classe : '';
    return href
      ? '<a class="p-bar p-bar-link' + extra + '" href="' + href + '">' + inner + '</a>'
      : '<div class="p-bar' + extra + '">' + inner + '</div>';
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

  function pendenteCard(titulo, fonte) {
    return '<div class="p-metric p-metric-off"><p class="p-metric-label">' + esc(titulo) + '</p>' +
      '<p class="p-metric-value muted">Não conectado</p><p class="p-metric-sub">' + esc(fonte) + '</p></div>';
  }

  function govPendente(nota) {
    return '<div class="p-grid p-grid-3">' +
        pendenteCard('Recebido do governo', 'Portal da Transparência') +
        pendenteCard('Dívida ativa', 'PGFN') +
        pendenteCard('Sanções', 'CEIS, CNEP e CEPIM') +
      '</div>' + (nota ? '<p class="p-note p-note-gap">' + esc(nota) + '</p>' : '');
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
      '<div id="gov-out">' + govPendente() + '</div>';
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
        .then((d) => { out.innerHTML = cnpjResultado(d, cnpj); carregarGov(cnpj); })
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


  /* ---------- Portal da Transparência (via Edge Function consulta-gov) ---------- */

  // Nome da Edge Function no Supabase. Se o painel criou a função com outro
  // nome (o editor às vezes sugere algo como "dynamic-action"), troque aqui.
  const FUNCAO_GOV = 'consulta-gov';

  const ROTULOS_GOV = {
    ceis: 'CEIS', cnep: 'CNEP', cepim: 'CEPIM',
    contratos: 'Contratos', recebido: 'Recursos recebidos',
    renunciaValores: 'Valores renunciados', imunesIsentas: 'Pessoa jurídica imune ou isenta',
    habilitadas: 'Habilitada a benefício fiscal',
    pessoaJuridica: 'Cadastro no Portal da Transparência',
    notasFiscais: 'Notas fiscais emitidas ao governo federal'
  };

  // Achata um registro do Portal em pares [campo, valor] (a estrutura exata
  // varia por consulta, então a leitura é genérica).
  function achatar(obj, prefixo, saida, nivel) {
    Object.keys(obj).forEach((k) => {
      const v = obj[k];
      const chave = prefixo ? prefixo + ' › ' + k : k;
      if (v === null || v === undefined || v === '') return;
      if (Array.isArray(v)) {
        if (v.length && typeof v[0] !== 'object') saida.push([chave, v.join(', ')]);
        return;
      }
      if (typeof v === 'object') { if (nivel < 2) achatar(v, chave, saida, nivel + 1); return; }
      saida.push([chave, String(v)]);
    });
    return saida;
  }

  const qtd = (r) => (r && r.ok ? (typeof r.total === 'number' ? r.total : r.itens.length) : null);
  const somaOk = (lista) => lista.reduce((s, r) => s + (qtd(r) || 0), 0);
  const todosOk = (lista) => lista.every((r) => r && r.ok);

  function plural(n, um, varios) { return fmt(n) + ' ' + (n === 1 ? um : varios); }

  function govDetalhes(res, anos) {
    const rotulos = Object.assign({}, ROTULOS_GOV);
    (anos || []).forEach((a) => { rotulos['pagamentos' + a] = 'Maiores pagamentos federais em ' + a; });
    const blocos = Object.keys(rotulos).map((k) => {
      const r = res[k];
      if (!r) return '';
      if (!r.ok) {
        return '<p class="p-note">' + esc(rotulos[k]) + ': não consultado (' + esc(r.erro || 'erro') + ').</p>';
      }
      if (!r.itens.length) return '';
      const itens = r.itens.map((it) => {
        const campos = achatar(it, '', [], 0).slice(0, 14);
        return '<dl class="p-dl p-dl-sm">' + campos.map((c) =>
          '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>').join('') + '</dl>';
      }).join('');
      const mais = r.total > r.itens.length ? ' (mostrando ' + r.itens.length + ' de ' + r.total + ')' : '';
      return '<details class="p-det"><summary>' + esc(rotulos[k]) + ' · ' + plural(r.itens.length, 'registro', 'registros') + esc(mais) + '</summary>' + itens + '</details>';
    }).join('');
    return blocos ? '<section class="p-card"><h2>Detalhes do Portal da Transparência</h2>' + blocos +
      '<p class="p-note">Primeira página de cada consulta. Os nomes dos campos são os do Portal.</p></section>' : '';
  }

  const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function somarPor(linhas, campo) {
    const m = {};
    linhas.forEach((l) => { m[l[campo]] = (m[l[campo]] || 0) + l.valor; });
    return Object.keys(m).map((k) => ({ nome: k, valor: m[k] }));
  }

  // Resume os "valores renunciados" do Portal: total, por ano e por benefício.
  function renunciaResumo(r) {
    if (!r || !r.ok || !r.itens.length) return null;
    const linhas = r.itens.map((it) => ({
      ano: it.ano == null ? 'Sem ano' : String(it.ano),
      valor: it.valorRenunciado == null ? NaN : Number(it.valorRenunciado),
      beneficio: it.descricaoBeneficioFiscal || 'Benefício não informado',
      tributo: it.tributo || '',
      forma: it.formaTributacao || '',
      tipo: it.tipoRenuncia || '',
      base: it.descricaoFundamentoLegal || ''
    })).filter((l) => isFinite(l.valor));
    if (!linhas.length) return null;

    linhas.sort((a, b) => (a.ano < b.ano ? 1 : a.ano > b.ano ? -1 : b.valor - a.valor));
    return {
      linhas: linhas,
      total: linhas.reduce((s, l) => s + l.valor, 0),
      porAno: somarPor(linhas, 'ano').sort((a, b) => (a.nome < b.nome ? 1 : -1)),
      porBeneficio: somarPor(linhas, 'beneficio').sort((a, b) => b.valor - a.valor),
      parcial: typeof r.total === 'number' && r.total > r.itens.length,
      nTotal: typeof r.total === 'number' ? r.total : r.itens.length
    };
  }

  const unicos = (lista) => lista.filter((v, i) => v && lista.indexOf(v) === i);

  function renunciaCard(rs) {
    if (!rs) return '';
    const maxAno = Math.max.apply(null, rs.porAno.map((x) => x.valor));
    const maxBen = Math.max.apply(null, rs.porBeneficio.map((x) => x.valor));
    const anos = rs.porAno.map((x) => bar(x.nome, x.valor, maxAno, brl(x.valor), '', 'p-bar-wide')).join('');
    const bens = rs.porBeneficio.map((x) => bar(x.nome, x.valor, maxBen, brl(x.valor), '', 'p-bar-wide')).join('');
    const corpo = rs.linhas.map((l) =>
      '<tr><td>' + esc(l.ano) + '</td><td>' + esc(l.beneficio) + '</td><td>' + esc(l.tributo) +
      '</td><td>' + esc(l.forma) + '</td><td class="num">' + esc(brl(l.valor)) + '</td></tr>').join('');
    const anosOrd = rs.porAno.map((x) => x.nome).filter((a) => a !== 'Sem ano');
    const periodo = anosOrd.length > 1 ? anosOrd[anosOrd.length - 1] + ' a ' + anosOrd[0] : (anosOrd[0] || '');
    const tipos = unicos(rs.linhas.map((l) => l.tipo));
    const bases = unicos(rs.linhas.map((l) => l.base));

    return '<section class="p-card"><h2>Renúncia fiscal declarada</h2>' +
      '<p class="p-big">' + esc(brl(rs.total)) + '</p>' +
      '<p class="p-note">Total renunciado em ' + plural(rs.linhas.length, 'registro', 'registros') +
        (periodo ? ' (' + esc(periodo) + ')' : '') + (rs.parcial ? ', mostrando ' + rs.linhas.length + ' de ' + rs.nTotal : '') + '</p>' +
      '<h3 class="p-sub">Por ano</h3>' + anos +
      '<h3 class="p-sub">Por benefício</h3>' + bens +
      '<h3 class="p-sub">Registros</h3>' +
      '<div class="p-table-wrap"><table class="p-table"><thead><tr><th>Ano</th><th>Benefício</th><th>Tributo</th><th>Forma</th><th class="num">Valor</th></tr></thead>' +
        '<tbody>' + corpo + '</tbody></table></div>' +
      '<p class="p-note p-note-gap">Valor renunciado é o imposto que o governo deixou de arrecadar por causa do benefício, e não dinheiro repassado à empresa.' +
        (tipos.length ? ' Tipo: ' + esc(tipos.join('; ')) + '.' : '') + ' Primeira página da consulta.</p>' +
      (bases.length ? '<details class="p-det"><summary>Base legal</summary><ul class="p-ul">' +
        bases.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul></details>' : '') +
      '</section>';
  }

  function govHtml(d) {
    const res = d.resultados || {};
    const sanc = [res.ceis, res.cnep, res.cepim];
    const nSanc = somaOk(sanc);
    let sancValor, sancCor, sancSub;
    if (nSanc > 0) { sancValor = plural(nSanc, 'registro', 'registros'); sancCor = 'danger'; sancSub = 'CEIS, CNEP ou CEPIM'; }
    else if (todosOk(sanc)) { sancValor = 'Nenhuma'; sancCor = 'ok'; sancSub = 'CEIS, CNEP e CEPIM'; }
    else { sancValor = 'Indisponível'; sancCor = 'muted'; sancSub = 'consulta falhou'; }

    const nContr = qtd(res.contratos);
    const nRec = qtd(res.recebido);
    const semRecebido = nContr === null && nRec === null;
    const recebidoValor = semRecebido ? 'Indisponível' : plural(nContr || 0, 'contrato', 'contratos');
    const jan = d.janelaRecursos ? d.janelaRecursos.de + ' a ' + d.janelaRecursos.ate : 'últimos 12 meses';
    const recebidoSub = nRec === null ? 'recursos: consulta falhou'
      : '1ª página · ' + plural(nRec, 'lançamento', 'lançamentos') + ' de recursos (' + jan + ')';

    const ren = [res.renunciaValores, res.imunesIsentas, res.habilitadas];
    const nRen = somaOk(ren);
    const rs = renunciaResumo(res.renunciaValores);
    const outrosRen = somaOk([res.imunesIsentas, res.habilitadas]);
    let renValor, renCor, renSub;
    if (rs) {
      renValor = brl(rs.total); renCor = 'warn';
      renSub = plural(rs.linhas.length, 'registro', 'registros') + ' de valores renunciados' +
        (outrosRen > 0 ? ' · mais ' + outrosRen + ' em imunidade ou benefício' : '');
    }
    else if (nRen > 0) { renValor = plural(nRen, 'registro', 'registros'); renCor = 'warn'; renSub = 'valores, imunidade/isenção ou benefício'; }
    else if (todosOk(ren)) { renValor = 'Nenhum'; renCor = ''; renSub = 'no Portal da Transparência'; }
    else { renValor = 'Indisponível'; renCor = 'muted'; renSub = 'consulta falhou'; }

    const anosPag = d.anosPagamentos || [];
    const pag = anosPag.map((a) => res['pagamentos' + a]);
    const anosComPag = pag.filter((r) => r && r.ok && r.itens.length > 0).length;
    let pagValor = 'Indisponível', pagSub = 'consulta falhou', pagCor = 'muted';
    if (anosPag.length && todosOk(pag)) {
      pagValor = anosComPag + ' de ' + anosPag.length + ' anos'; pagCor = anosComPag ? '' : 'muted';
      pagSub = 'com pagamento federal (' + anosPag[anosPag.length - 1] + ' a ' + anosPag[0] + ')';
    } else if (anosPag.length && pag.some((r) => r && r.ok)) {
      pagValor = anosComPag + ' de ' + anosPag.length + ' anos'; pagSub = 'algumas consultas falharam';
    }

    return '<div class="p-grid p-grid-3">' +
        metric('Recebido do governo', recebidoValor, recebidoSub, semRecebido ? 'muted' : '') +
        pendenteCard('Dívida ativa', 'PGFN') +
        metric('Sanções', sancValor, sancSub, sancCor) +
      '</div>' +
      '<div class="p-grid p-grid-3">' +
        metric('Renúncia fiscal e benefícios', renValor, renSub, renCor) +
        (anosPag.length ? metric('Pagamentos federais', pagValor, pagSub, pagCor) : '') +
      '</div>' +
      (d.doCache ? '<p class="p-note">Resultado guardado há menos de 6 horas.</p>' : '') +
      renunciaCard(rs) +
      govDetalhes(res, d.anosPagamentos);
  }

  function carregarGov(cnpj) {
    const alvo = $('gov-out');
    if (!alvo) return;

    if (typeof sb === 'undefined' || !sb.functions) {
      alvo.innerHTML = govPendente('Conexão com o Supabase não carregada nesta página.');
      return;
    }

    alvo.innerHTML = '<div class="p-grid p-grid-3">' +
      pendenteCard('Recebido do governo', 'consultando…') +
      pendenteCard('Dívida ativa', 'PGFN') +
      pendenteCard('Sanções', 'consultando…') + '</div>';

    sb.functions.invoke(FUNCAO_GOV, { body: { cnpj: cnpj } })
      .then((resp) => {
        if (resp.error) {
          const st = resp.error.context && resp.error.context.status;
          let motivo = 'a função ' + FUNCAO_GOV + ' não respondeu';
          if (!st && resp.error.name === 'FunctionsFetchError') {
            motivo = 'o navegador não conseguiu chamar a função (nome diferente, não publicada, chamada recusada ou erro ao iniciar). Veja os logs da função no Supabase';
          }
          if (st === 404) motivo = 'a função ' + FUNCAO_GOV + ' ainda não foi publicada no Supabase';
          else if (st === 401) motivo = 'o Supabase recusou a chamada (conferir a chave anon)';
          else if (st === 429) motivo = 'muitas consultas seguidas, tente em 1 minuto';
          else if (st === 500) motivo = 'a função está sem a chave do Portal (segredo PORTAL_TRANSPARENCIA_KEY)';
          else if (st) motivo = 'a função respondeu com erro ' + st;
          alvo.innerHTML = govPendente('Portal da Transparência indisponível: ' + motivo + '.');
          return;
        }
        alvo.innerHTML = govHtml(resp.data || {});
      })
      .catch(() => {
        alvo.innerHTML = govPendente('Portal da Transparência indisponível: falha de rede ao chamar a função.');
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
