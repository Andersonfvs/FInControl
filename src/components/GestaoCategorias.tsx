'use client';

import { useState } from 'react';
import { Transacao, CategoriaTotal, FaturaMensal, CategoriaCustomizada } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';
import ModalTransacoesCategoria from '@/components/ModalTransacoesCategoria';
import ModalGerenciarCategorias from '@/components/ModalGerenciarCategorias';

interface Props {
  transacoes: Transacao[];
  mesReferencia: string;
  faturas: { [mesKey: string]: FaturaMensal[] };
  categoriasCustomizadas: CategoriaCustomizada[];
  onSalvarCategorias: (categorias: CategoriaCustomizada[]) => void;
}

const CORES = [
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6',
  '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16'
];

export default function GestaoCategorias({ transacoes, mesReferencia, faturas, categoriasCustomizadas, onSalvarCategorias }: Props) {
  const isMobile = useIsMobile();
  const [ordenacao, setOrdenacao] = useState<'nome' | 'valor' | 'percentual'>('valor');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'despesas' | 'receitas'>('despesas');
  const [incluirCartoes, setIncluirCartoes] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [modalGerenciarAberto, setModalGerenciarAberto] = useState(false);

  const calcularCategorias = (): CategoriaTotal[] => {
    const transacoesFiltradas = tipoFiltro === 'todos' 
      ? transacoes 
      : transacoes.filter(t => tipoFiltro === 'despesas' ? t.tipo === 'despesa' : t.tipo === 'renda');

    const categorias: { [key: string]: number } = {};

    transacoesFiltradas.forEach(t => {
      if (!categorias[t.categoria]) {
        categorias[t.categoria] = 0;
      }
      categorias[t.categoria] += t.valor;
    });

    if (incluirCartoes && (tipoFiltro === 'despesas' || tipoFiltro === 'todos')) {
      const faturasDoMes = faturas[mesReferencia] || [];
      
      faturasDoMes.forEach(fatura => {
        if (!fatura.paga) {
          fatura.itens.forEach(item => {
            if (!categorias[item.categoria]) {
              categorias[item.categoria] = 0;
            }
            categorias[item.categoria] += item.valor;
          });
        }
      });
    }

    const total = Object.values(categorias).reduce((sum, val) => sum + val, 0);

    let resultado = Object.entries(categorias)
      .map(([nome, valor]) => ({
        nome,
        total: valor,
        percentual: total > 0 ? (valor / total) * 100 : 0,
        cor: ''
      }));

    if (ordenacao === 'nome') {
      resultado.sort((a, b) => a.nome.localeCompare(b.nome));
    } else if (ordenacao === 'valor') {
      resultado.sort((a, b) => b.total - a.total);
    } else {
      resultado.sort((a, b) => b.percentual - a.percentual);
    }

    return resultado;
  };

  const categorias = calcularCategorias();
  const totalGeral = categorias.reduce((sum, c) => sum + c.total, 0);

  const handleClickCategoria = (nomeCategoria: string) => {
    setCategoriaSelecionada(nomeCategoria);
    setModalAberto(true);
  };

  if (transacoes.length === 0 && (faturas[mesReferencia] || []).length === 0) {
    return (
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Nenhuma transação ainda
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Adicione transações para ver suas categorias
        </p>
      </div>
    );
  }

  return (
    <>
      <div>
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          {/* Header — empilha no mobile */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? '1rem' : '0',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Categorias
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Análise detalhada dos gastos por categoria
              </p>
            </div>

            <div style={{
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: '0.75rem',
              textAlign: 'center',
              alignSelf: isMobile ? 'stretch' : 'auto'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Total {tipoFiltro === 'despesas' ? 'Gasto' : tipoFiltro === 'receitas' ? 'Recebido' : 'Geral'}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
                {formatarMoeda(totalGeral)}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setTipoFiltro('despesas')}
                style={{
                  padding: '0.5rem 1rem',
                  background: tipoFiltro === 'despesas' ? '#ef4444' : '#f3f4f6',
                  color: tipoFiltro === 'despesas' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {isMobile ? '💸' : '💸 Despesas'}
              </button>
              <button
                onClick={() => setTipoFiltro('receitas')}
                style={{
                  padding: '0.5rem 1rem',
                  background: tipoFiltro === 'receitas' ? '#10b981' : '#f3f4f6',
                  color: tipoFiltro === 'receitas' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {isMobile ? '💰' : '💰 Receitas'}
              </button>
              <button
                onClick={() => setTipoFiltro('todos')}
                style={{
                  padding: '0.5rem 1rem',
                  background: tipoFiltro === 'todos' ? '#06b6d4' : '#f3f4f6',
                  color: tipoFiltro === 'todos' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {isMobile ? '📊' : '📊 Todos'}
              </button>
            </div>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#f9fafb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={incluirCartoes}
                onChange={(e) => setIncluirCartoes(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#06b6d4'
                }}
              />
              {isMobile ? '💳 Cartão' : '💳 Incluir compras de cartão (não pagas)'}
            </label>

            <div style={{ flex: 1 }}></div>

            <button
              onClick={() => setModalGerenciarAberto(true)}
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
              {isMobile ? '⚙️' : '⚙️ Gerenciar Categorias'}
            </button>

            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="valor">Ordenar por Valor</option>
              <option value="percentual">Ordenar por %</option>
              <option value="nome">Ordenar por Nome</option>
            </select>
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}>
          {/* Cabeçalho da tabela — oculto no mobile */}
          {!isMobile && (
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 2fr',
              gap: '1rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div>Categoria</div>
              <div style={{ textAlign: 'right' }}>Valor</div>
              <div style={{ textAlign: 'right' }}>Percentual</div>
              <div>Distribuição</div>
            </div>
          )}

          {categorias.map((cat, index) => {
            const cor = CORES[index % CORES.length];

            if (isMobile) {
              // Mobile: card compacto com barra de progresso
              return (
                <div
                  key={`categoria-${cat.nome}`}
                  onClick={() => handleClickCategoria(cat.nome)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderBottom: index < categorias.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '2px',
                        background: cor,
                        flexShrink: 0
                      }}></div>
                      <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.9375rem' }}>
                        {cat.nome}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        background: '#f3f4f6',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {cat.percentual.toFixed(1)}%
                      </span>
                      <span style={{
                        fontWeight: '700',
                        fontSize: '1rem',
                        color: tipoFiltro === 'despesas' ? '#ef4444' : tipoFiltro === 'receitas' ? '#10b981' : '#374151'
                      }}>
                        {formatarMoeda(cat.total)}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#f3f4f6',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${cat.percentual}%`,
                      height: '100%',
                      background: cor,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              );
            }

            // Desktop: linha de tabela original
            return (
              <div
                key={`categoria-${cat.nome}`}
                onClick={() => handleClickCategoria(cat.nome)}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderBottom: index < categorias.length - 1 ? '1px solid #f3f4f6' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 2fr',
                  gap: '1rem',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    background: cor
                  }}></div>
                  <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.9375rem' }}>
                    {cat.nome}
                  </span>
                </div>

                <div style={{ 
                  textAlign: 'right', 
                  fontWeight: '700', 
                  fontSize: '1rem',
                  color: tipoFiltro === 'despesas' ? '#ef4444' : tipoFiltro === 'receitas' ? '#10b981' : '#374151'
                }}>
                  {formatarMoeda(cat.total)}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: '#f3f4f6',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    {cat.percentual.toFixed(1)}%
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#f3f4f6',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${cat.percentual}%`,
                      height: '100%',
                      background: cor,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo */}
        <div style={{
          marginTop: '1.5rem',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '1.5rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Total de Categorias
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#374151' }}>
                {categorias.length}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                Maior Categoria
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {categorias[0]?.nome || '-'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {categorias[0] ? formatarMoeda(categorias[0].total) : '-'}
              </div>
            </div>

            {/* Média — oculta no mobile para não quebrar o layout de 2 colunas */}
            {!isMobile && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Média por Categoria
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#374151' }}>
                  {categorias.length > 0 ? formatarMoeda(totalGeral / categorias.length) : '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ModalTransacoesCategoria
        aberto={modalAberto}
        categoria={categoriaSelecionada}
        transacoes={transacoes}
        faturas={faturas}
        mesReferencia={mesReferencia}
        incluirCartoes={incluirCartoes}
        onFechar={() => setModalAberto(false)}
      />

      <ModalGerenciarCategorias
        aberto={modalGerenciarAberto}
        categorias={categoriasCustomizadas}
        onFechar={() => setModalGerenciarAberto(false)}
        onSalvar={onSalvarCategorias}
      />
    </>
  );
}