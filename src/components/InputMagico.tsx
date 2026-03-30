'use client';

import { useState } from 'react';
import { CategoriaCustomizada, CartaoCredito } from '@/types';
import { parsearInputMagico, DadosInputMagico } from '@/utils/categorias';

interface Props {
  usuarioNome: string;
  cartoes: CartaoCredito[];
  categoriasCustomizadas?: CategoriaCustomizada[];
  onTransacaoCriada: (dados: DadosInputMagico) => void;
}

export default function InputMagico({ usuarioNome, cartoes, categoriasCustomizadas, onTransacaoCriada }: Props) {
  const [texto, setTexto] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || processando) return;

    setProcessando(true);
    setErro('');

    const resultado = parsearInputMagico(texto, usuarioNome, cartoes, categoriasCustomizadas);

    if (resultado) {
      onTransacaoCriada(resultado);
      setTexto('');
    } else {
      setErro('❌ Não consegui entender. Ex: "50 gasolina" ou "200 salário"');
      setTimeout(() => setErro(''), 3000);
    }

    setProcessando(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      border: '2px solid #bae6fd',
      borderRadius: '0.75rem',
      padding: '1rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.25rem' }}>🧠</span>
        <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>
          Adicionar Rápido
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder='Ex: "50 gasolina 45000km", "80 mercado credito nubank", "200 shopee receita"'
          disabled={processando}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: erro ? '1px solid #ef4444' : '1px solid #bae6fd',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            background: 'white',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => !erro && (e.target.style.borderColor = '#0ea5e9')}
          onBlur={e => !erro && (e.target.style.borderColor = '#bae6fd')}
        />
        <button
          type="submit"
          disabled={!texto.trim() || processando}
          style={{
            padding: '0.75rem 1.5rem',
            background: texto.trim() && !processando
              ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
              : '#cbd5e1',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: texto.trim() && !processando ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap',
          }}
        >
          {processando ? '⏳' : '✨ Criar'}
        </button>
      </form>

      {erro && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: '500' }}>
          {erro}
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.5rem' }}>
        💡 <strong>Débito:</strong> "50 gasolina" • <strong>Crédito:</strong> "80 mercado credito nubank" • <strong>Receita:</strong> "200 shopee receita" • <strong>KM:</strong> "150 gasolina 45000km"
      </div>
    </div>
  );
}