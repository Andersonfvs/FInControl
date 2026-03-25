'use client';

import { useState } from 'react';
import { CartaoCredito } from '@/types';
import { gerarId } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (cartao: CartaoCredito) => void;
}

const CORES_CARTAO = [
  { nome: 'Azul', hex: '#06b6d4' },
  { nome: 'Verde', hex: '#10b981' },
  { nome: 'Roxo', hex: '#8b5cf6' },
  { nome: 'Rosa', hex: '#ec4899' },
  { nome: 'Laranja', hex: '#f59e0b' },
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Cinza', hex: '#6b7280' },
  { nome: 'Preto', hex: '#1f2937' }
];

export default function ModalCadastrarCartao({ aberto, onFechar, onSalvar }: Props) {
  const [nome, setNome] = useState('');
  const [bandeira, setBandeira] = useState<'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outro'>('Visa');
  const [limite, setLimite] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [cor, setCor] = useState('#06b6d4');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const novoCartao: CartaoCredito = {
        id: gerarId(),
        nome,
        bandeira,
        limite: parseFloat(limite),
        diaFechamento: parseInt(diaFechamento),
        diaVencimento: parseInt(diaVencimento),
        cor,
        ativo: true
      };

      onSalvar(novoCartao);
      
      // Resetar formulário
      setNome('');
      setBandeira('Visa');
      setLimite('');
      setDiaFechamento('');
      setDiaVencimento('');
      setCor('#06b6d4');
      onFechar();
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error);
      alert('❌ Erro ao cadastrar cartão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '2rem',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            💳 Cadastrar Cartão
          </h3>
          <button
            onClick={onFechar}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              background: '#f3f4f6',
              cursor: 'pointer',
              fontSize: '1.25rem'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Preview do Cartão */}
          <div style={{
            background: cor,
            padding: '1.5rem',
            borderRadius: '0.75rem',
            color: 'white',
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                {bandeira}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {nome || 'Nome do Cartão'}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              Limite: R$ {limite || '0,00'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Nome do Cartão
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank Roxinho"
              required
              disabled={salvando}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Bandeira
              </label>
              <select
                value={bandeira}
                onChange={(e) => setBandeira(e.target.value as any)}
                disabled={salvando}
                style={{ width: '100%' }}
              >
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Elo">Elo</option>
                <option value="Amex">Amex</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Limite (R$)
              </label>
              <input
                type="number"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                placeholder="0,00"
                step="0.01"
                required
                disabled={salvando}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Dia Fechamento
              </label>
              <input
                type="number"
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                placeholder="Ex: 10"
                min="1"
                max="31"
                required
                disabled={salvando}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Dia Vencimento
              </label>
              <input
                type="number"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                placeholder="Ex: 17"
                min="1"
                max="31"
                required
                disabled={salvando}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              Cor do Cartão
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CORES_CARTAO.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setCor(c.hex)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '0.5rem',
                    background: c.hex,
                    border: cor === c.hex ? '3px solid #374151' : '2px solid #e5e7eb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.25rem'
                  }}
                  title={c.nome}
                >
                  {cor === c.hex && '✓'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={salvando}
            style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontWeight: '600',
              cursor: salvando ? 'not-allowed' : 'pointer',
              opacity: salvando ? 0.5 : 1,
              marginTop: '0.5rem'
            }}
          >
            {salvando ? 'Cadastrando...' : 'Cadastrar Cartão'}
          </button>
        </form>
      </div>
    </div>
  );
}