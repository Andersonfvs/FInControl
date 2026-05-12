'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartaoCredito } from '@/types';
import { gerarId } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (cartao: CartaoCredito) => void;
  cartaoEditando?: CartaoCredito | null;
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

export default function ModalCadastrarCartao({ aberto, onFechar, onSalvar, cartaoEditando }: Props) {
  const [nome, setNome] = useState('');
  const [bandeira, setBandeira] = useState('Mastercard');
  const [limite, setLimite] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [cor, setCor] = useState('#8b5cf6');
  const [senhaPDF, setSenhaPDF] = useState('');

  // Sincroniza o estado toda vez que o modal abre (ou quando o cartão editado muda)
  useEffect(() => {
    if (aberto) {
      setNome(cartaoEditando?.nome || '');
      setBandeira(cartaoEditando?.bandeira || 'Mastercard');
      setLimite(cartaoEditando ? String(cartaoEditando.limite) : '');
      setDiaFechamento(cartaoEditando ? String(cartaoEditando.diaFechamento) : '');
      setDiaVencimento(cartaoEditando ? String(cartaoEditando.diaVencimento) : '');
      setCor(cartaoEditando?.cor || '#8b5cf6');
      setSenhaPDF(cartaoEditando?.senhaPDF || '');
    }
  }, [aberto, cartaoEditando]);

  // ESC fecha o modal
  const handleEscCallback = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onFechar();
  }, [onFechar]);

  useEffect(() => {
    if (aberto) window.addEventListener('keydown', handleEscCallback);
    return () => window.removeEventListener('keydown', handleEscCallback);
  }, [aberto, handleEscCallback]);

  // Trava scroll do body quando modal está aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [aberto]);

  const handleSalvar = () => {
    if (!nome || !limite || !diaFechamento || !diaVencimento) {
      alert('Preencha todos os campos!');
      return;
    }

    const cartao: CartaoCredito = {
      id: cartaoEditando ? cartaoEditando.id : gerarId(),
      nome: nome.trim(),
      bandeira,
      limite: parseFloat(limite),
      diaFechamento: parseInt(diaFechamento),
      diaVencimento: parseInt(diaVencimento),
      cor,
      senhaPDF: senhaPDF.trim() || undefined,
    };

    onSalvar(cartao);
    onFechar();
  };

  if (!aberto) return null;

  const isEdicao = !!cartaoEditando;

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          // CORREÇÃO SCROLL: maxHeight + flex para header/footer fixos e conteúdo scrollável
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* HEADER — fixo */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
            {isEdicao ? '✏️ Editar Cartão' : '💳 Cadastrar Cartão'}
          </h3>
          <button
            onClick={onFechar}
            style={{
              background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer',
              color: '#9ca3af', padding: 0, width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            ×
          </button>
        </div>

        {/* CONTEÚDO — scrollável */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* CORREÇÃO PREVIEW: removido minHeight fixo, padding reduzido */}
          <div style={{
            background: cor,
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>{bandeira}</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>
              {nome || 'Nome do Cartão'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>
              Limite: R$ {limite || '0,00'}
              {diaVencimento && <span> · Vence dia {diaVencimento}</span>}
            </div>
          </div>

          {/* Formulário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Nome */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                Nome do Cartão
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Nubank, Inter, C6..."
                autoFocus
                style={{
                  width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Bandeira e Limite */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                  Bandeira
                </label>
                <select
                  value={bandeira}
                  onChange={(e) => setBandeira(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                  }}
                >
                  {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                  Limite (R$)
                </label>
                <input
                  type="number"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  placeholder="5000"
                  style={{
                    width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Dias */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                  Dia Fechamento
                </label>
                <input
                  type="number" min="1" max="31"
                  value={diaFechamento}
                  onChange={(e) => setDiaFechamento(e.target.value)}
                  placeholder="01"
                  style={{
                    width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                  Dia Vencimento
                </label>
                <input
                  type="number" min="1" max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  placeholder="10"
                  style={{
                    width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                    borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {/* Senha PDF */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '14px', color: '#374151' }}>
                🔒 Senha do PDF da fatura
              </label>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                Opcional — se a fatura vier protegida por senha, salve aqui para importar automaticamente
              </div>
              <input
                type="password"
                value={senhaPDF}
                onChange={(e) => setSenhaPDF(e.target.value)}
                placeholder="Ex: 12345"
                style={{
                  width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                  borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Cores */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
                Cor do Cartão
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {CORES.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setCor(c.hex)}
                    style={{
                      height: '56px', background: c.hex,
                      border: cor === c.hex ? '3px solid #111827' : '2px solid #e5e7eb',
                      borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: '700', fontSize: '20px',
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

        {/* FOOTER — fixo */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
          background: 'white',
          borderRadius: '0 0 16px 16px',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onFechar}
            style={{
              flex: 1, padding: '14px', background: '#f3f4f6', color: '#374151',
              border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
              fontSize: '15px', transition: 'background 0.2s',
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
              flex: 1, padding: '14px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontWeight: '600', cursor: 'pointer', fontSize: '15px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {isEdicao ? '✏️ Salvar Alterações' : '💾 Salvar Cartão'}
          </button>
        </div>
      </div>
    </div>
  );
}