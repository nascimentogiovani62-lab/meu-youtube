/* =========================================================
   painel-igrejas.js
   Módulo "Igrejas e redes" do painel fiscal.
   Dados: igrejas_ribeirao_preto.json (saída de extrair_igrejas_v2_1.py),
   na mesma pasta do painel.html. A dívida ativa vem da tabela pgfn_pj
   do Supabase, por raiz de CNPJ (só dívidas a partir de R$ 100 mil).
   Registro: window.PAINEL_IGREJAS(helpers) devolve { view, bind }.
   ========================================================= */

window.PAINEL_IGREJAS = function (H) {
  'use strict';

  const head = H.head, metric = H.metric, bar = H.bar, esc = H.esc;
  const fmt = H.fmt, plural = H.plural, $ = H.$, render = H.render;

  const ARQUIVO = 'igrejas_ribeirao_preto.json';
  const ARQ_TERR = 'territorio_rp.json';
  const ABAS = ['Panorama', 'Redes', 'Bairros', 'Território', 'Lista', 'Evolução', 'Sócios'];
  const POR_PAG = 30;
  const EV = 'Evangélica/protestante';
  const OUTRAS = ['Outras tradições', 'Judaica', 'Islâmica', 'Mórmon (SUD)', 'Adventista'];

  const M = { tab: 0, q: '', den: '', bai: '', pag: 0 };
  let L = null, R = [], FORA = 0, ERRO = '', INICIOU = false;
  let DIV = null, DIV_ERRO = false;
  let T = null, T_ERRO = false;

  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const moeda = (v) => 'R$ ' + fmt(v, 0);
  const pct = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '—');
  const cur = (s) => (s.length > 42 ? s.slice(0, 40) + '…' : s);

  function familia(d) {
    if (d === 'Católica' || d === 'Espírita' || d === 'Afro-brasileira' || d === 'A classificar') return d;
    return OUTRAS.indexOf(d) >= 0 ? 'Outras (inclui mórmon e adventista)' : EV;
  }

  function contar(lista, f) {
    const m = {};
    lista.forEach((x) => { const k = f(x); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map((k) => [k, m[k]]).sort((a, b) => b[1] - a[1]);
  }

  function agruparRedes() {
    const m = {};
    L.forEach((x) => {
      const r = m[x.raiz] || (m[x.raiz] = { raiz: x.raiz, nome: x.razao_social, n: 0, b: {} });
      r.n++; r.b[x.bairro] = 1;
    });
    return Object.keys(m).map((k) => { const r = m[k]; r.nb = Object.keys(r.b).length; return r; })
      .sort((a, b) => b.n - a.n);
  }

  /* ---------- carga de dados ---------- */

  function iniciar() {
    if (INICIOU) return;
    INICIOU = true;
    fetch(ARQ_TERR)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => { T = j; render(); })
      .catch(() => { T_ERRO = true; render(); });
    fetch(ARQUIVO)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => {
        L = j.filter((x) => !x.fora_do_escopo).map((x) => Object.assign({}, x, {
          fam: familia(x.denominacao),
          busca: norm([x.razao_social, x.nome_fantasia, x.bairro, x.cnpj, x.cnpj14].join(' '))
        }));
        FORA = j.length - L.length;
        R = agruparRedes();
        render();
        carregarDivida();
      })
      .catch((e) => { ERRO = (e && e.message) || 'erro'; render(); });
  }

  function carregarDivida() {
    if (typeof sb === 'undefined' || !sb.from) { DIV_ERRO = true; return; }
    const raizes = R.map((r) => r.raiz), partes = [];
    for (let i = 0; i < raizes.length; i += 150) partes.push(raizes.slice(i, i + 150));
    Promise.all(partes.map((p) =>
      sb.from('pgfn_pj').select('cnpj_basico,valor_principal,qtd_principal').in('cnpj_basico', p).limit(1000)
        .then((r) => { if (r.error) throw r.error; return r.data || []; })
    )).then((blocos) => {
      const d = {};
      blocos.forEach((b) => b.forEach((l) => {
        const o = d[l.cnpj_basico] || (d[l.cnpj_basico] = { valor: 0, qtd: 0 });
        o.valor += Number(l.valor_principal) || 0;
        o.qtd += Number(l.qtd_principal) || 0;
      }));
      DIV = d;
      render();
    }).catch(() => { DIV_ERRO = true; render(); });
  }

  /* ---------- abas ---------- */

  function pPanorama() {
    const n = L.length, ev = L.filter((x) => x.fam === EV).length;
    const top5 = R.slice(0, 5).reduce((s, r) => s + r.n, 0);
    const uni = R.filter((r) => r.n === 1).length;
    const nBairros = contar(L, (x) => x.bairro).length;
    const fam = contar(L, (x) => x.fam);
    let dv;
    if (DIV) {
      const ks = Object.keys(DIV), tot = ks.reduce((s, k) => s + DIV[k].valor, 0);
      dv = metric('Dívida ativa (PGFN)', ks.length ? moeda(tot) : 'Nenhuma',
        plural(ks.length, 'raiz', 'raízes') + ' com dívida acima de R$ 100 mil', ks.length ? 'danger' : '');
    } else {
      dv = metric('Dívida ativa (PGFN)', DIV_ERRO ? 'Indisponível' : 'Consultando…',
        DIV_ERRO ? 'Supabase não carregado' : 'cruzamento por raiz de CNPJ', 'muted');
    }
    return '<div class="p-grid p-grid-3">' +
        metric('Unidades ativas', fmt(n), plural(R.length, 'raiz de CNPJ', 'raízes de CNPJ')) +
        metric('Evangélicas e protestantes', pct(ev, n), plural(ev, 'unidade', 'unidades')) +
        metric('Cinco maiores redes', pct(top5, n), 'das unidades') +
      '</div><div class="p-grid p-grid-3">' +
        metric('Raízes com 1 unidade', pct(uni, R.length), 'igrejas autônomas') +
        metric('Bairros', fmt(nBairros), 'com ao menos uma unidade') + dv +
      '</div><section class="p-card"><h2>Por família religiosa</h2>' +
        fam.map((f) => bar(f[0] + ' (' + pct(f[1], n) + ')', f[1], fam[0][1], fmt(f[1]), '', 'p-bar-wide')).join('') +
        '<p class="p-note">A Igreja Católica tem poucos CNPJs, mas cada paróquia é grande: contar unidades não mede alcance.</p></section>';
  }

  function pRedes() {
    const top = R.slice(0, 15);
    const barras = top.map((r) =>
      bar(cur(r.nome) + ' · ' + plural(r.nb, 'bairro', 'bairros'), r.n, top[0].n, fmt(r.n) + ' un.', '', 'p-bar-wide')).join('');
    let tabela = '';
    if (DIV) {
      const com = R.filter((r) => DIV[r.raiz]).sort((a, b) => DIV[b.raiz].valor - DIV[a.raiz].valor).slice(0, 10);
      if (com.length) {
        tabela = '<h3 class="p-sub">Maiores dívidas ativas (por raiz de CNPJ)</h3><div class="p-table-wrap"><table class="p-table">' +
          '<thead><tr><th>Entidade</th><th class="num">Unidades</th><th class="num">Dívida (PGFN)</th></tr></thead><tbody>' +
          com.map((r) => '<tr><td>' + esc(r.nome) + '</td><td class="num">' + fmt(r.n) + '</td><td class="num">' +
            esc(moeda(DIV[r.raiz].valor)) + '</td></tr>').join('') + '</tbody></table></div>' +
          '<p class="p-note p-note-gap">Soma dos CNPJs da raiz que a base da PGFN guarda (só dívidas a partir de R$ 100 mil). ' +
          'Dívida inscrita não é prova de irregularidade: pode estar garantida, suspensa ou em negociação.</p>';
      }
    }
    return '<h2>Maiores redes por raiz de CNPJ</h2>' + barras +
      '<p class="p-note">Rede aqui é a raiz do CNPJ (critério legal). Ministérios com o mesmo nome e raízes diferentes não são somados, e o controle econômico só o quadro societário mostra.</p>' + tabela;
  }

  function pBairros() {
    const b = contar(L, (x) => x.bairro).slice(0, 15);
    return '<h2>Bairros com mais unidades</h2>' +
      b.map((x) => bar(x[0], x[1], b[0][1], fmt(x[1]), '', 'p-bar-wide')).join('') +
      '<p class="p-note">Contagem absoluta. Sem a população de cada bairro (Censo 2022), não dá para dizer se há mais templos ou só mais gente. ' +
      'Os nomes foram padronizados a partir do campo livre da Receita; a lista oficial da Prefeitura ainda não foi aplicada.</p>';
  }

  function filtrar() {
    const q = norm(M.q), d = q.replace(/\D/g, '');
    return L.filter((x) =>
      (!M.den || x.denominacao === M.den) && (!M.bai || x.bairro === M.bai) &&
      (!q || x.busca.indexOf(q) >= 0 || (d.length >= 4 && x.cnpj14.indexOf(d) >= 0))
    ).sort((a, b) => a.razao_social.localeCompare(b.razao_social, 'pt-BR'));
  }

  function listaHtml() {
    const r = filtrar(), tp = Math.max(1, Math.ceil(r.length / POR_PAG));
    if (M.pag >= tp) M.pag = 0;
    const itens = r.slice(M.pag * POR_PAG, (M.pag + 1) * POR_PAG).map((x) => {
      const nome = x.nome_fantasia && x.nome_fantasia !== 'Não informado' ? x.nome_fantasia : x.razao_social;
      const d = DIV && DIV[x.raiz] ? moeda(DIV[x.raiz].valor) : (DIV ? 'Nenhuma acima de R$ 100 mil' : '—');
      const campos = [
        ['Razão social', x.razao_social], ['CNPJ', x.cnpj], ['Denominação', x.denominacao],
        ['Endereço', x.logradouro ? x.logradouro + (x.numero ? ', ' + x.numero : '') : 'Omitido (tradição minoritária)'],
        ['Bairro', x.bairro], ['CEP', x.cep || '—'], ['Início do CNPJ', x.ano_inicio],
        ['Tipo', x.matriz ? 'Matriz' : 'Filial'], ['Dívida ativa da raiz (PGFN)', d]
      ];
      return '<details class="p-det"><summary>' + esc(nome) + ' · ' + esc(x.bairro || '—') + '</summary><dl class="p-dl p-dl-sm">' +
        campos.map((c) => '<div><dt>' + esc(c[0]) + '</dt><dd>' + esc(c[1] == null ? '—' : c[1]) + '</dd></div>').join('') + '</dl></details>';
    }).join('');
    return '<p class="p-note">' + plural(r.length, 'resultado', 'resultados') + '</p>' +
      (itens || '<p class="p-msg">Nada encontrado.</p>') +
      '<div class="p-toolbar"><button type="button" class="p-tab" data-pag="' + (M.pag - 1) + '"' + (M.pag === 0 ? ' disabled' : '') + '>Anterior</button>' +
      '<span class="p-note">Página ' + (M.pag + 1) + ' de ' + tp + '</span>' +
      '<button type="button" class="p-tab" data-pag="' + (M.pag + 1) + '"' + (M.pag + 1 >= tp ? ' disabled' : '') + '>Próxima</button></div>';
  }

  function pLista() {
    const dens = contar(L, (x) => x.denominacao).map((x) => x[0]).sort();
    const bais = contar(L, (x) => x.bairro).map((x) => x[0]).sort();
    const opt = (v, sel, t) => '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(t) + '</option>';
    return '<h2>Lista de unidades</h2><div class="p-toolbar">' +
        '<input class="p-input p-input-sm" id="ig-q" type="search" placeholder="Nome, bairro, rua ou CNPJ" value="' + esc(M.q) + '" aria-label="Buscar">' +
        '<select class="p-input p-input-sm" id="ig-den" aria-label="Denominação">' + opt('', M.den, 'Todas as denominações') + dens.map((d) => opt(d, M.den, d)).join('') + '</select>' +
        '<select class="p-input p-input-sm" id="ig-bai" aria-label="Bairro">' + opt('', M.bai, 'Todos os bairros') + bais.map((b) => opt(b, M.bai, b)).join('') + '</select>' +
      '</div><div id="ig-out">' + listaHtml() + '</div>';
  }

  function pEvolucao() {
    const dec = {};
    L.filter((x) => x.ano_inicio).forEach((x) => {
      const d = Math.floor(x.ano_inicio / 10) * 10, o = dec[d] || (dec[d] = { n: 0, ev: 0 });
      o.n++; if (x.fam === EV) o.ev++;
    });
    const ks = Object.keys(dec).sort(), max = Math.max.apply(null, ks.map((k) => dec[k].n));
    return '<h2>CNPJs abertos por década</h2><div class="p-cols">' +
        ks.map((k) => '<div class="p-col"><div class="p-col-bar" style="height:' + Math.round((dec[k].n / max) * 100) + '%"></div><span>' + k + 's</span></div>').join('') +
      '</div><h3 class="p-sub">Fatia evangélica e protestante entre as aberturas</h3>' +
      ks.map((k) => bar(k + 's', dec[k].ev, dec[k].n, pct(dec[k].ev, dec[k].n), '', 'p-bar-wide')).join('') +
      '<p class="p-note p-note-gap">Esta série mede formalização, não crescimento: só aparecem CNPJs ativos hoje, igrejas costumam funcionar anos antes de se formalizar, ' +
      'e a data de uma filial não é a data de chegada da rede à cidade. Use como pista, não como resultado.</p>';
  }

  function pSocios() {
    return '<h2>Quadro societário</h2><div class="p-grid p-grid-2">' +
      '<div class="p-metric p-metric-off"><p class="p-metric-label">Administradores e sócios</p><p class="p-metric-value muted">Não conectado</p>' +
      '<p class="p-metric-sub">Receita Federal, tabela de sócios</p></div>' +
      '<div class="p-metric p-metric-off"><p class="p-metric-label">Pessoas em mais de uma entidade</p><p class="p-metric-value muted">Não conectado</p>' +
      '<p class="p-metric-sub">cruzamento por nome e dígitos do CPF</p></div></div>' +
      '<p class="p-note p-note-gap">Quando conectado, mostra quem administra cada rede e quais pessoas aparecem em mais de uma entidade. ' +
      'O CPF vem mascarado e há risco de homônimos, então cada ligação é "a verificar". Nomes de pessoas físicas só entram depois de revisão jurídica.</p>';
  }


  /* ---------- território: templos x renda por subsetor (IBGE, Censo 2022) ---------- */

  const soma = (a, k) => a.reduce((s, x) => s + x[k], 0);

  function dispersao(S) {
    const W = 560, Ht = 290, mx = 46, my = 14, xm = 17000, ym = 50;
    const X = (v) => mx + (v / xm) * (W - mx - 12);
    const Y = (v) => Ht - 40 - (v / ym) * (Ht - 40 - my);
    const grade = [0, 10, 20, 30, 40, 50].map((v) =>
      '<line x1="' + mx + '" x2="' + (W - 12) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/>' +
      '<text x="' + (mx - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--ink-dim)">' + v + '</text>').join('');
    const xs = [2000, 5000, 8000, 11000, 14000, 17000].map((v) =>
      '<text x="' + X(v) + '" y="' + (Ht - 22) + '" text-anchor="middle" font-size="11" fill="var(--ink-dim)">' + fmt(v / 1000) + ' mil</text>').join('');
    const bolas = S.filter((s) => s.pop >= 3000).map((s) => {
      const y = (s.templos / s.pop) * 1e4;
      return '<circle cx="' + X(s.renda) + '" cy="' + Y(Math.min(y, ym)) + '" r="' + (3 + Math.sqrt(s.pop) / 40).toFixed(1) +
        '" fill="var(--accent)" fill-opacity="0.55" stroke="var(--accent)"><title>' + esc(s.nome) + ': ' + fmt(y, 1) +
        ' templos por 10 mil moradores, renda média R$ ' + fmt(s.renda) + '</title></circle>';
    }).join('');
    return '<div class="p-table-wrap"><svg viewBox="0 0 ' + W + ' ' + Ht + '" role="img" style="width:100%;min-width:420px;height:auto" ' +
      'aria-label="Dispersão: renda média do responsável contra templos por 10 mil moradores, por subsetor">' + grade + xs + bolas +
      '<text x="' + (mx + (W - mx - 12) / 2) + '" y="' + (Ht - 4) + '" text-anchor="middle" font-size="11" fill="var(--ink-dim)">Renda média do responsável (R$ por mês)</text>' +
      '<text transform="rotate(-90 11 ' + (Ht / 2 - 10) + ')" x="11" y="' + (Ht / 2 - 10) + '" text-anchor="middle" font-size="11" fill="var(--ink-dim)">Templos por 10 mil moradores</text></svg></div>';
  }

  function pTerritorio() {
    if (T_ERRO) return '<p class="p-msg erro">Não consegui carregar ' + esc(ARQ_TERR) + '. Confira se o arquivo está na mesma pasta do painel.html.</p>';
    if (!T) return '<p class="p-msg">Carregando…</p>';
    const S = T.subsetores, F = [1, 2, 3, 4, 5];
    const faixa = (k) => S.filter((s) => s.q === k);
    const taxa = (campo, k) => (soma(faixa(k), campo) / soma(faixa(k), 'pop')) * 1e4;
    const tt = F.map((k) => taxa('templos', k)), max = Math.max.apply(null, tt);
    const rot = (f) => 'R$ ' + fmt(f.renda_min / 1000, 1) + ' a ' + fmt(f.renda_max / 1000, 1) + ' mil';
    const barras = T.faixas.map((f, i) =>
      bar('Faixa ' + f.q + (f.q === 1 ? ' (mais pobre)' : f.q === 5 ? ' (mais rica)' : '') + ' · ' + rot(f), tt[i], max, fmt(tt[i], 1), '', 'p-bar-wide')).join('');
    const linhas = [['Templos', 'templos'], ['Comércio e outras finalidades', 'outros'], ['Ensino', 'ensino'], ['Saúde (inclui clínicas privadas)', 'saude']]
      .map((r) => {
        const a = taxa(r[1], 1), b = taxa(r[1], 5);
        return '<tr><td>' + esc(r[0]) + '</td><td class="num">' + fmt(a, 1) + '</td><td class="num">' + fmt(b, 1) + '</td><td class="num">' + fmt(a / b, 2) + '×</td></tr>';
      }).join('');
    const top = S.filter((s) => s.pop >= 3000).map((s) => Object.assign({ r: (s.templos / s.pop) * 1e4 }, s))
      .sort((a, b) => b.r - a.r).slice(0, 8);
    const tabTop = top.map((s) => '<tr><td>' + esc(s.nome) + '</td><td class="num">' + fmt(s.pop) + '</td><td class="num">' + fmt(s.templos) +
      '</td><td class="num">' + fmt(s.r, 1) + '</td><td class="num">R$ ' + fmt(s.renda) + '</td></tr>').join('');
    return '<div class="p-grid p-grid-3">' +
        metric('Faixa mais pobre', fmt(tt[0], 1), 'templos por 10 mil moradores') +
        metric('Faixa mais rica', fmt(tt[4], 1), 'templos por 10 mil moradores') +
        metric('Razão entre as faixas', fmt(tt[0] / tt[4], 1) + '×', 'faixa 1 contra faixa 5', 'warn') +
      '</div><section class="p-card"><h2>Templos por 10 mil moradores, por faixa de renda</h2>' + barras +
        '<p class="p-note">Cada faixa tem cerca de 20% dos moradores, ordenados pela renda média do responsável pelo domicílio. A curva não é uma reta: a faixa 3 tem mais templos que a 2.</p></section>' +
      '<section class="p-card"><h2>Os outros estabelecimentos se concentram do mesmo jeito?</h2>' +
        '<div class="p-table-wrap"><table class="p-table"><thead><tr><th>Tipo (por 10 mil moradores)</th><th class="num">Faixa 1</th><th class="num">Faixa 5</th><th class="num">Razão</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
        '<p class="p-note p-note-gap">Razão acima de 1 significa mais densidade na faixa mais pobre. Só os templos são bem mais densos ali; comércio, ensino e saúde são mais raros. A espécie "saúde" do CNEFE inclui consultórios privados, então não mede acesso a postos públicos.</p></section>' +
      '<section class="p-card"><h2>Cada subsetor</h2>' + dispersao(S) +
        '<p class="p-note">Cada bolinha é um subsetor com 3 mil moradores ou mais, e o tamanho acompanha a população. Passe o mouse para ver o nome.</p>' +
        '<h3 class="p-sub">Maiores densidades (3 mil moradores ou mais)</h3><div class="p-table-wrap"><table class="p-table"><thead><tr><th>Subsetor</th><th class="num">Moradores</th><th class="num">Templos</th><th class="num">Por 10 mil</th><th class="num">Renda média</th></tr></thead><tbody>' + tabTop + '</tbody></table></div></section>' +
      '<p class="p-note">Fonte: ' + esc(T.fonte) + '. Os ' + fmt(T.subsetores.length) + ' subsetores somam ' + fmt(T.populacaoSubsetores) + ' moradores de ' + fmt(T.populacaoMunicipio) + ' no município. ' +
        fmt(T.templosForaDosSubsetores) + ' dos ' + fmt(T.templosCnefe) + ' estabelecimentos religiosos ficam fora dos subsetores (distritos e zona rural). ' +
        'Isto mostra onde os templos estão, e não por quê: pode refletir aluguel mais barato ou igrejas pequenas em salas comerciais. O campo de renda e os códigos de espécie ainda precisam ser conferidos no dicionário do IBGE.</p>';
  }

  function corpo() {
    const aba = ABAS[M.tab];
    if (aba === 'Panorama') return pPanorama();
    if (aba === 'Território') return pTerritorio();
    if (aba === 'Redes') return '<section class="p-card">' + pRedes() + '</section>';
    if (aba === 'Bairros') return '<section class="p-card">' + pBairros() + '</section>';
    if (aba === 'Lista') return '<section class="p-card">' + pLista() + '</section>';
    if (aba === 'Evolução') return '<section class="p-card">' + pEvolucao() + '</section>';
    return '<section class="p-card">' + pSocios() + '</section>';
  }

  /* ---------- rota ---------- */

  function view() {
    iniciar();
    const topo = head('Igrejas e redes',
      'Organizações religiosas ativas em Ribeirão Preto (CNAE 9491-0/00 ou natureza jurídica religiosa), do cadastro da Receita Federal.',
      false, 'Receita · 2026-10');
    if (ERRO) return topo + '<div class="p-card p-msg erro">Não consegui carregar ' + esc(ARQUIVO) + ' (' + esc(ERRO) + '). Confira se o arquivo está na mesma pasta do painel.html.</div>';
    if (!L) return topo + '<div class="p-card p-msg">Carregando…</div>';
    return topo + '<div class="p-toolbar"><div class="p-tabs" role="group" aria-label="Visão das igrejas">' +
        ABAS.map((n, i) => '<button type="button" class="p-tab" data-ig="' + i + '" aria-pressed="' + (i === M.tab) + '">' + esc(n) + '</button>').join('') +
      '</div></div><div id="ig-corpo">' + corpo() + '</div>' +
      '<p class="p-note">Fonte: Receita Federal, dados abertos do CNPJ (2026-10). Unidade é um CNPJ ativo com endereço: não é o mesmo que templo nem que número de fiéis, e capelas sem CNPJ próprio não aparecem. ' +
      plural(FORA, 'registro', 'registros') + ' fora do escopo (lojas maçônicas e hospitais) ficaram de fora.</p>';
  }

  function bind() {
    document.querySelectorAll('.p-tab[data-ig]').forEach((b) => {
      b.addEventListener('click', () => { M.tab = Number(b.getAttribute('data-ig')); render(); });
    });
    if (!L || ABAS[M.tab] !== 'Lista') return;
    const atualizar = () => { $('ig-out').innerHTML = listaHtml(); };
    $('ig-q').addEventListener('input', function () { M.q = this.value; M.pag = 0; atualizar(); });
    $('ig-den').addEventListener('change', function () { M.den = this.value; M.pag = 0; atualizar(); });
    $('ig-bai').addEventListener('change', function () { M.bai = this.value; M.pag = 0; atualizar(); });
    $('ig-out').addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('[data-pag]') : null;
      if (!b || b.disabled) return;
      M.pag = Number(b.getAttribute('data-pag')); atualizar();
    });
  }

  return { view: view, bind: bind };
};

