import { describe, it, expect } from 'vitest';
import { calcularResumo, gerarMesKey } from '@/utils/financeiro';
import type { Transacao } from '@/types';

// Helper: cria uma Transacao com defaults sensatos, sobrescrevendo o que importa no teste.
function tx(over: Partial<Transacao>): Transacao {
  return {
    id: Math.random().toString(36).slice(2),
    data: '2026-06-10',
    categoria: 'Outras Despesas',
    descricao: 'teste',
    valor: 0,
    pessoa: 'Anderson Ferreira',
    tipo: 'despesa',
    pago: true,
    ...over,
  };
}

describe('gerarMesKey', () => {
  it('formata YYYY-MM (mês 0-indexado vira 1-indexado)', () => {
    expect(gerarMesKey(new Date(2026, 0, 15))).toBe('2026-01'); // janeiro
    expect(gerarMesKey(new Date(2026, 5, 1))).toBe('2026-06');  // junho
    expect(gerarMesKey(new Date(2026, 11, 31))).toBe('2026-12'); // dezembro
  });

  it('aplica zero-padding no mês de 1 dígito', () => {
    expect(gerarMesKey(new Date(2026, 8, 1))).toBe('2026-09');
  });
});

describe('calcularResumo', () => {
  it('soma receitas/despesas e separa pagas de pendentes', () => {
    const r = calcularResumo([
      tx({ tipo: 'renda', valor: 5000, categoria: 'Salário' }),
      tx({ tipo: 'despesa', valor: 1000, pago: true }),
      tx({ tipo: 'despesa', valor: 300, pago: false }),
    ]);
    expect(r.totalReceitas).toBe(5000);
    expect(r.totalDespesas).toBe(1300);
    expect(r.despesasPagas).toBe(1000);
    expect(r.despesasPendentes).toBe(300);
    // saldo disponível = receitas − despesas PAGAS
    expect(r.saldoDisponivel).toBe(4000);
    // saldo total = receitas − despesas TOTAIS (inclui pendentes)
    expect(r.saldoTotal).toBe(3700);
  });

  it('exclui benefícios (Vale Alimentação) do total de receitas', () => {
    const r = calcularResumo([
      tx({ tipo: 'renda', valor: 5000, categoria: 'Salário' }),
      tx({ tipo: 'renda', valor: 600, categoria: 'Vale Alimentação' }),
    ]);
    expect(r.totalReceitas).toBe(5000); // o vale NÃO soma nas receitas
  });

  it('filtra por pessoa (case/space-insensitive)', () => {
    const r = calcularResumo([
      tx({ tipo: 'despesa', valor: 100, pessoa: 'Anderson Ferreira' }),
      tx({ tipo: 'despesa', valor: 200, pessoa: 'Evelin Mulbaier' }),
    ], '  EVELIN mulbaier ');
    expect(r.totalDespesas).toBe(200);
    expect(r.despesasPagas).toBe(200);
  });

  it('lista vazia → todos os totais zerados', () => {
    expect(calcularResumo([])).toEqual({
      totalReceitas: 0, totalDespesas: 0, despesasPagas: 0,
      despesasPendentes: 0, saldoDisponivel: 0, saldoTotal: 0,
    });
  });

  it('não conta despesa como receita nem vice-versa', () => {
    const r = calcularResumo([
      tx({ tipo: 'renda', valor: 100, categoria: 'Salário' }),
      tx({ tipo: 'despesa', valor: 100, pago: true }),
    ]);
    expect(r.saldoDisponivel).toBe(0);
    expect(r.totalReceitas).toBe(100);
    expect(r.totalDespesas).toBe(100);
  });
});
