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
  onEditarCartao: (cartao: CartaoCredito) => void;
  onExcluirCartao: (cartaoId: string) => void;
  onExcluirItemFatura: (cartaoId: string, itemId: string, mesKey: string) => void;
  onEditarItemFatura: (cartaoId: string, item: ItemFatura, mesKey: string) => void;
}

export default function GestaoCartoes({
  cartoes,
  faturas,
  mesReferencia,
  onCadastrarCartao,
  onAdicionarCompra,
  onPagarFatura,
  onEditarCartao,
  onExcluirCartao,
  onExcluirItemFatura,
  onEditarItemFatura,
}: Props) {
  const isMobile = useIsMobile();
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [itemEditando, setItemEditando] = useState<{ cartaoId: string; item: ItemFatura } | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  const obterFatura = (cartaoId: string): FaturaMensal | null => {
    const faturasDoMes = faturas[mesReferencia] || [];
    return faturasDoMes.find(f => f.cartaoId === cartaoId) || null;
  };

  const handleExcluirCartao = (cartaoId: string) => {
    if (confirmandoExclusao === cartaoId) {
      onExcluirCartao(cartaoId);
      setConfirmandoExclusao(null);
      setMenuAberto(null);
    } else {
      setConfirmandoExclusao(cartaoId);
      setTimeout(() => setConfirmandoExclusao(null), 3000);
    }
  };

  const abrirEdicaoItem = (cartaoId: string, item: ItemFatura) => {
    setItemEditando({ cartaoId, item });
    setEditDescricao(item.descricao);
    setEditValor(String(item.valor));
    setEditCategoria(item.categoria);
  };

  const salvarEdicaoItem = () => {
    if (!itemEditando) return;
    const valorNum = parseFloat(editValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return;
    const itemAtualizado: ItemFatura = {
      ...itemEditando.item,
      descricao: editDescricao.trim() || itemEditando.item.descricao,
      valor: valorNum,
      categoria: editCategoria,
    };
    onEditarItemFatura(itemEditando.cartaoId, itemAtualizado, mesReferencia);
    setItemEditando(null);
  };

  if (cartoes.length === 0) {
    return (
      <div style={{
        background: 'white', border: '1px solid #e5e7eb',
        borderRadius: '0.5rem', padding: '3rem', textAlign: 'center',
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
            padding: '0.75rem 1.5rem', background: '#06b6d4', color: 'white',
            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: '500', cursor: 'pointer',
          }}
        >
          + Cadastrar Primeiro Cartão
        </button>
      </div>
    );
  }

  return (
    <div onClick={() => setMenuAberto(null)}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Meus Cartões</h3>
        <button
          onClick={onCadastrarCartao}
          style={{
            padding: '0.5rem 1rem', background: '#06b6d4', color: 'white',
            border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            fontWeight: '500', cursor: 'pointer',
          }}
        >
          + {isMobile ? 'Novo' : 'Novo Cartão'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {cartoes.map(cartao => {
          const fatura = obterFatura(cartao.id);
          const totalFatura = fatura?.totalFatura || 0;
          const itensFatura = fatura?.itens || [];
          const estaPaga = fatura?.paga || false;
          const excluindo = confirmandoExclusao === cartao.id;
          const menuEsteAberto = menuAberto === cartao.id;

          return (
            <div
              key={cartao.id}
              style={{
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: '0.75rem', overflow: 'hidden',
              }}
            >
              {/* Topo colorido */}
              <div style={{
                background: cartao.cor || '#06b6d4',
                padding: '1.5rem', color: 'white',
                position: 'relative',
                minHeight: isMobile ? '120px' : '160px',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: '2rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>
                      {cartao.bandeira}
                    </div>
                    <div style={{ fontSize: isMobile ? '1.125rem' : '1.25rem', fontWeight: '700' }}>
                      {cartao.nome}
                    </div>
                  </div>

                  {/* Menu 3 pontinhos ⋯ */}
                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setMenuAberto(menuEsteAberto ? null : cartao.id)}
                      style={{
                        background: menuEsteAberto ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
                        border: 'none', borderRadius: '0.375rem',
                        color: 'white', cursor: 'pointer',
                        padding: '0.2rem 0.75rem',
                        fontSize: '1.375rem', fontWeight: '700',
                        lineHeight: '1',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                      onMouseLeave={e => {
                        if (!menuEsteAberto) e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                      }}
                      title="Opções do cartão"
                    >
                      ···
                    </button>

                    {/* Dropdown menu */}
                    {menuEsteAberto && (
                      <div style={{
                        position: 'absolute', top: '110%', right: 0,
                        background: 'white', borderRadius: '0.5rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb',
                        zIndex: 50, minWidth: '170px', overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => { onEditarCartao(cartao); setMenuAberto(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.75rem 1rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.875rem', color: '#374151', textAlign: 'left',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          ✏️ Editar Cartão
                        </button>
                        <div style={{ height: '1px', background: '#f3f4f6' }} />
                        <button
                          onClick={() => handleExcluirCartao(cartao.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            width: '100%', padding: '0.75rem 1rem',
                            background: excluindo ? '#fef2f2' : 'none',
                            border: 'none', cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: excluindo ? '#dc2626' : '#6b7280',
                            textAlign: 'left',
                            fontWeight: excluindo ? '700' : '400',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                          onMouseLeave={e => {
                            if (!excluindo) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; }
                          }}
                        >
                          {excluindo ? '⚠️ Confirmar?' : '🗑️ Excluir Cartão'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Limite: {formatarMoeda(cartao.limite)}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>
                  Vencimento: dia {cartao.diaVencimento} • Fechamento: dia {cartao.diaFechamento}
                </div>
              </div>

              {/* Corpo */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '1rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Fatura atual
                    </div>
                    <div style={{
                      fontSize: isMobile ? '1.375rem' : '1.5rem',
                      fontWeight: '700',
                      color: estaPaga && totalFatura > 0 ? '#10b981' : totalFatura > 0 ? '#ef4444' : '#374151',
                    }}>
                      {formatarMoeda(totalFatura)}
                    </div>
                  </div>
                  {estaPaga && totalFatura > 0 ? (
                    <div style={{
                      background: '#d1fae5', color: '#065f46',
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                      fontSize: '0.75rem', fontWeight: '600',
                    }}>
                      ✓ Paga
                    </div>
                  ) : totalFatura > 0 ? (
                    <div style={{
                      background: '#fef2f2', color: '#991b1b',
                      padding: '0.375rem 0.75rem', borderRadius: '0.375rem',
                      fontSize: '0.75rem', fontWeight: '600',
                    }}>
                      ⏳ Pendente
                    </div>
                  ) : null}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {itensFatura.length} {itensFatura.length === 1 ? 'compra' : 'compras'} neste mês
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => onAdicionarCompra(cartao.id)}
                    style={{
                      flex: 1, padding: '0.625rem', background: '#f3f4f6',
                      color: '#374151', border: 'none', borderRadius: '0.5rem',
                      fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer',
                    }}
                  >
                    + Compra
                  </button>

                  {totalFatura > 0 && !estaPaga && (
                    <button
                      onClick={() => onPagarFatura(cartao.id, mesReferencia)}
                      style={{
                        flex: 1, padding: '0.625rem', background: '#10b981',
                        color: 'white', border: 'none', borderRadius: '0.5rem',
                        fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer',
                      }}
                    >
                      {isMobile ? 'Pagar' : 'Pagar Fatura'}
                    </button>
                  )}

                  {itensFatura.length > 0 && (
                    <button
                      onClick={() => setCartaoSelecionado(cartaoSelecionado === cartao.id ? null : cartao.id)}
                      style={{
                        padding: '0.625rem 0.75rem', background: '#f3f4f6',
                        color: '#374151', border: 'none', borderRadius: '0.5rem',
                        fontSize: '0.8125rem', cursor: 'pointer',
                      }}
                    >
                      {cartaoSelecionado === cartao.id ? '▼' : '▶'}
                    </button>
                  )}
                </div>

                {/* Lista de itens da fatura */}
                {cartaoSelecionado === cartao.id && itensFatura.length > 0 && (
                  <div style={{
                    marginTop: '1rem', paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                      Itens da Fatura:
                    </div>
                    {itensFatura.map((item: ItemFatura) => {
                      const esteItemEditando =
                        itemEditando?.item.id === item.id &&
                        itemEditando?.cartaoId === cartao.id;

                      return (
                        <div key={item.id}>
                          {/* Item normal */}
                          {!esteItemEditando && (
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', padding: '0.5rem 0',
                              borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem',
                            }}>
                              <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                <div style={{
                                  fontWeight: '500', color: '#374151',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {item.descricao}
                                  {item.parcelamento && (
                                    <span style={{
                                      marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280',
                                      background: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '0.25rem',
                                    }}>
                                      {item.parcelamento.parcelaAtual}/{item.parcelamento.totalParcelas}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {item.categoria} • {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                <span style={{ fontWeight: '600', color: '#ef4444', marginRight: '0.25rem', fontSize: '0.875rem' }}>
                                  {formatarMoeda(item.valor)}
                                </span>
                                <button
                                  onClick={() => abrirEdicaoItem(cartao.id, item)}
                                  title="Editar item"
                                  style={{
                                    background: '#f3f4f6', border: 'none', borderRadius: '0.375rem',
                                    cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.75rem',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remover "${item.descricao}" da fatura?`)) {
                                      onExcluirItemFatura(cartao.id, item.id, mesReferencia);
                                    }
                                  }}
                                  title="Remover da fatura"
                                  style={{
                                    background: '#fef2f2', border: 'none', borderRadius: '0.375rem',
                                    cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.75rem',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Formulário inline de edição */}
                          {esteItemEditando && (
                            <div style={{
                              padding: '0.75rem', margin: '0.25rem 0 0.5rem',
                              background: '#f0f9ff', borderRadius: '0.5rem',
                              border: '1px solid #bae6fd',
                            }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
                                ✏️ Editando item
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input
                                  type="text"
                                  value={editDescricao}
                                  onChange={e => setEditDescricao(e.target.value)}
                                  placeholder="Descrição"
                                  style={{
                                    padding: '0.5rem 0.625rem', border: '1px solid #bae6fd',
                                    borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none',
                                    background: 'white',
                                  }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                  <input
                                    type="number"
                                    value={editValor}
                                    onChange={e => setEditValor(e.target.value)}
                                    placeholder="Valor"
                                    style={{
                                      padding: '0.5rem 0.625rem', border: '1px solid #bae6fd',
                                      borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none',
                                      background: 'white',
                                    }}
                                  />
                                  <input
                                    type="text"
                                    value={editCategoria}
                                    onChange={e => setEditCategoria(e.target.value)}
                                    placeholder="Categoria"
                                    style={{
                                      padding: '0.5rem 0.625rem', border: '1px solid #bae6fd',
                                      borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none',
                                      background: 'white',
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={salvarEdicaoItem}
                                    style={{
                                      flex: 1, padding: '0.5rem', background: '#0ea5e9',
                                      color: 'white', border: 'none', borderRadius: '0.375rem',
                                      fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer',
                                    }}
                                  >
                                    💾 Salvar
                                  </button>
                                  <button
                                    onClick={() => setItemEditando(null)}
                                    style={{
                                      flex: 1, padding: '0.5rem', background: '#f3f4f6',
                                      color: '#374151', border: 'none', borderRadius: '0.375rem',
                                      fontSize: '0.8125rem', cursor: 'pointer',
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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