'use client';

import { Transacao, ItemFatura, FaturaMensal } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  categoria: string;
  transacoes: Transacao[];
  faturas: { [mesKey: string]: FaturaMensal[] };
  mesReferencia: string;
  incluirCartoes: boolean;
  onFechar: () => void;
}

export default function ModalTransacoesCategoria({
  aberto,
  categoria,
  transacoes,
  faturas,
  mesReferencia,
  incluirCartoes,
  onFechar
}: Props) {
  if (!aberto) return null;

  const transacoesDaCategoria = transacoes.filter(t => t.categoria === categoria);

  const itensCartao: ItemFatura[] = [];
  
  if (incluirCartoes) {
    const faturasDoMes = faturas[mesReferencia] || [];
    faturasDoMes.forEach(fatura => {
      if (!fatura.paga) {
        fatura.itens.forEach(item => {
          if (item.categoria === categoria) {
            itensCartao.push(item);
          }
        });
      }
    });
  }

  const total = transacoesDaCategoria.reduce((sum, t) => sum + t.valor, 0) +
                itensCartao.reduce((sum, i) => sum + i.valor, 0);

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.25rem' }}>
              {categoria}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {transacoesDaCategoria.length + itensCartao.length} transações • Total: {formatarMoeda(total)}
            </p>
          </div>
          <button
            onClick={onFechar}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              background: '#f3f4f6',
              color: '#6b7280',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem'
        }}>
          {transacoesDaCategoria.length === 0 && itensCartao.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p>Nenhuma transação nesta categoria</p>
            </div>
          )}

          {transacoesDaCategoria.length > 0 && (
            <div style={{ marginBottom: itensCartao.length > 0 ? '2rem' : '0' }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem'
              }}>
                Despesas Normais ({transacoesDaCategoria.length})
              </h3>
              {transacoesDaCategoria.map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: '#f9fafb',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      {t.descricao || categoria}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {t.pessoa}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    color: t.pago ? '#10b981' : '#ef4444'
                  }}>
                    {formatarMoeda(t.valor)}
                    <div style={{ fontSize: '0.75rem', fontWeight: '500', marginTop: '0.25rem' }}>
                      {t.pago ? '✓ Pago' : '⏱ Pendente'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {itensCartao.length > 0 && (
            <div>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '1rem'
              }}>
                Compras no Cartão - Não Pagas ({itensCartao.length})
              </h3>
              {itensCartao.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    background: '#fef3c7',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      {item.descricao}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                      {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')} • 💳 Cartão
                    </div>
                  </div>
                  <div style={{
                    fontWeight: '700',
                    fontSize: '1.125rem',
                    color: '#92400e'
                  }}>
                    {formatarMoeda(item.valor)}
                    <div style={{ fontSize: '0.75rem', fontWeight: '500', marginTop: '0.25rem' }}>
                      ⏱ Fatura não paga
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
            Total em {categoria}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
            {formatarMoeda(total)}
          </div>
        </div>
      </div>
    </div>
  );
}