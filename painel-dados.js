/* =========================================================
   painel-dados.js
   DADOS DE EXEMPLO. Nada aqui é dado oficial.
   Na etapa de carga (DGT, PGFN etc.) este arquivo é substituído
   por leituras do Supabase, mantendo o mesmo formato.
   Ordem de setores e incentivos precisa ser a mesma (o Panorama
   abre a Mesa pelo índice).
   ========================================================= */

window.PAINEL_DADOS = {
  origem: 'exemplo',

  /* Panorama: valores em R$ bi */
  renuncia: {
    ano: 2025,
    total: 520,
    peso: 22,
    serie: [['2021', 310], ['2022', 365], ['2023', 410], ['2024', 465], ['2025', 520]]
  },

  setores: [
    ['Simples Nacional', 98],
    ['Agronegócio', 61],
    ['Saúde', 45],
    ['Zona Franca', 29],
    ['Inovação', 12]
  ],

  /* Mesa: c = custo da renúncia (R$ bi/ano), e = empregos associados,
     r = retorno fiscal bruto (R$ bi/ano), a = adicionalidade inicial (%) */
  incentivos: [
    { n: 'Simples Nacional',     c: 98, e: 1200000, r: 170, a: 35 },
    { n: 'Agronegócio',          c: 61, e: 900000,  r: 50,  a: 50 },
    { n: 'Saúde',                c: 45, e: 700000,  r: 70,  a: 45 },
    { n: 'Zona Franca',          c: 29, e: 110000,  r: 60,  a: 50 },
    { n: 'Inovação (Lei do Bem)', c: 12, e: 60000,   r: 22,  a: 60 }
  ],

  /* Impostos: arrecadação em R$ bi */
  tributos: [
    ['Imposto de Renda', 960],
    ['Contrib. previdenciárias', 640],
    ['COFINS', 460],
    ['CSLL', 190],
    ['PIS/PASEP', 120],
    ['IPI', 80],
    ['Outros', 350]
  ],

  areas: [
    {
      nome: 'Saúde (SUS)', n: 'saúde', gasto: 250,
      regra: 'União aplica no mínimo 15% da receita corrente líquida em saúde.',
      fontes: [['Recursos ordinários', 140], ['Contrib. da seguridade', 90], ['Outras fontes', 20]]
    },
    {
      nome: 'Educação', n: 'educação', gasto: 140,
      regra: 'União aplica no mínimo 18% da receita de impostos em educação (confirmar antes de usar).',
      fontes: [['Recursos ordinários', 85], ['Salário-educação', 35], ['Outras fontes', 20]]
    }
  ],

  divida: {
    total: 'R$ 2,8 tri',
    atualizado: '2T/2026',
    itens: [
      ['Empresa Alfa S.A.', 'SP · Comércio', 'R$ 3,1 bi', 'Em cobrança', 'danger'],
      ['Grupo Beta Ltda', 'MG · Indústria', 'R$ 2,4 bi', 'Parcelada', 'warn'],
      ['Gama Transportes', 'RJ · Logística', 'R$ 1,7 bi', 'Em cobrança', 'danger']
    ]
  }
};
