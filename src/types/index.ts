// Tipos de transação
export type TipoTransacao = 'renda' | 'despesa';
export type TipoPessoa = 'Anderson Ferreira' | 'Evelin Mulbaier' | 'Todos';

// Interface principal de transação
export interface Transacao {
  id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  pessoa: string;
  tipo: TipoTransacao;
  pago: boolean;
  dividido?: boolean;
  ehGastoDiario?: boolean;
  parcela?: string;
  observacoes?: string;
  cartaoId?: string;
  parcelamento?: {
    parcelaAtual: number;
    totalParcelas: number;
  };
}

// Resumo financeiro do mês
export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  despesasPagas: number;
  despesasPendentes: number;
  gastosDiarios: number;
  saldoDisponivel: number;
}

// Categorias com totais
export interface CategoriaTotal {
  nome: string;
  total: number;
  percentual: number;
  cor: string;
}

// Meta financeira
export interface Meta {
  id: string;
  titulo: string;
  valorAlvo: number;
  valorAtual: number;
  dataInicio: string;
  dataFim: string;
  categoria: string;
  ativa: boolean;
}

// Reserva de emergência
export interface TransacaoReserva {
  id: string;
  data: string;
  tipo: 'aplicacao' | 'resgate';
  valor: number;
  descricao: string;
}

export interface ReservaEmergencia {
  transacoes: TransacaoReserva[];
  taxaCDIAnual: number;
}

// Cartão de Crédito
export interface CartaoCredito {
  id: string;
  nome: string;
  bandeira: 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outro';
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  ativo: boolean;
}

// Item da Fatura
export interface ItemFatura {
  id: string;
  cartaoId: string;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  parcelas?: number;
  parcelaAtual?: number;
  pessoa: string;
  dividido?: boolean;
  parcelamento?: {
    parcelaAtual: number;
    totalParcelas: number;
  };
}

// Fatura Mensal
export interface FaturaMensal {
  cartaoId: string;
  mesReferencia: string;
  itens: ItemFatura[];
  totalFatura: number;
  paga: boolean;
  dataPagamento?: string;
}

// NOVA: Categoria Customizada
export interface CategoriaCustomizada {
  nome: string;
  tipo: 'despesa' | 'renda';
}

// Sistema financeiro completo
export interface SistemaFinanceiro {
  dadosPorMes: {
    [mesKey: string]: Transacao[];
  };
  pessoasCadastradas: string[];
  metas: Meta[];
  reservaEmergencia: ReservaEmergencia;
  cartoes: CartaoCredito[];
  faturas: {
    [mesKey: string]: FaturaMensal[];
  };
  categoriasCustomizadas?: CategoriaCustomizada[];
}

// Usuário autenticado
export interface Usuario {
  uid: string;
  nome: string;
  email: string;
}

// Props de componentes
export interface DashboardProps {
  usuario: Usuario;
  mesReferencia: Date;
  filtro: string;
}

export interface TransacaoItemProps {
  transacao: Transacao;
  onEditar?: (id: string) => void;
  onExcluir?: (id: string) => void;
  onMarcarPago?: (id: string) => void;
}

export interface ModalTransacaoProps {
  aberto: boolean;
  tipo: TipoTransacao;
  onFechar: () => void;
  onSalvar: (transacao: Omit<Transacao, 'id'>) => void;
  transacaoEditando?: Transacao;
}