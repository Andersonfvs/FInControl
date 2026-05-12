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
  quilometragem?: number; // KM registrado no momento do abastecimento/manutenção
  parcelamento?: {
    parcelaAtual: number;
    totalParcelas: number;
  };
  dividido?: boolean;
  notaFiscalUrl?: string;
}

export interface CartaoCredito {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  senhaPDF?: string;
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
  dividido?: boolean;
  parcelamento?: {
    parcelaAtual: number;
    totalParcelas: number;
  };
}

export interface Fatura {
  cartaoId: string;
  mesReferencia: string;
  itens: ItemFatura[];
  totalFatura: number;
  paga: boolean;
  dataPagamento?: string;
}

export type FaturaMensal = Fatura;

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
  tipo: 'deposito' | 'retirada';
  valorLiquido?: number;
  rendimentoBruto?: number;
  iof?: number;
  ir?: number;
  diasCorridos?: number;
}

export interface ReservaEmergencia {
  transacoes: TransacaoReserva[];
  taxaCDIAnual: number;
  meta?: number;
  ultimoCreditoCDI?: string;
}

export interface CategoriaCustomizada {
  id: string;
  nome: string;
  icone: string;
  tipo: 'despesa' | 'renda';
  palavrasChave?: string[];
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
  dadosPorMes: { [mesKey: string]: Transacao[] };
  pessoasCadastradas: string[];
  metas: Meta[];
  reservaEmergencia: ReservaEmergencia;
  cartoes: CartaoCredito[];
  faturas: { [mesKey: string]: Fatura[] };
  categoriasCustomizadas: CategoriaCustomizada[];
}

export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  despesasPagas: number;
  despesasPendentes: number;
  gastosDiarios: number;
  saldoDisponivel: number;
}

export interface CategoriaTotal {
  nome: string;
  total: number;
  percentual: number;
  cor: string;
}

export interface Resumo {
  totalReceitas: number;
  totalDespesas: number;
  despesasPagas: number;
  despesasPendentes: number;
  saldoDisponivel: number;
  saldoTotal: number;
}