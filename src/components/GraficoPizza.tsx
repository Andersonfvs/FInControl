'use client';

import { CategoriaTotal } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  categorias: CategoriaTotal[];
}

const CORES = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

export default function GraficoPizza({ categorias }: Props) {
  const isMobile = useIsMobile();

  if (!categorias || categorias.length === 0) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Nenhuma despesa para mostrar
          </div>
        </div>
      </div>
    );
  }

  const top5 = categorias.slice(0, 5);
  const total = top5.reduce((sum, c) => sum + (c.total || 0), 0);

  if (total === 0 || isNaN(total) || !isFinite(total)) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Nenhuma despesa para mostrar
          </div>
        </div>
      </div>
    );
  }

  const fatias = top5.reduce((acc, cat, index) => {
    const valorSeguro = cat.total || 0;
    const percentual = (valorSeguro / total) * 100;
    const inicio = acc.length > 0 ? acc[acc.length - 1].fim : 0;
    const fim = inicio + percentual;
    
    acc.push({
      categoria: cat.nome,
      valor: valorSeguro,
      percentual: percentual,
      inicio: inicio,
      fim: fim,
      cor: CORES[index % CORES.length]
    });
    return acc;
  }, [] as {
    categoria: string;
    valor: number;
    percentual: number;
    inicio: number;
    fim: number;
    cor: string;
  }[]);

  const criarPath = (inicio: number, fim: number) => {
    const anguloInicio = (inicio / 100) * 360 - 90;
    const anguloFim = (fim / 100) * 360 - 90;
    
    const x1 = 100 + 80 * Math.cos((anguloInicio * Math.PI) / 180);
    const y1 = 100 + 80 * Math.sin((anguloInicio * Math.PI) / 180);
    const x2 = 100 + 80 * Math.cos((anguloFim * Math.PI) / 180);
    const y2 = 100 + 80 * Math.sin((anguloFim * Math.PI) / 180);
    
    const largeArc = fim - inicio > 50 ? 1 : 0;
    
    return `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

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
        Despesas por Categoria (Top 5)
      </h3>

      {/* Mobile: pizza em cima, legenda embaixo. Desktop: lado a lado */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '2rem',
        alignItems: 'center'
      }}>
        <svg
          viewBox="0 0 200 200"
          style={{
            width: isMobile ? '65%' : '100%',
            height: 'auto',
            margin: isMobile ? '0 auto' : '0',
            display: 'block'
          }}
        >
          {fatias.map((fatia) => (
            <path
              key={`fatia-${fatia.categoria}`}
              d={criarPath(fatia.inicio, fatia.fim)}
              fill={fatia.cor}
              opacity="0.9"
            />
          ))}
          <circle cx="100" cy="100" r="50" fill="white" />
          
          <text
            x="100"
            y="95"
            textAnchor="middle"
            style={{
              fontSize: '12px',
              fill: '#6b7280',
              fontWeight: '600'
            }}
          >
            Total
          </text>
          <text
            x="100"
            y="110"
            textAnchor="middle"
            style={{
              fontSize: '14px',
              fill: '#374151',
              fontWeight: '700'
            }}
          >
            {formatarMoeda(total)}
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {fatias.map((fatia) => (
            <div key={`legenda-${fatia.categoria}`} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: fatia.cor
                }}></div>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {fatia.categoria}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {formatarMoeda(fatia.valor)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {fatia.percentual.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
