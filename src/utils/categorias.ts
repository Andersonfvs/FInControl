import { CategoriaCustomizada } from '@/types';

// ─────────────────────────────────────────────────────────────
// ÍCONES DE CATEGORIAS
// ─────────────────────────────────────────────────────────────

const MAPA_ICONES: { palavras: string[]; icone: string }[] = [
  { palavras: ['alimentação', 'alimentacao', 'comida', 'refeição', 'refeicao', 'lanche', 'restaurante', 'pizza', 'hamburguer', 'delivery', 'ifood', 'café', 'cafe', 'almoço', 'almoco', 'jantar'], icone: '🍕' },
  { palavras: ['transporte', 'ônibus', 'onibus', 'uber', 'taxi', '99', 'combustível', 'combustivel', 'gasolina', 'metrô', 'metro', 'passagem', 'estacionamento'], icone: '🚗' },
  { palavras: ['supermercado', 'mercado', 'feira', 'hortifruti'], icone: '🛒' },
  { palavras: ['moradia', 'aluguel', 'condomínio', 'condominio', 'iptu', 'casa', 'apartamento'], icone: '🏠' },
  { palavras: ['luz', 'água', 'agua', 'energia', 'conta', 'internet', 'telefone', 'celular', 'gás', 'gas'], icone: '💡' },
  { palavras: ['saúde', 'saude', 'farmácia', 'farmacia', 'médico', 'medico', 'hospital', 'plano', 'remédio', 'remedio', 'consulta', 'dentista'], icone: '💊' },
  { palavras: ['educação', 'educacao', 'escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'universidade'], icone: '🎓' },
  { palavras: ['roupa', 'roupas', 'vestuário', 'vestuario', 'calçado', 'calcado', 'loja', 'shopping', 'compras'], icone: '🛍️' },
  { palavras: ['lazer', 'diversão', 'diversao', 'cinema', 'viagem', 'hotel', 'festa', 'bar', 'passeio', 'streaming', 'netflix', 'spotify', 'show', 'teatro'], icone: '🎉' },
  { palavras: ['seguro', 'seguros'], icone: '🛡️' },
  { palavras: ['cartão', 'cartao', 'crédito', 'credito', 'fatura'], icone: '💳' },
  { palavras: ['salário', 'salario', 'renda', 'receita', 'freelance', 'freela', 'trabalho', 'pagamento recebido'], icone: '💰' },
  { palavras: ['academia', 'ginásio', 'ginasio', 'fitness', 'musculação', 'musculacao'], icone: '🏋️' },
  { palavras: ['pet', 'veterinário', 'veterinario', 'animal', 'cachorro', 'gato', 'ração', 'racao'], icone: '🐾' },
  { palavras: ['presente', 'gift'], icone: '🎁' },
  { palavras: ['beleza', 'cabelo', 'salão', 'salao', 'manicure', 'estética', 'estetica'], icone: '✂️' },
];

export function obterIconeCategoria(categoria: string): string {
  if (!categoria) return '🏷️';
  const nome = categoria.toLowerCase().trim();
  for (const { palavras, icone } of MAPA_ICONES) {
    if (palavras.some(p => nome.includes(p))) return icone;
  }
  return '🏷️';
}

export function obterCategoriaComIcone(categoria: string): string {
  const icone = obterIconeCategoria(categoria);
  return `${icone} ${categoria}`;
}

// ─────────────────────────────────────────────────────────────
// INPUT MÁGICO — PARSER DE LINGUAGEM NATURAL
// ─────────────────────────────────────────────────────────────

export interface DadosInputMagico {
  valor: number;
  descricao: string;
  data: string;
  pessoa: string;
  categoria: string;
  tipo: 'despesa' | 'renda';
  metodoPagamento?: 'dinheiro' | 'cartao';
  cartaoId?: string;
  cartaoNome?: string;
  pago: boolean;
  parcelas?: number;
}

// ─── Vocabulário fixo expandido ───────────────────────────────────────────────
// Inclui variações regionais, marcas e sinônimos comuns
const MAPA_CATEGORIAS_PALAVRAS: { palavras: string[]; categoria: string }[] = [
  {
    palavras: [
      'lanche', 'comida', 'pizza', 'hamburguer', 'almoço', 'almoco', 'jantar',
      'cafe', 'ifood', 'delivery', 'restaurante', 'mercadao', 'mc', 'mcdonalds',
      'burguer', 'rancho', 'hortifruti', 'padaria', 'açougue', 'acougue',
      'churrasco', 'sushi', 'lanchonete', 'sorveteria', 'brigadeiro',
    ],
    categoria: 'Alimentação',
  },
  {
    palavras: [
      'onibus', 'ônibus', 'uber', 'taxi', 'combustivel', 'gasolina', 'transporte',
      'metro', 'passagem', '99', 'etanol', 'posto', 'shell', 'ipiranga', 'br dist',
      'estacionamento', 'pedagio', 'pedágio', 'bicicleta', 'patinete', 'moto',
    ],
    categoria: 'Transporte',
  },
  {
    palavras: [
      'mercado', 'supermercado', 'feira', 'extra', 'carrefour', 'pao de acucar',
      'atacadao', 'assai', 'atakarejo', 'dia', 'sonda', 'prezunic', 'mundial',
    ],
    categoria: 'Alimentação',
  },
  {
    palavras: ['aluguel', 'condominio', 'iptu', 'moradia', 'alugel'],
    categoria: 'Moradia',
  },
  {
    palavras: [
      'luz', 'agua', 'energia', 'internet', 'telefone', 'celular', 'gas',
      'conta de', 'copel', 'cemig', 'eletropaulo', 'enel', 'sabesp', 'cedae',
      'claro', 'vivo', 'tim', 'oi', 'net', 'nextel', 'sky', 'starlink',
    ],
    categoria: 'Serviços',
  },
  {
    palavras: [
      'farmacia', 'remedio', 'medico', 'hospital', 'consulta', 'saude',
      'dentista', 'plano', 'drogaria', 'ultrafarma', 'droga raia', 'pacheco',
      'unimed', 'amil', 'bradesco saude', 'hapvida', 'clinica', 'exame',
      'laboratorio', 'fisioterapia', 'psicologo', 'psiquiatra', 'nutricionista',
    ],
    categoria: 'Saúde',
  },
  {
    palavras: [
      'escola', 'faculdade', 'curso', 'livro', 'educacao', 'mensalidade',
      'universidade', 'colegio', 'material escolar', 'apostila', 'certificado',
    ],
    categoria: 'Educação',
  },
  {
    palavras: [
      'roupa', 'sapato', 'shopping', 'loja', 'vestuario', 'calcado',
      'renner', 'riachuelo', 'cea', 'hm', 'zara', 'forever', 'marisa',
      'camiseta', 'calca', 'tenis', 'sandalia', 'bolsa', 'mala',
    ],
    categoria: 'Vestuário',
  },
  {
    palavras: [
      'cinema', 'netflix', 'spotify', 'lazer', 'festa', 'bar', 'viagem',
      'show', 'disney', 'hbo', 'globoplay', 'amazon prime', 'apple tv',
      'teatro', 'parque', 'hotel', 'pousada', 'airbnb', 'ingresso',
      'jogo', 'game', 'playstation', 'xbox', 'steam',
    ],
    categoria: 'Lazer',
  },
  {
    palavras: [
      'academia', 'ginasio', 'musculacao', 'smartfit', 'bodytech',
      'bluefit', 'crossfit', 'pilates', 'yoga', 'natacao',
    ],
    categoria: 'Saúde',
  },
  {
    palavras: ['salario', 'salário', 'freelance', 'freela'],
    categoria: 'Salário',
  },
  {
    palavras: [
      'shopee', 'mercado livre', 'amazon', 'aliexpress', 'americanas',
      'submarino', 'kabum', 'magalu', 'magazine', 'casas bahia',
    ],
    categoria: 'Compras Online',
  },
  {
    palavras: [
      'pet', 'veterinario', 'racao', 'cobasi', 'petz', 'cachorro',
      'gato', 'animal', 'banho tosa',
    ],
    categoria: 'Outras Despesas',
  },
  {
    palavras: [
      'beleza', 'cabelo', 'salao', 'manicure', 'pedicure', 'estetica',
      'barbearia', 'depilacao', 'maquiagem', 'perfume',
    ],
    categoria: 'Outras Despesas',
  },
];

const CARTOES_CONHECIDOS: { [key: string]: string } = {
  'nubank': 'Nubank',
  'nu': 'Nubank',
  'inter': 'Inter',
  'c6': 'C6 Bank',
  'itau': 'Itaú',
  'itaú': 'Itaú',
  'bradesco': 'Bradesco',
  'santander': 'Santander',
  'caixa': 'Caixa',
  'bb': 'Banco do Brasil',
  'sicoob': 'Sicoob',
  'sicredi': 'Sicredi',
};

function buscarCartaoPorNome(resto: string, cartoesDisponiveis: any[]): { cartaoId: string; cartaoNome: string; restoAtualizado: string } | null {
  for (const cartao of cartoesDisponiveis) {
    const nomeCartaoLower = cartao.nome.toLowerCase();
    const palavrasCartao = nomeCartaoLower.split(/\s+/);
    const achou = palavrasCartao.some((p: string) => p.length > 2 && resto.includes(p));
    if (achou) {
      let restoAtualizado = resto;
      palavrasCartao.forEach((p: string) => {
        if (p.length > 2) restoAtualizado = restoAtualizado.replace(p, '').trim();
      });
      return { cartaoId: cartao.id, cartaoNome: cartao.nome, restoAtualizado };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL DO PARSER
// Parâmetros:
//   input               — texto digitado pelo usuário
//   usuarioNome         — nome do usuário logado
//   cartoesDisponiveis  — cartões cadastrados no Firebase (para match de cartão)
//   categoriasCustomizadas — categorias do usuário com palavrasChave (cache em memória)
// ─────────────────────────────────────────────────────────────
export function parsearInputMagico(
  input: string,
  usuarioNome: string,
  cartoesDisponiveis?: any[],
  categoriasCustomizadas?: CategoriaCustomizada[],
): DadosInputMagico | null {
  const texto = input.trim();
  if (!texto) return null;

  const textoLower = texto.toLowerCase();

  // ── 1. Extrair valor ──────────────────────────────────────
  const regexValor = /(\d+(?:[.,]\d{1,2})?)/;
  const matchValor = textoLower.match(regexValor);
  if (!matchValor) return null;

  const valor = parseFloat(matchValor[1].replace(',', '.'));
  if (isNaN(valor) || valor <= 0) return null;

  let resto = textoLower.replace(matchValor[1], '').trim();

  // ── 2. Extrair data ───────────────────────────────────────
  let data = new Date().toISOString().split('T')[0];

  if (resto.includes('ontem')) {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    data = ontem.toISOString().split('T')[0];
    resto = resto.replace('ontem', '').trim();
  } else if (resto.includes('hoje')) {
    resto = resto.replace('hoje', '').trim();
  } else {
    const regexData = /(\d{1,2})[\/\-](\d{1,2})/;
    const matchData = resto.match(regexData);
    if (matchData) {
      const dia = parseInt(matchData[1]);
      const mes = parseInt(matchData[2]) - 1;
      const ano = new Date().getFullYear();
      const dataObj = new Date(ano, mes, dia);
      if (!isNaN(dataObj.getTime())) {
        data = dataObj.toISOString().split('T')[0];
        resto = resto.replace(matchData[0], '').trim();
      }
    }
  }

  // ── 3. Extrair pessoa ─────────────────────────────────────
  let pessoa = usuarioNome;
  if (resto.includes('anderson')) {
    pessoa = 'Anderson Ferreira';
    resto = resto.replace(/anderson(\s+ferreira)?/, '').trim();
  } else if (resto.includes('evelin')) {
    pessoa = 'Evelin Mulbaier';
    resto = resto.replace(/evelin(\s+mulbaier)?/, '').trim();
  }

  // ── 4. Detectar RECEITA explícita ─────────────────────────
  const forcaReceita = resto.includes('receita') || resto.includes('renda') || resto.includes('salario') || resto.includes('salário');
  if (forcaReceita) {
    resto = resto.replace(/receita|renda|salario|salário/g, '').trim();
  }

  // ── 5. Extrair PARCELAS — ex: "3x", "12x" ─────────────────
  let parcelas: number | undefined;
  const regexParcelas = /(\d+)\s*x\b/;
  const matchParcelas = resto.match(regexParcelas);
  if (matchParcelas) {
    const n = parseInt(matchParcelas[1]);
    if (n > 1 && n <= 72) parcelas = n;
    resto = resto.replace(matchParcelas[0], '').trim();
  }

  // ── 6. Detectar método de pagamento ───────────────────────
  let metodoPagamento: 'dinheiro' | 'cartao' = 'dinheiro';
  let cartaoId: string | undefined;
  let cartaoNome: string | undefined;
  let pago = true;

  const temCredito = resto.includes('credito') || resto.includes('crédito') || resto.includes('cartao') || resto.includes('cartão');

  if (temCredito) {
    metodoPagamento = 'cartao';
    pago = false;
    resto = resto.replace(/credito|crédito|cartao|cartão/g, '').trim();

    // PASSO 1: mapa fixo de cartões conhecidos (nubank, inter, etc.)
    for (const [palavra, nomeCartao] of Object.entries(CARTOES_CONHECIDOS)) {
      if (resto.includes(palavra)) {
        cartaoNome = nomeCartao;
        resto = resto.replace(palavra, '').trim();
        if (cartoesDisponiveis) {
          const encontrado = cartoesDisponiveis.find((c: any) =>
            c.nome.toLowerCase().includes(palavra) ||
            nomeCartao.toLowerCase().includes(c.nome.toLowerCase())
          );
          if (encontrado) { cartaoId = encontrado.id; cartaoNome = encontrado.nome; }
        }
        break;
      }
    }

    // PASSO 2: busca pelo nome exato do cartão cadastrado (ex: "Riachuelo", "XP", etc.)
    if (!cartaoId && cartoesDisponiveis) {
      const resultado = buscarCartaoPorNome(resto, cartoesDisponiveis);
      if (resultado) {
        cartaoId = resultado.cartaoId;
        cartaoNome = resultado.cartaoNome;
        resto = resultado.restoAtualizado;
      }
    }

    // PASSO 3: se só tem 1 cartão cadastrado, usa ele automaticamente
    if (!cartaoId && cartoesDisponiveis && cartoesDisponiveis.length === 1) {
      cartaoId = cartoesDisponiveis[0].id;
      cartaoNome = cartoesDisponiveis[0].nome;
    }
  }

  // Se tem parcelas mas não detectou crédito, assume crédito
  if (parcelas && parcelas > 1 && metodoPagamento === 'dinheiro') {
    metodoPagamento = 'cartao';
    pago = false;
    if (!cartaoId && cartoesDisponiveis) {
      const resultado = buscarCartaoPorNome(resto, cartoesDisponiveis);
      if (resultado) { cartaoId = resultado.cartaoId; cartaoNome = resultado.cartaoNome; resto = resultado.restoAtualizado; }
      else if (cartoesDisponiveis.length === 1) { cartaoId = cartoesDisponiveis[0].id; cartaoNome = cartoesDisponiveis[0].nome; }
    }
  }

  const temDebito = resto.includes('debito') || resto.includes('débito');
  if (temDebito) {
    resto = resto.replace(/debito|débito/g, '').trim();
    pago = true;
  }

  // ── 7. Detectar tipo (renda ou despesa) ───────────────────
  const tipo: 'despesa' | 'renda' = forcaReceita ? 'renda' : 'despesa';

  // ── 8. Detectar categoria ─────────────────────────────────
  // PRIORIDADE 1: palavras-chave das categorias customizadas do usuário (cache em memória)
  // PRIORIDADE 2: mapa fixo expandido
  // PRIORIDADE 3: fallback padrão
  let categoria = tipo === 'renda' ? 'Outras Receitas' : 'Outras Despesas';

  if (tipo === 'renda') {
    // Para receitas, verifica customizadas primeiro
    if (categoriasCustomizadas && categoriasCustomizadas.length > 0) {
      for (const cat of categoriasCustomizadas) {
        if (cat.tipo !== 'renda') continue;
        if (!cat.palavrasChave || cat.palavrasChave.length === 0) continue;
        const achou = cat.palavrasChave.some(p => p.trim() && resto.includes(p.toLowerCase().trim()));
        if (achou) { categoria = cat.nome; break; }
      }
    }
    // Fallback fixo para receitas
    if (categoria === 'Outras Receitas') {
      if (resto.includes('salario') || resto.includes('salário')) categoria = 'Salário';
      else if (resto.includes('vale')) categoria = 'Vale Alimentação';
      else if (resto.includes('shopee')) categoria = 'Venda Shopee';
      else if (resto.includes('freelance') || resto.includes('freela')) categoria = 'Freelance';
    }
  } else {
    // PRIORIDADE 1: palavras-chave do usuário (mais específicas)
    let achouCustom = false;
    if (categoriasCustomizadas && categoriasCustomizadas.length > 0) {
      for (const cat of categoriasCustomizadas) {
        if (cat.tipo !== 'despesa') continue;
        if (!cat.palavrasChave || cat.palavrasChave.length === 0) continue;
        const achou = cat.palavrasChave.some(p => p.trim() && resto.includes(p.toLowerCase().trim()));
        if (achou) {
          categoria = cat.nome;
          achouCustom = true;
          break;
        }
      }
    }

    // PRIORIDADE 2: mapa fixo expandido (fallback)
    if (!achouCustom) {
      for (const { palavras, categoria: cat } of MAPA_CATEGORIAS_PALAVRAS) {
        if (palavras.some(p => resto.includes(p))) { categoria = cat; break; }
      }
    }
  }

  // ── 9. Extrair descrição ──────────────────────────────────
  const IGNORAR = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'a', 'o', 'e', 'r$', 'reais', 'real', 'pra', 'pro', 'para', 'com', 'um', 'uma']);
  const palavrasResto = resto
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 1 && !IGNORAR.has(p));

  const descricao = palavrasResto.slice(0, 4).join(' ');
  const descricaoFinal = descricao
    ? descricao.charAt(0).toUpperCase() + descricao.slice(1)
    : tipo === 'renda' ? 'Receita' : 'Despesa';

  return {
    valor,
    descricao: descricaoFinal,
    data,
    pessoa,
    categoria,
    tipo,
    metodoPagamento,
    cartaoId,
    cartaoNome,
    pago,
    parcelas,
  };
}

// ─────────────────────────────────────────────────────────────
// CATEGORIAS DISPONÍVEIS
// ─────────────────────────────────────────────────────────────

export function obterCategoriasDisponiveis(): string[] {
  return [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Lazer',
    'Educação',
    'Vestuário',
    'Serviços',
    'Investimentos',
    'Outras Despesas',
  ];
}

export function obterEmoji(categoria: string): string {
  return obterIconeCategoria(categoria);
}