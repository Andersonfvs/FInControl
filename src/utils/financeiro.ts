import { Transacao, ResumoFinanceiro, CategoriaTotal, Resumo } from '@/types';

export function gerarMesKey(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function formatarData(dataString: string): string {
  const data = new Date(dataString + 'T00:00:00');
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatarDataCurta(dataString: string): string {
  const data = new Date(dataString + 'T00:00:00');
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
}

export function calcularResumo(transacoes: Transacao[], filtro: string = 'todos'): Resumo {
  let totalReceitas = 0;
  let totalDespesas = 0;
  let despesasPagas = 0;
  let despesasPendentes = 0;

  transacoes.forEach(t => {
    const pertenceAoFiltro = filtro === 'todos' || t.pessoa.toLowerCase().trim() === filtro.toLowerCase().trim();
    if (!pertenceAoFiltro) return;

    if (t.tipo === 'renda') {
      totalReceitas += t.valor;
    } else if (t.tipo === 'despesa') {
      totalDespesas += t.valor;
      if (t.pago) {
        despesasPagas += t.valor;
      } else {
        despesasPendentes += t.valor;
      }
    }
  });

  const saldoDisponivel = totalReceitas - despesasPagas;
  const saldoTotal = totalReceitas - totalDespesas;

  return {
    totalReceitas,
    totalDespesas,
    despesasPagas,
    despesasPendentes,
    saldoDisponivel,
    saldoTotal
  };
}

export function agruparPorCategorias(transacoes: Transacao[], filtro: string = 'todos'): CategoriaTotal[] {
  const categorias: { [key: string]: number } = {};

  transacoes.forEach(t => {
    const pertenceAoFiltro = filtro === 'todos' || t.pessoa.toLowerCase().trim() === filtro.toLowerCase().trim();
    if (pertenceAoFiltro && t.tipo === 'despesa') {
      if (!categorias[t.categoria]) categorias[t.categoria] = 0;
      categorias[t.categoria] += t.valor;
    }
  });

  const total = Object.values(categorias).reduce((a, b) => a + b, 0);
  const cores = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

  return Object.entries(categorias)
    .map(([nome, valor], index) => ({
      nome,
      total: valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
      cor: cores[index % cores.length]
    }))
    .sort((a, b) => b.total - a.total);
}

export function gerarId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function obterNomeMes(data: Date): string {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return meses[data.getMonth()];
}

export function filtrarTransacoes(transacoes: Transacao[], filtros: { busca?: string; tipo?: string; pessoa?: string }): Transacao[] {
  return transacoes.filter(t => {
    const matchBusca = !filtros.busca || t.descricao.toLowerCase().includes(filtros.busca.toLowerCase()) || t.categoria.toLowerCase().includes(filtros.busca.toLowerCase());
    const matchTipo = !filtros.tipo || filtros.tipo === 'todos' || t.tipo === filtros.tipo;
    const matchPessoa = !filtros.pessoa || filtros.pessoa === 'todos' || t.pessoa.toLowerCase().trim() === filtros.pessoa.toLowerCase().trim();
    return matchBusca && matchTipo && matchPessoa;
  });
}

export function ordenarTransacoes(transacoes: Transacao[], criterio: 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc'): Transacao[] {
  const copia = [...transacoes];
  switch (criterio) {
    case 'data-desc': return copia.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    case 'data-asc': return copia.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    case 'valor-desc': return copia.sort((a, b) => b.valor - a.valor);
    case 'valor-asc': return copia.sort((a, b) => a.valor - b.valor);
    default: return copia;
  }
}