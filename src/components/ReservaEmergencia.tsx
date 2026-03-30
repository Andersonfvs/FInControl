'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { formatarMoeda, formatarDataCurta } from '@/utils/financeiro';

interface TransacaoReserva {
  id: string;
  data: string;
  tipo: 'deposito' | 'retirada';
  valor: number;
  descricao: string;
  valorLiquido?: number;
  rendimentoBruto?: number;
  iof?: number;
  ir?: number;
  diasCorridos?: number;
}

interface ReservaEmergenciaData {
  transacoes: TransacaoReserva[];
  taxaCDIAnual: number;
  meta?: number;
  ultimoCreditoCDI?: string; // ISO date — controla quando foi o último crédito automático
}

interface Props {
  reserva: ReservaEmergenciaData;
  onSalvar: (reserva: ReservaEmergenciaData) => void;
}

// ─── Constantes fiscais ───────────────────────────────────────────────────────
const DIAS_UTEIS_ANO = 252;

const IOF_TABLE = [
  0.96, 0.93, 0.90, 0.86, 0.83, 0.80, 0.76, 0.73, 0.70, 0.66,
  0.63, 0.60, 0.56, 0.53, 0.50, 0.46, 0.43, 0.40, 0.36, 0.33,
  0.30, 0.26, 0.23, 0.20, 0.16, 0.13, 0.10, 0.06, 0.03, 0.00,
];

// ─── Funções de cálculo ───────────────────────────────────────────────────────
function calcularDiasCorridos(dataStr: string, hoje = new Date()): number {
  const inicio = new Date(dataStr + 'T00:00:00');
  const fim = new Date(hoje); fim.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 86400000));
}

function calcularDiasUteis(diasCorridos: number): number {
  return Math.round(diasCorridos * DIAS_UTEIS_ANO / 365);
}

function taxaDiariaCDI(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual / 100, 1 / DIAS_UTEIS_ANO) - 1;
}

function aliquotaIOF(diasCorridos: number): number {
  if (diasCorridos <= 0) return IOF_TABLE[0];
  if (diasCorridos >= 30) return 0;
  return IOF_TABLE[diasCorridos - 1];
}

function aliquotaIR(diasCorridos: number): number {
  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.20;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
}

function descricaoFaixaIR(diasCorridos: number): string {
  if (diasCorridos <= 180) return 'até 180 dias → 22,5%';
  if (diasCorridos <= 360) return '181–360 dias → 20%';
  if (diasCorridos <= 720) return '361–720 dias → 17,5%';
  return 'acima de 720 dias → 15%';
}

interface LoteCDI {
  id: string;
  data: string;
  principal: number;
}

interface SaldoCalculado {
  saldoBruto: number;
  saldoPrincipal: number;
  rendimentoAcumulado: number;
  taxaDiaria: number;
  diasMediosPonderados: number;
  lotes: LoteCDI[];
}

function calcularSaldo(transacoes: TransacaoReserva[], taxaAnual: number): SaldoCalculado {
  const lotes: LoteCDI[] = [];
  const ordenadas = [...transacoes].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
  );

  for (const t of ordenadas) {
    if (t.tipo === 'deposito') {
      lotes.push({ id: t.id, data: t.data, principal: t.valor });
    } else {
      let restante = t.valor;
      for (const lote of lotes) {
        if (restante <= 0 || lote.principal <= 0) continue;
        const consumido = Math.min(lote.principal, restante);
        lote.principal -= consumido;
        restante -= consumido;
      }
    }
  }

  const taxaDiaria = taxaDiariaCDI(taxaAnual);
  let saldoBruto = 0;
  let saldoPrincipal = 0;
  let pesoDias = 0;
  let pesoTotal = 0;

  for (const lote of lotes.filter(l => l.principal > 0)) {
    const diasCorridos = calcularDiasCorridos(lote.data);
    const diasUteis = calcularDiasUteis(diasCorridos);
    const valorAtual = lote.principal * Math.pow(1 + taxaDiaria, diasUteis);
    saldoBruto += valorAtual;
    saldoPrincipal += lote.principal;
    pesoDias += diasCorridos * lote.principal;
    pesoTotal += lote.principal;
  }

  return {
    saldoBruto,
    saldoPrincipal,
    rendimentoAcumulado: saldoBruto - saldoPrincipal,
    taxaDiaria,
    diasMediosPonderados: pesoTotal > 0 ? pesoDias / pesoTotal : 0,
    lotes: lotes.filter(l => l.principal > 0),
  };
}

function simularImpostosRetirada(valorRetirada: number, saldo: SaldoCalculado) {
  if (saldo.saldoBruto <= 0) return null;
  const ratioRendimento = saldo.rendimentoAcumulado / saldo.saldoBruto;
  const rendimentoBruto = valorRetirada * ratioRendimento;
  const diasCorridos = Math.round(saldo.diasMediosPonderados);
  const iof = rendimentoBruto * aliquotaIOF(diasCorridos);
  const baseIR = rendimentoBruto - iof;
  const ir = baseIR * aliquotaIR(diasCorridos);
  const totalImpostos = iof + ir;
  const valorLiquido = valorRetirada - totalImpostos;
  return { rendimentoBruto, iof, ir, totalImpostos, valorLiquido, diasCorridos, aliquotaIRDesc: descricaoFaixaIR(diasCorridos) };
}

// ─── Crédito automático CDI ───────────────────────────────────────────────────
/**
 * Calcula o rendimento de CADA lote de depósito entre duas datas,
 * gerando uma única transação de "📈 Rendimento CDI" com o total.
 * Retorna null se não há saldo ou dias a creditar.
 */
function calcularRendimentoPeriodo(
  transacoes: TransacaoReserva[],
  taxaAnual: number,
  dataInicio: string,
  dataFim: string,
): number | null {
  if (!dataInicio) return null;
  const diasCorridos = calcularDiasCorridos(dataInicio, new Date(dataFim + 'T00:00:00'));
  if (diasCorridos <= 0) return null;

  // Saldo na data de início (sem contar o rendimento do período)
  const saldoInicio = calcularSaldo(transacoes, taxaAnual);
  if (saldoInicio.saldoBruto <= 0) return null;

  const taxaDiaria = taxaDiariaCDI(taxaAnual);
  const diasUteis = calcularDiasUteis(diasCorridos);
  // Rendimento do período = saldo * ((1+d)^n - 1)
  const rendimento = saldoInicio.saldoBruto * (Math.pow(1 + taxaDiaria, diasUteis) - 1);
  return rendimento > 0.001 ? rendimento : null; // ignora valores insignificantes
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ReservaEmergencia({ reserva, onSalvar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState<'deposito' | 'retirada'>('deposito');
  const [valorInput, setValorInput] = useState('');
  const [descricaoInput, setDescricaoInput] = useState('');
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(String(reserva.meta || ''));
  const [editandoCDI, setEditandoCDI] = useState(false);
  const [cdiInput, setCdiInput] = useState(String(reserva.taxaCDIAnual || 14.9));
  const creditouRef = useRef(false); // evita crédito duplo na mesma sessão

  const transacoes = useMemo(() => reserva.transacoes || [], [reserva.transacoes]);
  const taxaCDI = reserva.taxaCDIAnual || 14.9;
  const meta = reserva.meta || 0;

  // ── Crédito automático de CDI ao abrir o app ──────────────────────────────
  useEffect(() => {
    if (creditouRef.current) return; // já rodou nesta sessão
    if (transacoes.length === 0) return; // sem depósitos

    const hoje = new Date().toISOString().split('T')[0];
    const ultimoCredito = reserva.ultimoCreditoCDI;

    // Só credita se nunca creditou antes ou se já passou 1 dia
    if (ultimoCredito && ultimoCredito >= hoje) return;

    const dataInicio = ultimoCredito || transacoes
      .filter(t => t.tipo === 'deposito')
      .sort((a, b) => a.data.localeCompare(b.data))[0]?.data;

    if (!dataInicio || dataInicio >= hoje) return;

    const rendimento = calcularRendimentoPeriodo(transacoes, taxaCDI, dataInicio, hoje);
    if (!rendimento) return;

    creditouRef.current = true;

    const novaTransacao: TransacaoReserva = {
      id: `cdi_${Date.now()}`,
      data: hoje,
      tipo: 'deposito',
      valor: parseFloat(rendimento.toFixed(2)),
      descricao: `📈 Rendimento CDI (${taxaCDI}% a.a.)`,
    };

    onSalvar({
      ...reserva,
      transacoes: [...transacoes, novaTransacao],
      ultimoCreditoCDI: hoje,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // roda apenas uma vez ao montar

  const saldo = useMemo(() => calcularSaldo(transacoes, taxaCDI), [transacoes, taxaCDI]);

  const valorRetirada = parseFloat(valorInput.replace(',', '.')) || 0;
  const simulacaoImpostos = tipoMovimento === 'retirada' && valorRetirada > 0
    ? simularImpostosRetirada(valorRetirada, saldo)
    : null;

  const percentualMeta = meta > 0 ? Math.min((saldo.saldoBruto / meta) * 100, 100) : 0;
  const faltaParaMeta = Math.max(meta - saldo.saldoBruto, 0);
  const corBarra = percentualMeta >= 100 ? '#10b981' : percentualMeta >= 50 ? '#f59e0b' : '#ef4444';
  const rendimentoMensalEstimado = saldo.saldoBruto * (Math.pow(1 + saldo.taxaDiaria, 21) - 1);
  const rendimentoAnualEstimado = saldo.saldoBruto * (Math.pow(1 + saldo.taxaDiaria, DIAS_UTEIS_ANO) - 1);

  const handleMovimento = () => {
    const valor = parseFloat(valorInput.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) return;
    if (tipoMovimento === 'retirada' && valor > saldo.saldoBruto) {
      alert('Valor maior que o saldo disponível!');
      return;
    }
    const novaTransacao: TransacaoReserva = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      data: new Date().toISOString().split('T')[0],
      tipo: tipoMovimento,
      valor,
      descricao: descricaoInput.trim() || (tipoMovimento === 'deposito' ? 'Depósito' : 'Retirada'),
      ...(tipoMovimento === 'retirada' && simulacaoImpostos ? {
        valorLiquido: simulacaoImpostos.valorLiquido,
        rendimentoBruto: simulacaoImpostos.rendimentoBruto,
        iof: simulacaoImpostos.iof,
        ir: simulacaoImpostos.ir,
        diasCorridos: simulacaoImpostos.diasCorridos,
      } : {}),
    };
    onSalvar({ ...reserva, transacoes: [...transacoes, novaTransacao] });
    setValorInput('');
    setDescricaoInput('');
    setModalAberto(false);
  };

  const handleSalvarMeta = () => {
    const valor = parseFloat(metaInput.replace(',', '.'));
    if (!isNaN(valor) && valor >= 0) onSalvar({ ...reserva, meta: valor });
    setEditandoMeta(false);
  };

  const handleSalvarCDI = () => {
    const valor = parseFloat(cdiInput.replace(',', '.'));
    if (!isNaN(valor) && valor > 0) onSalvar({ ...reserva, taxaCDIAnual: valor });
    setEditandoCDI(false);
  };

  const handleExcluirTransacao = (id: string) => {
    if (!confirm('Remover este lançamento?')) return;
    onSalvar({ ...reserva, transacoes: transacoes.filter(t => t.id !== id) });
  };

  return (
    <>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', marginBottom: '1.5rem', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div onClick={() => setExpandido(!expandido)} style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#374151' }}>Reserva de Emergência</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                {meta > 0 ? `${percentualMeta.toFixed(1)}% da meta atingida` : 'Configure sua meta'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.375rem', fontWeight: '700', color: saldo.saldoBruto > 0 ? '#10b981' : '#374151' }}>
                {formatarMoeda(saldo.saldoBruto)}
              </div>
              {saldo.rendimentoAcumulado > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#10b981' }}>+{formatarMoeda(saldo.rendimentoAcumulado)} rendimento</div>
              )}
            </div>
            <span style={{ color: '#9ca3af', fontSize: '1rem' }}>{expandido ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* ── Barra de progresso ── */}
        {meta > 0 && (
          <div style={{ padding: '0 1.25rem 1rem' }}>
            <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${percentualMeta}%`, height: '100%', background: corBarra, borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.7rem', color: '#9ca3af' }}>
              <span>{formatarMoeda(saldo.saldoBruto)}</span>
              <span>Meta: {formatarMoeda(meta)}</span>
            </div>
          </div>
        )}

        {/* ── Corpo expandível ── */}
        {expandido && (
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '1.25rem' }}>

            {/* Grid de métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

              <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>🎯 Meta</div>
                {editandoMeta ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" value={metaInput} onChange={e => setMetaInput(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleSalvarMeta()} style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid #06b6d4', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                    <button onClick={handleSalvarMeta} style={{ background: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>✓</button>
                  </div>
                ) : (
                  <div onClick={() => { setEditandoMeta(true); setMetaInput(String(meta || '')); }} style={{ fontSize: '1rem', fontWeight: '700', color: '#374151', cursor: 'pointer' }} title="Clique para editar">
                    {meta > 0 ? formatarMoeda(meta) : <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Definir ✏️</span>}
                  </div>
                )}
              </div>

              {meta > 0 && (
                <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>📈 Falta para meta</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: faltaParaMeta > 0 ? '#f59e0b' : '#10b981' }}>
                    {faltaParaMeta > 0 ? formatarMoeda(faltaParaMeta) : '✓ Atingida!'}
                  </div>
                </div>
              )}

              <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>📊 Taxa CDI/ano</div>
                {editandoCDI ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="number" value={cdiInput} onChange={e => setCdiInput(e.target.value)} autoFocus step="0.1" onKeyDown={e => e.key === 'Enter' && handleSalvarCDI()} style={{ width: '100%', padding: '0.25rem 0.5rem', border: '1px solid #06b6d4', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                    <button onClick={handleSalvarCDI} style={{ background: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}>✓</button>
                  </div>
                ) : (
                  <div onClick={() => { setEditandoCDI(true); setCdiInput(String(taxaCDI)); }} style={{ cursor: 'pointer' }} title="Clique para editar">
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#374151' }}>{taxaCDI}% ✏️</div>
                    <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{(saldo.taxaDiaria * 100).toFixed(4)}% ao dia</div>
                  </div>
                )}
              </div>

              <div style={{ background: saldo.rendimentoAcumulado > 0 ? '#f0fdf4' : '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>💹 Rendimento acumulado</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>+{formatarMoeda(saldo.rendimentoAcumulado)}</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>≈ {formatarMoeda(rendimentoMensalEstimado)}/mês</div>
              </div>

              <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>🗓️ Projeção anual</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>+{formatarMoeda(rendimentoAnualEstimado)}</div>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>juros compostos CDI</div>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>🏦 Principal investido</div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#374151' }}>{formatarMoeda(saldo.saldoPrincipal)}</div>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                  {reserva.ultimoCreditoCDI ? `Último crédito: ${formatarDataCurta(reserva.ultimoCreditoCDI)}` : 'sem depósitos'}
                </div>
              </div>
            </div>

            {saldo.saldoPrincipal > 0 && (
              <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                ⚠️ <strong>Impostos estimados na retirada:</strong> IOF (primeiros 30 dias, regressivo) + IR ({descricaoFaixaIR(Math.round(saldo.diasMediosPonderados))}). Incidem apenas sobre o rendimento.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => { setTipoMovimento('deposito'); setValorInput(''); setDescricaoInput(''); setModalAberto(true); }}
                style={{ flex: 1, padding: '0.625rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}>
                ⬆️ Depositar
              </button>
              <button onClick={() => { setTipoMovimento('retirada'); setValorInput(''); setDescricaoInput(''); setModalAberto(true); }}
                disabled={saldo.saldoBruto <= 0}
                style={{ flex: 1, padding: '0.625rem', background: saldo.saldoBruto > 0 ? '#ef4444' : '#f3f4f6', color: saldo.saldoBruto > 0 ? 'white' : '#9ca3af', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: saldo.saldoBruto > 0 ? 'pointer' : 'not-allowed' }}>
                ⬇️ Retirar
              </button>
            </div>

            {transacoes.length > 0 ? (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Histórico</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[...transacoes].reverse().slice(0, 15).map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: t.tipo === 'deposito' ? '#f0fdf4' : '#fef2f2', borderRadius: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                        <span>{t.tipo === 'deposito' ? (t.descricao.includes('Rendimento') ? '📈' : '⬆️') : '⬇️'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao}</div>
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            {formatarDataCurta(t.data)}
                            {t.tipo === 'retirada' && t.iof !== undefined && (
                              <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
                                IOF {formatarMoeda(t.iof)} · IR {formatarMoeda(t.ir || 0)} · líq. {formatarMoeda(t.valorLiquido || t.valor)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ fontWeight: '700', fontSize: '0.875rem', color: t.tipo === 'deposito' ? '#10b981' : '#ef4444' }}>
                          {t.tipo === 'deposito' ? '+' : '-'}{formatarMoeda(t.valor)}
                        </span>
                        <button onClick={() => handleExcluirTransacao(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', padding: '0.125rem 0.25rem' }} title="Remover">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                Nenhuma movimentação ainda. Faça seu primeiro depósito!
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalAberto && (
        <div onClick={() => setModalAberto(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '420px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151' }}>
                {tipoMovimento === 'deposito' ? '⬆️ Depositar na Reserva' : '⬇️ Retirar da Reserva'}
              </h3>
              <button onClick={() => setModalAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280' }}>✕</button>
            </div>

            {tipoMovimento === 'retirada' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#991b1b' }}>
                ⚠️ Saldo disponível: <strong>{formatarMoeda(saldo.saldoBruto)}</strong>
                {saldo.rendimentoAcumulado > 0 && <span> (principal {formatarMoeda(saldo.saldoPrincipal)} + rendimento {formatarMoeda(saldo.rendimentoAcumulado)})</span>}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Valor (R$)</label>
              <input type="number" placeholder="0,00" value={valorInput} onChange={e => setValorInput(e.target.value)} autoFocus min="0.01" step="0.01"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Descrição (opcional)</label>
              <input type="text" placeholder={tipoMovimento === 'deposito' ? 'Ex: Sobra do mês' : 'Ex: Emergência médica'} value={descricaoInput} onChange={e => setDescricaoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMovimento()}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>

            {tipoMovimento === 'retirada' && simulacaoImpostos && valorRetirada > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>📊 Simulação de impostos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: '#374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Valor bruto</span><span>{formatarMoeda(valorRetirada)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rendimento</span><span style={{ color: '#10b981' }}>+{formatarMoeda(simulacaoImpostos.rendimentoBruto)}</span></div>
                  {simulacaoImpostos.iof > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IOF ({simulacaoImpostos.diasCorridos} dias)</span><span style={{ color: '#ef4444' }}>-{formatarMoeda(simulacaoImpostos.iof)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>IR ({simulacaoImpostos.aliquotaIRDesc})</span><span style={{ color: '#ef4444' }}>-{formatarMoeda(simulacaoImpostos.ir)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fde68a', paddingTop: '0.3rem', fontWeight: '700' }}>
                    <span>Você recebe</span><span style={{ color: '#10b981', fontSize: '0.9rem' }}>{formatarMoeda(simulacaoImpostos.valorLiquido)}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '0.75rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleMovimento} disabled={!valorInput || valorRetirada <= 0}
                style={{ flex: 1, padding: '0.75rem', background: tipoMovimento === 'deposito' ? '#10b981' : '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: !valorInput || valorRetirada <= 0 ? 'not-allowed' : 'pointer', opacity: !valorInput || valorRetirada <= 0 ? 0.5 : 1 }}>
                {tipoMovimento === 'deposito' ? 'Depositar' : `Retirar${simulacaoImpostos ? ` (líq. ${formatarMoeda(simulacaoImpostos.valorLiquido)})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}