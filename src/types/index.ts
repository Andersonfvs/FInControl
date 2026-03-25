// ─────────────────────────────────────────────────────────────
// TIPOS PRINCIPAIS
// ─────────────────────────────────────────────────────────────

export interface Usuario {
  uid: string;
  nome: string;
  email: string;
}

export interface Transacao {
  id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  pessoa: string;
  tipo: 'despesa' | 'renda';
  pago: boolean;
  cartaoId?: string;
  metodoPagamento?: 'dinheiro' | 'cartao' | 'vale_alimentacao';
}

export interface CartaoCredito {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string; // ✅ ADICIONADO
}

export interface ItemFatura {
  id: string;
  cartaoId: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  pessoa: string;
  parcelas: number;
  parcelaAtual: number;
}

export interface Fatura {
  cartaoId: string;
  mesReferencia: string;
  itens: ItemFatura[];
  totalFatura: number;
  paga: boolean;
  dataPagamento?: string;
}

export interface Meta {
  id: string;
  nome: string;
  valorAlvo: number;
  valorAtual: number;
  dataLimite: string;
  categoria: string;
}

export interface TransacaoReserva {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
}

export interface ReservaEmergencia {
  transacoes: TransacaoReserva[];
  taxaCDIAnual: number;
}

export interface CategoriaCustomizada {
  id: string;
  nome: string;
  icone: string;
  tipo: 'despesa' | 'renda';
}

export interface AtalhoRapido {
  id: string;
  emoji: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: 'despesa' | 'receita';
}

export interface SistemaFinanceiro {
  dadosPorMes: {
    [mesKey: string]: Transacao[];
  };
  pessoasCadastradas: string[];
  metas: Meta[];
  reservaEmergencia: ReservaEmergencia;
  cartoes: CartaoCredito[];
  faturas: {
    [mesKey: string]: Fatura[];
  };
  categoriasCustomizadas: CategoriaCustomizada[];
}

// ─────────────────────────────────────────────────────────────
// TIPOS AUXILIARES
// ─────────────────────────────────────────────────────────────

export interface Resumo {
  totalReceitas: number;
  totalDespesas: number;
  despesasPagas: number;
  despesasPendentes: number;
  saldoDisponivel: number;
  saldoTotal: number;
}

export interface CategoriaTotal {
  nome: string;
  total: number;
  percentual: number;
  cor: string;
}