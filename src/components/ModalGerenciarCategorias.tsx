'use client';

import { useState } from 'react';
import { CategoriaCustomizada } from '@/types';
import { gerarId } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  categorias: CategoriaCustomizada[];
  onFechar: () => void;
  onSalvar: (categorias: CategoriaCustomizada[]) => void;
}

export default function ModalGerenciarCategorias({ aberto, categorias, onFechar, onSalvar }: Props) {
  const [listaLocal, setListaLocal] = useState<CategoriaCustomizada[]>(categorias);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [tipoNova, setTipoNova] = useState<'despesa' | 'renda'>('despesa');

  if (!aberto) return null;

  const handleAdicionar = () => {
    if (!novaCategoria.trim()) {
      alert('Digite um nome para a categoria!');
      return;
    }

    const jaExiste = listaLocal.some(c => c.nome.toLowerCase() === novaCategoria.trim().toLowerCase());
    if (jaExiste) {
      alert('Essa categoria já existe!');
      return;
    }

    setListaLocal([...listaLocal, { id: gerarId(), nome: novaCategoria.trim(), tipo: tipoNova, icone: '🏷️' }]);
    setNovaCategoria('');
  };

  const handleRemover = (nome: string) => {
    if (confirm(`Tem certeza que deseja remover a categoria "${nome}"?`)) {
      setListaLocal(listaLocal.filter(c => c.nome !== nome));
    }
  };

  const handleSalvar = () => {
    onSalvar(listaLocal);
    onFechar();
  };

  const despesas = listaLocal.filter(c => c.tipo === 'despesa');
  const receitas = listaLocal.filter(c => c.tipo === 'renda');

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
          maxWidth: '700px',
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
              Gerenciar Categorias
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Adicione, edite ou remova suas categorias
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
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {/* Adicionar nova */}
          <div style={{
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              ➕ Adicionar Nova Categoria
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Nome da categoria"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdicionar()}
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
              <select
                value={tipoNova}
                onChange={(e) => setTipoNova(e.target.value as 'despesa' | 'renda')}
                style={{
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="despesa">💸 Despesa</option>
                <option value="renda">💰 Receita</option>
              </select>
              <button
                onClick={handleAdicionar}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Despesas */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              💸 Categorias de Despesas ({despesas.length})
            </h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {despesas.map(cat => (
                <div
                  key={cat.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#fef2f2',
                    borderRadius: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    {cat.nome}
                  </span>
                  <button
                    onClick={() => handleRemover(cat.nome)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Receitas */}
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              💰 Categorias de Receitas ({receitas.length})
            </h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {receitas.map(cat => (
                <div
                  key={cat.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#f0fdf4',
                    borderRadius: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    {cat.nome}
                  </span>
                  <button
                    onClick={() => handleRemover(cat.nome)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onFechar}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#f3f4f6',
              color: '#6b7280',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            style={{
              padding: '0.625rem 1.25rem',
              background: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}