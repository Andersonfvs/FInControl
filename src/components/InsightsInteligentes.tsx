'use client';

import { Transacao, CategoriaTotal } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  transacoesAtual: Transacao[];
  transacoesAnterior: Transacao[];
}

interface Insight {
  tipo: 'alerta' | 'info' | 'sucesso' | 'dica';
  icone: string;
  titulo: string;
  descricao: string;
  valor?: string;
}

export default function InsightsInteligentes({ transacoesAtual, transacoesAnterior }: Props) {
  const isMobile = useIsMobile();

  const calcularInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Calcular totais
    const despesasAtual = transacoesAtual.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
    const despesasAnterior = transacoesAnterior.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + t.valor, 0);
    const receitasAtual = transacoesAtual.filter(t => t.tipo === 'renda').reduce((sum, t) => sum + t.valor, 0);

    // Insight 1: Comparação com mês anterior
    if (despesasAnterior > 0) {
      const variacao = ((despesasAtual - despesasAnterior) / despesasAnterior) * 100;
      
      if (variacao > 15) {
        insights.push({
          tipo: 'alerta',
          icone: '⚠️',
          titulo: 'Gastos aumentaram!',
          descricao: `Você gastou ${variacao.toFixed(1)}% a mais que o mês passado`,
          valor: `+${formatarMoeda(despesasAtual - despesasAnterior)}`
        });
      } else if (variacao < -10) {
        insights.push({
          tipo: 'sucesso',
          icone: '🎉',
          titulo: 'Parabéns! Você economizou',
          descricao: `Reduziu seus gastos em ${Math.abs(variacao).toFixed(1)}% comparado ao mês passado`,
          valor: `-${formatarMoeda(Math.abs(despesasAtual - despesasAnterior))}`
        });
      }
    }

    // Insight 2: Maior categoria
    const categoriasDespesas: { [key: string]: number } = {};
    transacoesAtual.filter(t => t.tipo === 'despesa').forEach(t => {
      categoriasDespesas[t.categoria] = (categoriasDespesas[t.categoria] || 0) + t.valor;
    });

    if (Object.keys(categoriasDespesas).length > 0) {
      const maiorCategoria = Object.entries(categoriasDespesas).sort((a, b) => b[1] - a[1])[0];
      const percentual = (maiorCategoria[1] / despesasAtual) * 100;

      insights.push({
        tipo: 'info',
        icone: '📊',
        titulo: `${maiorCategoria[0]} é sua maior despesa`,
        descricao: `Representa ${percentual.toFixed(1)}% do total gasto este mês`,
        valor: formatarMoeda(maiorCategoria[1])
      });
    }

    // Insight 3: Categoria que mais cresceu
    if (transacoesAnterior.length > 0) {
      const categoriasAnterior: { [key: string]: number } = {};
      transacoesAnterior.filter(t => t.tipo === 'despesa').forEach(t => {
        categoriasAnterior[t.categoria] = (categoriasAnterior[t.categoria] || 0) + t.valor;
      });

      let maiorCrescimento = { categoria: '', percentual: 0, valor: 0 };

      Object.keys(categoriasDespesas).forEach(cat => {
        if (categoriasAnterior[cat]) {
          const crescimento = ((categoriasDespesas[cat] - categoriasAnterior[cat]) / categoriasAnterior[cat]) * 100;
          if (crescimento > maiorCrescimento.percentual && crescimento > 30) {
            maiorCrescimento = {
              categoria: cat,
              percentual: crescimento,
              valor: categoriasDespesas[cat] - categoriasAnterior[cat]
            };
          }
        }
      });

      if (maiorCrescimento.categoria) {
        insights.push({
          tipo: 'alerta',
          icone: '📈',
          titulo: `${maiorCrescimento.categoria} disparou!`,
          descricao: `Aumentou ${maiorCrescimento.percentual.toFixed(1)}% em relação ao mês passado`,
          valor: `+${formatarMoeda(maiorCrescimento.valor)}`
        });
      }
    }

    // Insight 4: Saldo positivo/negativo
    const saldo = receitasAtual - despesasAtual;
    if (saldo < 0) {
      insights.push({
        tipo: 'alerta',
        icone: '💸',
        titulo: 'Atenção! Gastou mais do que recebeu',
        descricao: `Seu saldo está negativo este mês`,
        valor: formatarMoeda(saldo)
      });
    } else if (saldo > receitasAtual * 0.3) {
      insights.push({
        tipo: 'sucesso',
        icone: '💰',
        titulo: 'Ótimo controle financeiro!',
        descricao: `Você economizou ${((saldo / receitasAtual) * 100).toFixed(1)}% da sua renda`,
        valor: formatarMoeda(saldo)
      });
    }

    // Insight 5: Despesas pendentes
    const despesasPendentes = transacoesAtual.filter(t => t.tipo === 'despesa' && !t.pago);
    if (despesasPendentes.length > 0) {
      const totalPendente = despesasPendentes.reduce((sum, t) => sum + t.valor, 0);
      insights.push({
        tipo: 'dica',
        icone: '⏱️',
        titulo: `${despesasPendentes.length} despesas pendentes`,
        descricao: 'Não esqueça de pagar para não comprometer o orçamento',
        valor: formatarMoeda(totalPendente)
      });
    }

    // Insight 6: Dica de economia
    if (insights.filter(i => i.tipo === 'alerta').length > 0) {
      insights.push({
        tipo: 'dica',
        icone: '💡',
        titulo: 'Dica de economia',
        descricao: 'Revise suas assinaturas e serviços recorrentes. Muitas vezes pagamos por coisas que não usamos!',
      });
    }

    return insights;
  };

  const insights = calcularInsights();

  if (insights.length === 0) {
    return null;
  }

  const getCor = (tipo: string) => {
    switch (tipo) {
      case 'alerta': return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' };
      case 'sucesso': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
      case 'info': return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' };
      case 'dica': return { bg: '#fefce8', border: '#fde047', text: '#854d0e' };
      default: return { bg: '#f9fafb', border: '#e5e7eb', text: '#374151' };
    }
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>🧠</span>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#374151'
        }}>
          Insights Inteligentes
        </h3>
      </div>

      {/* Mobile: coluna única. Desktop: grid automático com mínimo de 300px por card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem'
      }}>
        {insights.map((insight, index) => {
          const cores = getCor(insight.tipo);
          
          return (
            <div
              key={`insight-${index}-${insight.titulo}`}
              style={{
                background: cores.bg,
                border: `1px solid ${cores.border}`,
                borderRadius: '0.5rem',
                padding: '1rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{insight.icone}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    color: cores.text,
                    marginBottom: '0.25rem',
                    fontSize: '0.9375rem'
                  }}>
                    {insight.titulo}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: cores.text,
                    opacity: 0.8
                  }}>
                    {insight.descricao}
                  </div>
                  {insight.valor && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: cores.text
                    }}>
                      {insight.valor}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}