'use client';

import { useMemo } from 'react';
import { Transacao } from '@/types';
import { formatarMoeda, gerarMesKey } from '@/utils/financeiro';

interface Props {
  dadosPorMes: { [mesKey: string]: Transacao[] };
}

const CATEGORIAS_VEICULO = ['Transporte', 'Manutenção Veículo'];
const CATEGORIAS_COMBUSTIVEL = ['Transporte'];

interface PontoKm {
  data: string;
  km: number;
  valor: number;
  descricao: string;
}

interface DadosMes {
  mes: string;
  mesKey: string;
  totalGasto: number;
  custoKm: number | null;
  kmPercorridos: number | null;
}

function calcularDadosKm(dadosPorMes: { [mesKey: string]: Transacao[] }): {
  custoAtual: number | null;
  kmTotalPercorrido: number | null;
  totalGasto: number;
  pontos: PontoKm[];
  dadosMensais: DadosMes[];
  minimoRegistros: boolean;
} {
  // Coleta todos os lançamentos com quilometragem
  const pontosKm: PontoKm[] = [];

  for (const mesKey in dadosPorMes) {
    const transacoes = dadosPorMes[mesKey] || [];
    transacoes.forEach(t => {
      if (
        t.tipo === 'despesa' &&
        t.quilometragem &&
        t.quilometragem > 0 &&
        CATEGORIAS_VEICULO.some(cat => t.categoria === cat || t.categoria?.includes('Manutenção') || t.categoria?.includes('Transporte'))
      ) {
        pontosKm.push({
          data: t.data,
          km: t.quilometragem,
          valor: t.valor,
          descricao: t.descricao,
        });
      }
    });
  }

  // Ordena por KM crescente (odômetro)
  pontosKm.sort((a, b) => a.km - b.km);

  if (pontosKm.length < 2) {
    // Menos de 2 registros: mostra total gasto mas não calcula custo/km
    const totalGasto = pontosKm.reduce((s, p) => s + p.valor, 0);
    return { custoAtual: null, kmTotalPercorrido: null, totalGasto, pontos: pontosKm, dadosMensais: [], minimoRegistros: true };
  }

  const kmMinimo = pontosKm[0].km;
  const kmMaximo = pontosKm[pontosKm.length - 1].km;
  const kmTotalPercorrido = kmMaximo - kmMinimo;
  const totalGasto = pontosKm.reduce((s, p) => s + p.valor, 0);
  const custoAtual = kmTotalPercorrido > 0 ? totalGasto / kmTotalPercorrido : null;

  // Calcula por mês para o gráfico de tendência
  const dadosMensais: DadosMes[] = [];
  const hoje = new Date();

  for (let i = 5; i >= 0; i--) {
    const data = new Date(hoje);
    data.setMonth(data.getMonth() - i);
    const mesKey = gerarMesKey(data);
    const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

    const transacoesMes = dadosPorMes[mesKey] || [];
    const pontosMes = transacoesMes
      .filter(t => t.tipo === 'despesa' && t.quilometragem && t.quilometragem > 0 && CATEGORIAS_VEICULO.some(cat => t.categoria === cat || t.categoria?.includes('Manutenção') || t.categoria?.includes('Transporte')))
      .map(t => ({ km: t.quilometragem!, valor: t.valor }))
      .sort((a, b) => a.km - b.km);

    const totalMes = pontosMes.reduce((s, p) => s + p.valor, 0);

    let custoKmMes: number | null = null;
    let kmPercorridos: number | null = null;

    if (pontosMes.length >= 2) {
      kmPercorridos = pontosMes[pontosMes.length - 1].km - pontosMes[0].km;
      custoKmMes = kmPercorridos > 0 ? totalMes / kmPercorridos : null;
    }

    dadosMensais.push({
      mes: nomeMes,
      mesKey,
      totalGasto: totalMes,
      custoKm: custoKmMes,
      kmPercorridos,
    });
  }

  return { custoAtual, kmTotalPercorrido, totalGasto, pontos: pontosKm, dadosMensais, minimoRegistros: false };
}

function BarraTendencia({ dados }: { dados: DadosMes[] }) {
  const validos = dados.filter(d => d.custoKm !== null);
  if (validos.length < 2) return null;

  const maxCusto = Math.max(...validos.map(d => d.custoKm!));
  const minCusto = Math.min(...validos.map(d => d.custoKm!));
  const range = maxCusto - minCusto || 1;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
        📈 Tendência — Custo por KM (últimos 6 meses)
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', height: '80px' }}>
        {dados.map((d, i) => {
          const altura = d.custoKm !== null
            ? 20 + ((d.custoKm - minCusto) / range) * 55
            : 0;
        const anterior = i > 0 ? dados[i - 1] : null;
        const subindo = d.custoKm !== null && anterior?.custoKm != null && d.custoKm > anterior.custoKm;
        const cor = d.custoKm === null ? '#e5e7eb' : subindo ? '#ef4444' : '#10b981';

          return (
            <div key={d.mesKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.6rem', color: '#6b7280', textAlign: 'center', lineHeight: 1 }}>
                {d.custoKm !== null ? `R$${d.custoKm.toFixed(2)}` : '—'}
              </div>
              <div style={{
                width: '100%',
                height: `${d.custoKm !== null ? altura : 8}px`,
                background: cor,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
                minHeight: '4px',
              }} />
              <div style={{ fontSize: '0.65rem', color: '#6b7280', textAlign: 'center' }}>{d.mes}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustoKm({ dadosPorMes }: Props) {
  const dados = useMemo(() => calcularDadosKm(dadosPorMes), [dadosPorMes]);

  // Verifica se há qualquer lançamento de veículo
  const temAlgumLancamento = Object.values(dadosPorMes).some(transacoes =>
    (transacoes || []).some(t =>
      t.tipo === 'despesa' &&
      CATEGORIAS_VEICULO.some(cat => t.categoria === cat || t.categoria?.includes('Manutenção') || t.categoria?.includes('Transporte'))
    )
  );

  if (!temAlgumLancamento) return null;

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      marginBottom: '1.5rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🚗</span>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#374151' }}>Custo por KM</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Análise de eficiência do veículo</div>
          </div>
        </div>
        {dados.custoAtual !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: dados.custoAtual > 0.8 ? '#ef4444' : dados.custoAtual > 0.5 ? '#f59e0b' : '#10b981' }}>
              R$ {dados.custoAtual.toFixed(3)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>por quilômetro</div>
          </div>
        )}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#ef4444' }}>
            {formatarMoeda(dados.totalGasto)}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem' }}>Total gasto</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151' }}>
            {dados.kmTotalPercorrido !== null ? `${dados.kmTotalPercorrido.toLocaleString('pt-BR')} km` : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem' }}>KM percorridos</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151' }}>
            {dados.pontos.length}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem' }}>Registros</div>
        </div>
      </div>

      {/* Aviso se poucos registros */}
      {dados.minimoRegistros && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          fontSize: '0.8rem',
          color: '#92400e',
          marginBottom: '0.75rem',
        }}>
          💡 Registre pelo menos <strong>2 abastecimentos com KM</strong> para calcular o custo por quilômetro.
          <br />
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Ex: digite "150 gasolina 45000km" no Adicionar Rápido</span>
        </div>
      )}

      {/* Gráfico de tendência */}
      {!dados.minimoRegistros && <BarraTendencia dados={dados.dadosMensais} />}

      {/* Últimos registros */}
      {dados.pontos.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            Últimos registros com KM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {dados.pontos.slice(-4).reverse().map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '0.375rem',
                fontSize: '0.8125rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⛽</span>
                  <div>
                    <div style={{ fontWeight: '500', color: '#374151' }}>{p.descricao}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      {new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {p.km.toLocaleString('pt-BR')} km
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: '700', color: '#ef4444' }}>{formatarMoeda(p.valor)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}