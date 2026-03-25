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
}

const MAPA_CATEGORIAS_PALAVRAS: { palavras: string[]; categoria: string }[] = [
  { palavras: ['lanche', 'comida', 'pizza', 'hamburguer', 'almoço', 'almoco', 'jantar', 'cafe', 'ifood', 'delivery', 'restaurante', 'mercadao', 'mc', 'mcdonalds', 'burguer'], categoria: 'Alimentação' },
  { palavras: ['onibus', 'ônibus', 'uber', 'taxi', 'combustivel', 'gasolina', 'transporte', 'metro', 'passagem', '99'], categoria: 'Transporte' },
  { palavras: ['mercado', 'supermercado', 'feira', 'extra', 'carrefour', 'pao de acucar'], categoria: 'Supermercado' },
  { palavras: ['aluguel', 'condominio', 'iptu', 'moradia'], categoria: 'Moradia' },
  { palavras: ['luz', 'agua', 'energia', 'internet', 'telefone', 'celular', 'gas', 'conta de'], categoria: 'Contas' },
  { palavras: ['farmacia', 'remedio', 'medico', 'hospital', 'consulta', 'saude', 'dentista', 'plano'], categoria: 'Saúde' },
  { palavras: ['escola', 'faculdade', 'curso', 'livro', 'educacao'], categoria: 'Educação' },
  { palavras: ['roupa', 'sapato', 'shopping', 'loja', 'vestuario'], categoria: 'Roupas' },
  { palavras: ['cinema', 'netflix', 'spotify', 'lazer', 'festa', 'bar', 'viagem', 'show'], categoria: 'Lazer' },
  { palavras: ['academia', 'ginasio', 'musculacao'], categoria: 'Academia' },
  { palavras: ['salario', 'salário', 'freelance', 'freela', 'recebi', 'pagamento'], categoria: 'Renda' },
];

export function parsearInputMagico(input: string, usuarioNome: string): DadosInputMagico | null {
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
  let data = new Date().toISOString().split('T')[0]; // hoje por padrão

  if (resto.includes('ontem')) {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    data = ontem.toISOString().split('T')[0];
    resto = resto.replace('ontem', '').trim();
  } else if (resto.includes('hoje')) {
    resto = resto.replace('hoje', '').trim();
  } else {
    // Tentar DD/MM ou DD-MM
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

  // ── 4. Detectar tipo (renda ou despesa) ───────────────────
  let tipo: 'despesa' | 'renda' = 'despesa';
  const palavrasRenda = ['salário', 'salario', 'recebi', 'receita', 'renda', 'freela', 'freelance'];
  if (palavrasRenda.some(p => resto.includes(p))) tipo = 'renda';

  // ── 5. Detectar categoria ─────────────────────────────────
  let categoria = tipo === 'renda' ? 'Renda' : 'Outros';
  for (const { palavras, categoria: cat } of MAPA_CATEGORIAS_PALAVRAS) {
    if (palavras.some(p => resto.includes(p))) {
      categoria = cat;
      break;
    }
  }

  // ── 6. Extrair descrição — palavras restantes significativas
  const IGNORAR = new Set(['de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'a', 'o', 'e', 'r$', 'reais', 'real', 'pra', 'pro', 'para', 'com', 'um', 'uma']);
  const palavrasResto = resto
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(p => p.length > 1 && !IGNORAR.has(p));

  const descricao = palavrasResto.slice(0, 4).join(' ');
  const descricaoFinal = descricao
    ? descricao.charAt(0).toUpperCase() + descricao.slice(1)
    : tipo === 'renda' ? 'Receita' : 'Despesa';

  return { valor, descricao: descricaoFinal, data, pessoa, categoria, tipo };
}