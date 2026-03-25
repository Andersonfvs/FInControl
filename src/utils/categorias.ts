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
  { palavras: ['presente', 'gift', 'presente'], icone: '🎁' },
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
}

const MAPA_CATEGORIAS_PALAVRAS: { palavras: string[]; categoria: string }[] = [
  { palavras: ['lanche', 'comida', 'pizza', 'hamburguer', 'almoço', 'almoco', 'jantar', 'cafe', 'ifood', 'delivery', 'restaurante', 'mercadao', 'mc', 'mcdonalds', 'burguer'], categoria: 'Alimentação' },
  { palavras: ['onibus', 'ônibus', 'uber', 'taxi', 'combustivel', 'gasolina', 'transporte', 'metro', 'passagem', '99'], categoria: 'Transporte' },
  { palavras: ['mercado', 'supermercado', 'feira', 'extra', 'carrefour', 'pao de acucar'], categoria: 'Alimentação' },
  { palavras: ['aluguel', 'condominio', 'iptu', 'moradia'], categoria: 'Moradia' },
  { palavras: ['luz', 'agua', 'energia', 'internet', 'telefone', 'celular', 'gas', 'conta de'], categoria: 'Serviços' },
  { palavras: ['farmacia', 'remedio', 'medico', 'hospital', 'consulta', 'saude', 'dentista', 'plano'], categoria: 'Saúde' },
  { palavras: ['escola', 'faculdade', 'curso', 'livro', 'educacao'], categoria: 'Educação' },
  { palavras: ['roupa', 'sapato', 'shopping', 'loja', 'vestuario'], categoria: 'Vestuário' },
  { palavras: ['cinema', 'netflix', 'spotify', 'lazer', 'festa', 'bar', 'viagem', 'show'], categoria: 'Lazer' },
  { palavras: ['academia', 'ginasio', 'musculacao'], categoria: 'Saúde' },
  { palavras: ['salario', 'salário', 'freelance', 'freela'], categoria: 'Salário' },
  { palavras: ['shopee', 'mercado livre', 'amazon'], categoria: 'Compras Online' },
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

export function parsearInputMagico(input: string, usuarioNome: string, cartoesDisponiveis?: any[]): DadosInputMagico | null {
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

  // ── 5. Detectar método de pagamento ───────────────────────
  let metodoPagamento: 'dinheiro' | 'cartao' = 'dinheiro';
  let cartaoId: string | undefined;
  let cartaoNome: string | undefined;
  let pago = true; // Padrão: débito é pago na hora

  const temCredito = resto.includes('credito') || resto.includes('crédito') || resto.includes('cartao') || resto.includes('cartão');
  
  if (temCredito) {
    metodoPagamento = 'cartao';
    pago = false; // Crédito não é pago ainda (vai pra fatura)
    resto = resto.replace(/credito|crédito|cartao|cartão/g, '').trim();

    // Tentar identificar o cartão
    for (const [palavra, nomeCartao] of Object.entries(CARTOES_CONHECIDOS)) {
      if (resto.includes(palavra)) {
        cartaoNome = nomeCartao;
        resto = resto.replace(palavra, '').trim();
        
        // Buscar ID do cartão se disponível
        if (cartoesDisponiveis) {
          const cartaoEncontrado = cartoesDisponiveis.find(c => 
            c.nome.toLowerCase().includes(palavra) || 
            nomeCartao.toLowerCase().includes(c.nome.toLowerCase())
          );
          if (cartaoEncontrado) {
            cartaoId = cartaoEncontrado.id;
            cartaoNome = cartaoEncontrado.nome;
          }
        }
        break;
      }
    }
  }

  const temDebito = resto.includes('debito') || resto.includes('débito');
  if (temDebito) {
    resto = resto.replace(/debito|débito/g, '').trim();
    pago = true;
  }

  // ── 6. Detectar tipo (renda ou despesa) ───────────────────
  let tipo: 'despesa' | 'renda' = forcaReceita ? 'renda' : 'despesa';

  // Se for Shopee E tiver "receita", é venda
  if (resto.includes('shopee') && forcaReceita) {
    tipo = 'renda';
  }

  // ── 7. Detectar categoria ─────────────────────────────────
  let categoria = tipo === 'renda' ? 'Outras Receitas' : 'Outras Despesas';
  
  if (tipo === 'renda') {
    if (resto.includes('salario') || resto.includes('salário')) categoria = 'Salário';
    else if (resto.includes('vale')) categoria = 'Vale Alimentação';
    else if (resto.includes('shopee')) categoria = 'Venda Shopee';
    else if (resto.includes('freelance') || resto.includes('freela')) categoria = 'Freelance';
  } else {
    for (const { palavras, categoria: cat } of MAPA_CATEGORIAS_PALAVRAS) {
      if (palavras.some(p => resto.includes(p))) {
        categoria = cat;
        break;
      }
    }
  }

  // ── 8. Extrair descrição ──────────────────────────────────
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
    pago
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
    'Outras Despesas'
  ];
}

export function obterEmoji(categoria: string): string {
  return obterIconeCategoria(categoria);
}