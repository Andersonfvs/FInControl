'use client';

import { useState, useEffect } from 'react';

interface Atalho {
  emoji: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: 'despesa' | 'receita';
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (atalho: Atalho) => void;
  tipoInicial: 'despesa' | 'receita';
}

const EMOJIS_SUGESTOES = [
  '⛽', '🛒', '🍕', '☕', '💊', '🚗', '📦', '🏠', '💡', '🎓',
  '🎮', '🎬', '🎵', '🏋️', '🐾', '✈️', '🍔', '🍺', '💳', '📱',
  '💰', '🎫', '💵', '💸', '🏆', '⭐', '🎁', '📈'
];

const CATEGORIAS_DESPESA = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer',
  'Educação', 'Vestuário', 'Serviços', 'Investimentos', 'Outras Despesas'
];

const CATEGORIAS_RECEITA = [
  'Salário', 'Vale Alimentação', 'Freelance', 'Venda Shopee',
  'Investimentos', 'Bônus', 'Outras Receitas'
];

export default function ModalNovoAtalho({ aberto, onFechar, onSalvar, tipoInicial }: Props) {
  const [tipo, setTipo] = useState<'despesa' | 'receita'>(tipoInicial);
  const [emoji, setEmoji] = useState('⚡');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [mostrarEmojis, setMostrarEmojis] = useState(false);

  const categorias = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;

  useEffect(() => {
    setTipo(tipoInicial);
    setCategoria(tipoInicial === 'despesa' ? CATEGORIAS_DESPESA[0] : CATEGORIAS_RECEITA[0]);
  }, [tipoInicial, aberto]);

  useEffect(() => {
    if (!aberto) {
      setEmoji('⚡');
      setNome('');
      setDescricao('');
      setMostrarEmojis(false);
    }
  }, [aberto]);

  const handleSalvar = () => {
    if (!nome.trim() || !descricao.trim()) return;
    onSalvar({ emoji, nome: nome.trim(), categoria, descricao: descricao.trim(), tipo });
  };

  if (!aberto) return null;

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
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
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '1.5rem'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            ⚡ Novo Atalho Rápido
          </h3>
          <button
            onClick={onFechar}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tipo */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Tipo
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setTipo('despesa');
                  setCategoria(CATEGORIAS_DESPESA[0]);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: tipo === 'despesa' ? '#ef4444' : 'white',
                  color: tipo === 'despesa' ? 'white' : '#6b7280',
                  border: `2px solid ${tipo === 'despesa' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                💸 Despesa
              </button>
              <button
                onClick={() => {
                  setTipo('receita');
                  setCategoria(CATEGORIAS_RECEITA[0]);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: tipo === 'receita' ? '#10b981' : 'white',
                  color: tipo === 'receita' ? 'white' : '#6b7280',
                  border: `2px solid ${tipo === 'receita' ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                💰 Receita
              </button>
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Ícone
            </label>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMostrarEmojis(!mostrarEmojis)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  background: 'white',
                  textAlign: 'center'
                }}
              >
                {emoji}
              </button>
              {mostrarEmojis && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.5rem',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '0.5rem',
                  maxHeight: '200px',
                  overflow: 'auto',
                  zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {EMOJIS_SUGESTOES.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        setEmoji(e);
                        setMostrarEmojis(false);
                      }}
                      style={{
                        padding: '0.5rem',
                        border: emoji === e ? '2px solid #10b981' : '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        background: emoji === e ? '#f0fdf4' : 'white'
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Nome do Atalho
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Netflix, Academia, Aluguel..."
              maxLength={15}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Categoria */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                boxSizing: 'border-box'
              }}
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Descrição Padrão
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que aparecerá no modal"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botões */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.5rem'
          }}>
            <button
              onClick={onFechar}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!nome.trim() || !descricao.trim()}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: nome.trim() && descricao.trim()
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : '#9ca3af',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: nome.trim() && descricao.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Criar Atalho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}