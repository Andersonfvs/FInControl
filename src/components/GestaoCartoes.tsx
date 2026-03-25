'use client';

import { useState } from 'react';
import { CartaoCredito, ItemFatura, FaturaMensal } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  cartoes: CartaoCredito[];
  faturas: { [mesKey: string]: FaturaMensal[] };
  mesReferencia: string;
  onCadastrarCartao: () => void;
  onAdicionarCompra: (cartaoId: string) => void;
  onPagarFatura: (cartaoId: string, mesKey: string) => void;
}

export default function GestaoCartoes({ 
  cartoes, 
  faturas, 
  mesReferencia,
  onCadastrarCartao,
  onAdicionarCompra,
  onPagarFatura
}: Props) {
  const isMobile = useIsMobile();
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string | null>(null);

  const obterFatura = (cartaoId: string): FaturaMensal | null => {
    const faturasDoMes = faturas[mesReferencia] || [];
    return faturasDoMes.find(f => f.cartaoId === cartaoId) || null;
  };

  if (cartoes.length === 0) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Nenhum cartão cadastrado
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Cadastre seus cartões de crédito para gerenciar as faturas
        </p>
        <button
          onClick={onCadastrarCartao}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + Cadastrar Primeiro Cartão
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
          Meus Cartões
        </h3>
        <button
          onClick={onCadastrarCartao}
          style={{
            padding: '0.5rem 1rem',
            background: '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + {isMobile ? 'Novo' : 'Novo Cartão'}
        </button>
      </div>

      {/* Mobile: 1 coluna. Desktop: grid automático com mínimo de 320px */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        {cartoes.map(cartao => {
          const fatura = obterFatura(cartao.id);
          const totalFatura = fatura?.totalFatura || 0;
          const itensFatura = fatura?.itens || [];
          const estaPaga = fatura?.paga || false;

          return (
            <div
              key={cartao.id}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                overflow: 'hidden'
              }}
            >
              {/* Topo colorido */}
              <div style={{
                background: cartao.cor || '#06b6d4',
                padding: '1.5rem',
                color: 'white',
                position: 'relative',
                minHeight: isMobile ? '120px' : '160px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '2rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                      {cartao.bandeira}
                    </div>
                    <div style={{ fontSize: isMobile ? '1.125rem' : '1.25rem', fontWeight: '700' }}>
                      {cartao.nome}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem'
                  }}>
                    💳
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Limite: {formatarMoeda(cartao.limite)}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>
                  Vencimento: dia {cartao.diaVencimento}
                </div>
              </div>

              {/* Corpo */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Fatura atual
                    </div>
                    <div style={{
                      fontSize: isMobile ? '1.375rem' : '1.5rem',
                      fontWeight: '700',
                      color: estaPaga ? '#10b981' : '#374151'
                    }}>
                      {formatarMoeda(totalFatura)}
                    </div>
                  </div>
                  {estaPaga && (
                    <div style={{
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      ✓ Paga
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {itensFatura.length} {itensFatura.length === 1 ? 'compra' : 'compras'} neste mês
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onAdicionarCompra(cartao.id)}
                    style={{
                      flex: 1,
                      padding: '0.625rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    + Compra
                  </button>
                  
                  {totalFatura > 0 && !estaPaga && (
                    <button
                      onClick={() => onPagarFatura(cartao.id, mesReferencia)}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      {isMobile ? 'Pagar' : 'Pagar Fatura'}
                    </button>
                  )}

                  {itensFatura.length > 0 && (
                    <button
                      onClick={() => setCartaoSelecionado(cartaoSelecionado === cartao.id ? null : cartao.id)}
                      style={{
                        padding: '0.625rem 0.75rem',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        cursor: 'pointer'
                      }}
                    >
                      {cartaoSelecionado === cartao.id ? '▼' : '▶'}
                    </button>
                  )}
                </div>

                {cartaoSelecionado === cartao.id && itensFatura.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Itens da Fatura:
                    </div>
                    {itensFatura.map(item => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0',
                          borderBottom: '1px solid #f3f4f6',
                          fontSize: '0.8125rem'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                          <div style={{ fontWeight: '500', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.descricao}
                            {item.parcelamento && (
                              <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                background: '#f3f4f6',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.25rem'
                              }}>
                                {item.parcelamento.parcelaAtual}/{item.parcelamento.totalParcelas}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {item.categoria} • {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div style={{ fontWeight: '600', color: '#ef4444', flexShrink: 0 }}>
                          {formatarMoeda(item.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}