'use client';

import { useState, useEffect } from 'react';
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
  // ID da categoria com painel de palavras-chave aberto
  const [editandoKeywordsId, setEditandoKeywordsId] = useState<string | null>(null);
  const [novaKeyword, setNovaKeyword] = useState('');

  // ESC fecha o modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    if (aberto) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [aberto, onFechar]);

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
    setListaLocal([...listaLocal, {
      id: gerarId(),
      nome: novaCategoria.trim(),
      tipo: tipoNova,
      icone: '🏷️',
      palavrasChave: [],
    }]);
    setNovaCategoria('');
  };

  const handleRemover = (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover a categoria "${nome}"?`)) {
      setListaLocal(listaLocal.filter(c => c.id !== id));
      if (editandoKeywordsId === id) setEditandoKeywordsId(null);
    }
  };

  const handleAdicionarKeyword = (catId: string) => {
    const palavra = novaKeyword.trim().toLowerCase();
    if (!palavra) return;
    setListaLocal(listaLocal.map(c => {
      if (c.id !== catId) return c;
      const jaExiste = (c.palavrasChave || []).includes(palavra);
      if (jaExiste) return c;
      return { ...c, palavrasChave: [...(c.palavrasChave || []), palavra] };
    }));
    setNovaKeyword('');
  };

  const handleRemoverKeyword = (catId: string, keyword: string) => {
    setListaLocal(listaLocal.map(c => {
      if (c.id !== catId) return c;
      return { ...c, palavrasChave: (c.palavrasChave || []).filter(k => k !== keyword) };
    }));
  };

  const handleSalvar = () => {
    onSalvar(listaLocal);
    onFechar();
  };

  const despesas = listaLocal.filter(c => c.tipo === 'despesa');
  const receitas = listaLocal.filter(c => c.tipo === 'renda');

  const renderCategoria = (cat: CategoriaCustomizada, bgCard: string) => {
    const aberto = editandoKeywordsId === cat.id;
    const keywords = cat.palavrasChave || [];

    return (
      <div key={cat.id} style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        {/* Linha principal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: bgCard,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>{cat.nome}</span>
            {keywords.length > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#6b7280', background: 'rgba(0,0,0,0.06)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                {keywords.length} keyword{keywords.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => {
                setEditandoKeywordsId(aberto ? null : cat.id);
                setNovaKeyword('');
              }}
              title="Gerenciar palavras-chave"
              style={{
                padding: '0.25rem 0.625rem',
                background: aberto ? '#06b6d4' : '#f3f4f6',
                color: aberto ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              🏷️ {aberto ? 'Fechar' : 'Keywords'}
            </button>
            <button
              onClick={() => handleRemover(cat.id, cat.nome)}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Remover
            </button>
          </div>
        </div>

        {/* Painel de palavras-chave — expandível */}
        {aberto && (
          <div style={{
            padding: '0.875rem 1rem',
            background: '#f0f9ff',
            borderTop: '1px solid #bae6fd',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.625rem' }}>
              💡 Palavras que ativam esta categoria no Adicionar Rápido
            </div>

            {/* Tags existentes */}
            {keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                {keywords.map(kw => (
                  <span
                    key={kw}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      background: '#e0f2fe', color: '#0369a1',
                      padding: '0.2rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.8rem', fontWeight: '500',
                    }}
                  >
                    {kw}
                    <button
                      onClick={() => handleRemoverKeyword(cat.id, kw)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}
                      title="Remover palavra-chave"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input para nova keyword */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={novaKeyword}
                onChange={e => setNovaKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdicionarKeyword(cat.id)}
                placeholder='Ex: "unimed", "farmacia", "posto"'
                style={{
                  flex: 1,
                  padding: '0.5rem 0.625rem',
                  border: '1px solid #bae6fd',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  background: 'white',
                }}
              />
              <button
                onClick={() => handleAdicionarKeyword(cat.id)}
                style={{
                  padding: '0.5rem 0.875rem',
                  background: '#06b6d4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + Adicionar
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.375rem' }}>
              Digite uma palavra e pressione Enter ou clique em Adicionar
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151', marginBottom: '0.25rem' }}>
              Gerenciar Categorias
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Adicione categorias e configure palavras-chave para o Adicionar Rápido
            </p>
          </div>
          <button
            onClick={onFechar}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: 'none', background: '#f3f4f6',
              color: '#6b7280', fontSize: '1.25rem', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Corpo scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {/* Adicionar nova */}
          <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              ➕ Adicionar Nova Categoria
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                type="text"
                placeholder="Nome da categoria"
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdicionar()}
                style={{
                  flex: 1, padding: '0.625rem',
                  border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem',
                }}
              />
              <select
                value={tipoNova}
                onChange={e => setTipoNova(e.target.value as 'despesa' | 'renda')}
                style={{ padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}
              >
                <option value="despesa">💸 Despesa</option>
                <option value="renda">💰 Receita</option>
              </select>
              <button
                onClick={handleAdicionar}
                style={{
                  padding: '0.625rem 1.25rem', background: '#10b981',
                  color: 'white', border: 'none', borderRadius: '0.5rem',
                  fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Adicionar
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              💡 Após criar a categoria, clique em <strong>🏷️ Keywords</strong> para adicionar palavras que a ativam no Adicionar Rápido
            </div>
          </div>

          {/* Lista Despesas */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '1rem' }}>
              💸 Categorias de Despesas ({despesas.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {despesas.map(cat => renderCategoria(cat, '#fef2f2'))}
              {despesas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                  Nenhuma categoria de despesa cadastrada
                </div>
              )}
            </div>
          </div>

          {/* Lista Receitas */}
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '1rem' }}>
              💰 Categorias de Receitas ({receitas.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {receitas.map(cat => renderCategoria(cat, '#f0fdf4'))}
              {receitas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                  Nenhuma categoria de receita cadastrada
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}>
          <button
            onClick={onFechar}
            style={{
              padding: '0.625rem 1.25rem', background: '#f3f4f6',
              color: '#6b7280', border: 'none', borderRadius: '0.5rem',
              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            style={{
              padding: '0.625rem 1.25rem', background: '#06b6d4',
              color: 'white', border: 'none', borderRadius: '0.5rem',
              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            }}
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}