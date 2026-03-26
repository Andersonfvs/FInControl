'use client';

import { useState } from 'react';
import { Transacao } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';
import { obterIconeCategoria, parsearInputMagico, DadosInputMagico } from '@/utils/categorias';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  transacoes: Transacao[];
  usuarioNome: string;
  onEditar: (transacao: Transacao) => void;
  onExcluir: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onDuplicar: (transacao: Transacao) => void;
  onInputMagico: (dados: DadosInputMagico) => void;
  onToast: (mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' | 'info') => void;
}

export default function ListaTransacoes({
  transacoes, usuarioNome, onEditar, onExcluir,
  onMarcarPago, onDuplicar, onInputMagico, onToast
}: Props) {
  const isMobile = useIsMobile();
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<'data' | 'valor' | 'categoria'>('data');
  const [carregandoId, setCarregandoId] = useState<string | null>(null);
  const [inputMagico, setInputMagico] = useState('');

  const transacoesFiltradas = transacoes.filter(t => {
    const termo = busca.toLowerCase();
    return (
      t.descricao.toLowerCase().includes(termo) ||
      t.categoria.toLowerCase().includes(termo) ||
      t.pessoa.toLowerCase().includes(termo)
    );
  });

  const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => {
    if (ordenacao === 'data') return new Date(b.data).getTime() - new Date(a.data).getTime();
    if (ordenacao === 'valor') return b.valor - a.valor;
    return a.categoria.localeCompare(b.categoria);
  });

  const handleMarcarPago = async (id: string) => {
    setCarregandoId(id);
    await onMarcarPago(id);
    setCarregandoId(null);
  };

  const handleExcluir = (transacao: Transacao) => {
    if (confirm(`Excluir "${transacao.descricao}"?\nEsta ação não pode ser desfeita.`)) {
      onExcluir(transacao.id);
    }
  };

  const handleInputMagicoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const texto = inputMagico.trim();
    if (!texto) return;

    const dados = parsearInputMagico(texto, usuarioNome);
    if (!dados) {
      onToast('Não entendi o valor. Tente: "35 lanche ontem" ou "120,50 mercado hoje"', 'erro');
      return;
    }

    onToast('✨ Input processado! Verifique e salve.', 'info');
    setInputMagico('');
    onInputMagico(dados);
  };

  if (transacoes.length === 0) {
    return (
      <div>
        <InputMagicoField value={inputMagico} onChange={setInputMagico} onKeyDown={handleInputMagicoKeyDown} />
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nenhuma transação ainda</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Adicione receitas ou despesas para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <InputMagicoField value={inputMagico} onChange={setInputMagico} onKeyDown={handleInputMagicoKeyDown} />

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Buscar..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: '180px', padding: '0.625rem 1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}
        />
        <select
          value={ordenacao}
          onChange={e => setOrdenacao(e.target.value as any)}
          style={{ padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', background: 'white' }}
        >
          <option value="data">📅 Data</option>
          <option value="valor">💰 Valor</option>
          <option value="categoria">🏷️ Categoria</option>
        </select>
        <div style={{ padding: '0.5rem 0.875rem', background: '#f9fafb', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#6b7280', fontWeight: '500', whiteSpace: 'nowrap' }}>
          {transacoesFiltradas.length} de {transacoes.length}
        </div>
      </div>

      {/* MOBILE */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {transacoesOrdenadas.map((transacao, index) => {
            const isPago = transacao.pago;
            const isReceita = transacao.tipo === 'renda';
            const isCarregando = carregandoId === transacao.id;
            const icone = obterIconeCategoria(transacao.categoria);
            // Campos extras via cast seguro
            const parcelamento = (transacao as any).parcelamento as { parcelaAtual: number; totalParcelas: number } | undefined;
            const dividido = (transacao as any).dividido as boolean | undefined;
            const notaFiscalUrl = (transacao as any).notaFiscalUrl as string | undefined;

            return (
              <div key={`mob-${transacao.id}-${index}`} style={{
                background: isPago && !isReceita ? '#f0fdf4' : 'white',
                border: `1px solid ${isPago && !isReceita ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: '0.75rem', padding: '1rem', transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                    {new Date(transacao.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '1.0625rem', color: isReceita ? '#10b981' : isPago ? '#9ca3af' : '#ef4444', textDecoration: isPago && !isReceita ? 'line-through' : 'none' }}>
                    {isReceita ? '+' : '-'}{formatarMoeda(transacao.valor)}
                  </div>
                </div>
                <div style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#374151', marginBottom: '0.5rem', textDecoration: isPago && !isReceita ? 'line-through' : 'none', opacity: isPago && !isReceita ? 0.65 : 1 }}>
                  {transacao.descricao}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span style={{ background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#374151', fontWeight: '500' }}>
                    {icone} {transacao.categoria}
                  </span>
                  <span style={{ background: '#f3f4f6', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    👤 {transacao.pessoa.split(' ')[0]}
                  </span>
                  {parcelamento && (
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      {parcelamento.parcelaAtual}/{parcelamento.totalParcelas}
                    </span>
                  )}
                  {dividido && (
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      50%
                    </span>
                  )}
                  {notaFiscalUrl && (
                    <span style={{ background: '#f0fdf4', color: '#065f46', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      🧾 NF-e
                    </span>
                  )}
                  {isPago && (
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
                      ✓ Pago
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', marginRight: 'auto', fontSize: '0.8125rem', color: '#6b7280', fontWeight: '500' }}>
                    {isCarregando
                      ? <div style={{ width: '18px', height: '18px', border: '2px solid #e5e7eb', borderTop: '2px solid #06b6d4', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      : <input type="checkbox" checked={isPago} onChange={() => handleMarcarPago(transacao.id)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: isReceita ? '#10b981' : '#ef4444' }} />}
                    {isPago ? 'Pago' : 'Pendente'}
                  </label>
                  <button onClick={() => onEditar(transacao)} style={{ padding: '0.5rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                  <button onClick={() => onDuplicar(transacao)} style={{ padding: '0.5rem 0.75rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>📋</button>
                  <button onClick={() => handleExcluir(transacao)} style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DESKTOP */
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'grid', gridTemplateColumns: '40px 100px 2fr 1fr 120px 130px 80px', gap: '1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>Status</div><div>Data</div><div>Descrição</div><div>Categoria</div><div>Pessoa</div><div style={{ textAlign: 'right' }}>Valor</div><div style={{ textAlign: 'center' }}>Ações</div>
          </div>

          {transacoesOrdenadas.map((transacao, index) => {
            const isPago = transacao.pago;
            const isReceita = transacao.tipo === 'renda';
            const isCarregando = carregandoId === transacao.id;
            const icone = obterIconeCategoria(transacao.categoria);
            const parcelamento = (transacao as any).parcelamento as { parcelaAtual: number; totalParcelas: number } | undefined;
            const dividido = (transacao as any).dividido as boolean | undefined;
            const notaFiscalUrl = (transacao as any).notaFiscalUrl as string | undefined;

            return (
              <div
                key={`desk-${transacao.id}-${index}`}
                style={{ padding: '0.875rem 1.5rem', borderBottom: index < transacoesOrdenadas.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'grid', gridTemplateColumns: '40px 100px 2fr 1fr 120px 130px 80px', gap: '1rem', alignItems: 'center', background: isPago && !isReceita ? '#f0fdf4' : 'white', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!isPago) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isPago && !isReceita ? '#f0fdf4' : 'white'; }}
              >
                <div>
                  {isCarregando
                    ? <div style={{ width: '18px', height: '18px', border: '2px solid #e5e7eb', borderTop: '2px solid #06b6d4', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    : <input type="checkbox" checked={isPago} onChange={() => handleMarcarPago(transacao.id)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: isReceita ? '#10b981' : '#ef4444' }} />}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {new Date(transacao.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.9375rem', marginBottom: '0.2rem', textDecoration: isPago && !isReceita ? 'line-through' : 'none', opacity: isPago && !isReceita ? 0.7 : 1 }}>
                    {transacao.descricao}
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', fontSize: '0.75rem' }}>
                    {parcelamento && (
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '600' }}>
                        {parcelamento.parcelaAtual}/{parcelamento.totalParcelas}
                      </span>
                    )}
                    {dividido && (
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '600' }}>50%</span>
                    )}
                    {notaFiscalUrl && (
                      <span style={{ background: '#f0fdf4', color: '#065f46', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '600' }}>🧾 NF-e</span>
                    )}
                    {isPago && (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: '600' }}>✓ Pago</span>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ background: '#f3f4f6', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#374151', fontWeight: '500' }}>
                    {icone} {transacao.categoria}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{transacao.pessoa.split(' ')[0]}</div>
                <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '1rem', color: isReceita ? '#10b981' : isPago ? '#9ca3af' : '#ef4444', textDecoration: isPago && !isReceita ? 'line-through' : 'none' }}>
                  {isReceita ? '+' : '-'}{formatarMoeda(transacao.valor)}
                </div>
                <div style={{ display: 'flex', gap: '0.125rem', justifyContent: 'center' }}>
                  {[
                    { icon: '✏️', fn: () => onEditar(transacao) },
                    { icon: '📋', fn: () => onDuplicar(transacao) },
                    { icon: '🗑️', fn: () => handleExcluir(transacao) },
                  ].map((btn, bi) => (
                    <button key={bi} onClick={btn.fn}
                      style={{ padding: '0.375rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function InputMagicoField({ value, onChange, onKeyDown }: {
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.125rem', pointerEvents: 'none' }}>✨</span>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ex: '35 lanche ontem' ou '120,50 mercado hoje anderson' — pressione Enter"
          style={{
            width: '100%',
            padding: '0.875rem 1rem 0.875rem 2.75rem',
            border: '2px solid #e0f2fe',
            borderRadius: '0.75rem',
            fontSize: '0.9375rem',
            background: 'linear-gradient(135deg, #f0f9ff, #fafafa)',
            outline: 'none',
            color: '#374151',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e0f2fe'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {value && (
          <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#06b6d4', fontWeight: '600', background: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '0.375rem' }}>
            Enter ↵
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.375rem', marginLeft: '0.25rem' }}>
        💡 Digite uma despesa rapidamente e pressione Enter para preencher o formulário automaticamente.
      </p>
    </div>
  );
}