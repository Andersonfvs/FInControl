'use client';

import { formatarMoeda } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';
import EmptyState from './EmptyState';

interface DadosEvolucao {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface Props {
  dados: DadosEvolucao[];
}

export default function GraficoEvolucao({ dados }: Props) {
  const isMobile = useIsMobile();

  if (!dados || dados.length === 0) {
    return <EmptyState icon="chart-bar" title="Sem dados de evolução" description="Registre transações em meses anteriores para ver o histórico" />;
  }

  const maxReceitas = Math.max(...dados.map(d => d.receitas || 0));
  const maxDespesas = Math.max(...dados.map(d => d.despesas || 0));
  const maxValor = Math.max(maxReceitas, maxDespesas);

  if (maxValor === 0 || isNaN(maxValor) || !isFinite(maxValor)) {
    return <EmptyState icon="chart-bar" title="Sem movimentações para exibir" description="Registre receitas e despesas para ver a evolução" />;
  }

  // Mobile mostra só os últimos 3 meses para não amontoar os labels
  const dadosVisiveis = isMobile ? dados.slice(-3) : dados;

  const alturaGrafico = 200;
  const larguraGrafico = 600;
  const padding = 40;

  const calcularY = (valor: number) => {
    if (isNaN(valor) || !isFinite(valor) || valor < 0) return alturaGrafico - padding;
    const y = alturaGrafico - padding - ((valor / maxValor) * (alturaGrafico - padding * 2));
    if (isNaN(y) || !isFinite(y)) return alturaGrafico - padding;
    return y;
  };

  const pontosReceitas = dadosVisiveis
    .map((d, i) => {
      const x = padding + (i * (larguraGrafico - padding * 2)) / Math.max(dadosVisiveis.length - 1, 1);
      const y = calcularY(d.receitas || 0);
      return `${x},${y}`;
    })
    .join(' ');

  const pontosDespesas = dadosVisiveis
    .map((d, i) => {
      const x = padding + (i * (larguraGrafico - padding * 2)) / Math.max(dadosVisiveis.length - 1, 1);
      const y = calcularY(d.despesas || 0);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        color: '#374151'
      }}>
        {isMobile ? 'Evolução (3 meses)' : 'Evolução (6 meses)'}
      </h3>

      <svg viewBox={`0 0 ${larguraGrafico} ${alturaGrafico}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
          const y = alturaGrafico - padding - (percent * (alturaGrafico - padding * 2));
          const valorGrid = maxValor * percent;
          
          if (isNaN(y) || !isFinite(y) || isNaN(valorGrid) || !isFinite(valorGrid)) {
            return null;
          }
          
          return (
            <g key={`grid-${percent}`}>
              <line
                x1={padding}
                y1={y}
                x2={larguraGrafico - padding}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                style={{ fontSize: '10px', fill: '#9ca3af' }}
              >
                {formatarMoeda(valorGrid)}
              </text>
            </g>
          );
        })}

        <polyline
          points={pontosReceitas}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={pontosDespesas}
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {dadosVisiveis.map((d, i) => {
          const x = padding + (i * (larguraGrafico - padding * 2)) / Math.max(dadosVisiveis.length - 1, 1);
          const y = calcularY(d.receitas || 0);
          
          if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) {
            return null;
          }
          
          return (
            <circle
              key={`r-${d.mes}-${i}`}
              cx={x}
              cy={y}
              r="4"
              fill="#10b981"
            />
          );
        })}

        {dadosVisiveis.map((d, i) => {
          const x = padding + (i * (larguraGrafico - padding * 2)) / Math.max(dadosVisiveis.length - 1, 1);
          const y = calcularY(d.despesas || 0);
          
          if (isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) {
            return null;
          }
          
          return (
            <circle
              key={`d-${d.mes}-${i}`}
              cx={x}
              cy={y}
              r="4"
              fill="#ef4444"
            />
          );
        })}

        {dadosVisiveis.map((d, i) => {
          const x = padding + (i * (larguraGrafico - padding * 2)) / Math.max(dadosVisiveis.length - 1, 1);
          
          if (isNaN(x) || !isFinite(x)) {
            return null;
          }
          
          return (
            <text
              key={`m-${d.mes}-${i}`}
              x={x}
              y={alturaGrafico - 20}
              textAnchor="middle"
              style={{ fontSize: '11px', fill: '#6b7280', fontWeight: '600' }}
            >
              {d.mes}
            </text>
          );
        })}
      </svg>

      <div style={{
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
        marginTop: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '16px',
            height: '3px',
            background: '#10b981',
            borderRadius: '2px'
          }}></div>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Receitas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '16px',
            height: '3px',
            background: '#ef4444',
            borderRadius: '2px'
          }}></div>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Despesas</span>
        </div>
      </div>
    </div>
  );
}