'use client';

import { useState } from 'react';
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
    
    // Limpar formulário
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
        padding: '1rem',
        overflowY: 'auto', // ADICIONADO
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh', // ADICIONADO
          overflowY: 'auto', // ADICIONADO
          padding: '1.5rem',
          margin: 'auto', // ADICIONADO
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
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
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Preview do cartão */}
        <div
          style={{
            background: cor,
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            color: 'white',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{
            fontSize: '0.875rem',
            opacity: 0.9
          }}>
            {bandeira}
          </div>
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.5rem'
            }}>
              {nome || 'Nome do Cartão'}
            </div>
            <div style={{
              fontSize: '0.875rem',
              opacity: 0.9
            }}>
              Limite: R$ {limite || '0,00'}
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Nome */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
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
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Bandeira e Limite */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                Bandeira
              </label>
              <select
                value={bandeira}
                onChange={(e) => setBandeira(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box'
                }}
              >
                {BANDEIRAS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
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
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Dia Fechamento e Vencimento */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
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
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
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
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Cor do Cartão */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Cor do Cartão
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem'
            }}>
              {CORES.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setCor(c.hex)}
                  style={{
                    width: '100%',
                    height: '50px',
                    background: c.hex,
                    border: cor === c.hex ? '3px solid #000' : 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '1.25rem'
                  }}
                >
                  {cor === c.hex && '✓'}
                </button>
              ))}
            </div>
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
              style={{
                flex: 1,
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              💾 Salvar Cartão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}