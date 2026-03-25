'use client';

import { useState, useEffect } from 'react';
import { CartaoCredito } from '@/types';
import { gerarId } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (cartao: CartaoCredito) => void;
}

const CORES = [
  { nome: 'Azul', hex: '#06b6d4' },
  { nome: 'Verde', hex: '#10b981' },
  { nome: 'Roxo', hex: '#8b5cf6' },
  { nome: 'Rosa', hex: '#ec4899' },
  { nome: 'Laranja', hex: '#f59e0b' },
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Cinza', hex: '#6b7280' },
  { nome: 'Preto', hex: '#1f2937' },
];

const BANDEIRAS = ['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outros'];

export default function ModalCadastrarCartao({ aberto, onFechar, onSalvar }: Props) {
  const [nome, setNome] = useState('');
  const [bandeira, setBandeira] = useState('Mastercard');
  const [limite, setLimite] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [cor, setCor] = useState('#8b5cf6');

  // CORREÇÃO 1: ESC FECHA O MODAL
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    if (aberto) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [aberto, onFechar]);

  const handleSalvar = () => {
    if (!nome || !limite || !diaFechamento || !diaVencimento) {
      alert('Preencha todos os campos!');
      return;
    }

    const cartao: CartaoCredito = {
      id: gerarId(),
      nome: nome.trim(),
      bandeira,
      limite: parseFloat(limite),
      diaFechamento: parseInt(diaFechamento),
      diaVencimento: parseInt(diaVencimento),
      cor,
    };

    onSalvar(cartao);
    
    setNome('');
    setBandeira('Mastercard');
    setLimite('');
    setDiaFechamento('');
    setDiaVencimento('');
    setCor('#8b5cf6');
    onFechar();
  };

  if (!aberto) return null;

  return (
    // CORREÇÃO 2: SCROLL AQUI, SEM FLEX
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        overflow: 'auto',
        padding: '40px 20px',
      }}
    >
      {/* CORREÇÃO 3: SEM MAXHEIGHT */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* HEADER FIXO */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            💳 Cadastrar Cartão
          </h3>
          <button
            onClick={onFechar}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: 0,
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            ×
          </button>
        </div>

        {/* CONTEÚDO */}
        <div style={{
          padding: '24px',
        }}>
          {/* Preview */}
          <div style={{
            background: cor,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            color: 'white',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>{bandeira}</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
                {nome || 'Nome do Cartão'}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                Limite: R$ {limite || '0,00'}
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Nome */}
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#374151'
              }}>
                Nome do Cartão
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Nubank, Inter, C6..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Bandeira e Limite */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Bandeira
                </label>
                <select
                  value={bandeira}
                  onChange={(e) => setBandeira(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Limite (R$)
                </label>
                <input
                  type="number"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  placeholder="5000"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Dias */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Dia Fechamento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaFechamento}
                  onChange={(e) => setDiaFechamento(e.target.value)}
                  placeholder="01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  Dia Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  placeholder="10"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Cores */}
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#374151'
              }}>
                Cor do Cartão
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px'
              }}>
                {CORES.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setCor(c.hex)}
                    style={{
                      height: '56px',
                      background: c.hex,
                      border: cor === c.hex ? '3px solid #111827' : '2px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '20px',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {cor === c.hex && '✓'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER FIXO */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          background: 'white',
          borderRadius: '0 0 16px 16px',
        }}>
          <button
            type="button"
            onClick={onFechar}
            style={{
              flex: 1,
              padding: '14px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            style={{
              flex: 1,
              padding: '14px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            💾 Salvar Cartão
          </button>
        </div>
      </div>
    </div>
  );
}