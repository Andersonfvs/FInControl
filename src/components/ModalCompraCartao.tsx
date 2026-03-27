'use client';

import { useState } from 'react';
import { ItemFatura } from '@/types';
import { gerarId, formatarMoeda } from '@/utils/financeiro';

const CATEGORIAS_CARTAO = [
  'Alimentação', 'Mercado', 'Restaurante', 'Transporte', 'Combustível',
  'Saúde', 'Farmácia', 'Educação', 'Lazer', 'Streaming',
  'Vestuário', 'Eletrônicos', 'Casa', 'Beleza', 'Pet',
  'Viagem', 'Serviços', 'Compras Online', 'Outras Despesas',
];

interface Props {
  aberto: boolean;
  cartaoId: string;
  cartaoNome: string;
  onFechar: () => void;
  onSalvar: (itens: ItemFatura[]) => void;
  usuarioNome: string;
}

export default function ModalCompraCartao({
  aberto,
  cartaoId,
  cartaoNome,
  onFechar,
  onSalvar,
  usuarioNome
}: Props) {
  const [data, setData] = useState('');
  const [categoria, setCategoria] = useState('Alimentação');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [dividir, setDividir] = useState(false);
  const [pessoa, setPessoa] = useState(usuarioNome);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data || !categoria || !descricao || !valor) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    setCarregando(true);

    try {
      const valorNumerico = parseFloat(valor.replace(',', '.'));
      const numParcelas = parseInt(parcelas);
      
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        alert('Valor inválido!');
        setCarregando(false);
        return;
      }

      if (isNaN(numParcelas) || numParcelas < 1) {
        alert('Número de parcelas inválido!');
        setCarregando(false);
        return;
      }

      const valorPorParcela = valorNumerico / numParcelas;
      const itens: ItemFatura[] = [];

      if (dividir) {
        const valorPorPessoa = valorPorParcela / 2;
        
        for (let i = 0; i < numParcelas; i++) {
          const dataBase = new Date(data + 'T00:00:00');
          dataBase.setMonth(dataBase.getMonth() + i);
          const dataFormatada = dataBase.toISOString().split('T')[0];

          const itemBase: ItemFatura = {
            id: gerarId(),
            cartaoId,
            data: dataFormatada,
            descricao,
            categoria,
            valor: valorPorPessoa,
            pessoa: 'Anderson Ferreira',
            parcelas: numParcelas,
            parcelaAtual: i + 1,
            dividido: true,
          };

          if (numParcelas > 1) {
            itemBase.parcelamento = {
              parcelaAtual: i + 1,
              totalParcelas: numParcelas,
            };
          }

          itens.push(itemBase);

          const itemBase2: ItemFatura = {
            id: gerarId(),
            cartaoId,
            data: dataFormatada,
            descricao,
            categoria,
            valor: valorPorPessoa,
            pessoa: 'Evelin Mulbaier',
            parcelas: numParcelas,
            parcelaAtual: i + 1,
            dividido: true,
          };

          if (numParcelas > 1) {
            itemBase2.parcelamento = {
              parcelaAtual: i + 1,
              totalParcelas: numParcelas,
            };
          }

          itens.push(itemBase2);
        }
      } else {
        for (let i = 0; i < numParcelas; i++) {
          const dataBase = new Date(data + 'T00:00:00');
          dataBase.setMonth(dataBase.getMonth() + i);
          const dataFormatada = dataBase.toISOString().split('T')[0];

          const itemBase: ItemFatura = {
            id: gerarId(),
            cartaoId,
            data: dataFormatada,
            descricao,
            categoria,
            valor: valorPorParcela,
            pessoa,
            parcelas: numParcelas,
            parcelaAtual: i + 1,
            dividido: false,
          };

          if (numParcelas > 1) {
            itemBase.parcelamento = {
              parcelaAtual: i + 1,
              totalParcelas: numParcelas,
            };
          }

          itens.push(itemBase);
        }
      }

      await onSalvar(itens);

      alert('✅ Compra adicionada com sucesso!');
      setData('');
      setCategoria('Alimentação');
      setDescricao('');
      setValor('');
      setParcelas('1');
      setDividir(false);
      setPessoa(usuarioNome);
      onFechar();
    } catch (error) {
      console.error('Erro ao adicionar compra:', error);
      alert('❌ Erro ao adicionar compra');
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  const valorNumerico = parseFloat(valor.replace(',', '.'));
  const numParcelas = parseInt(parcelas);
  const valorParcela = !isNaN(valorNumerico) && !isNaN(numParcelas) && numParcelas > 0
    ? valorNumerico / numParcelas
    : 0;

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
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '2rem'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
              Compra no Cartão
            </h2>
          </div>
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

        <div style={{
          background: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          {cartaoNome}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Data da Compra
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                background: 'white',
              }}
            >
              {CATEGORIAS_CARTAO.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Fogão Brastemp"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Valor Total (R$)
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Parcelas
              </label>
              <input
                type="number"
                min="1"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {valorParcela > 0 && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
                Preview:
              </div>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e', fontWeight: '600' }}>
                {numParcelas}x de {formatarMoeda(valorParcela)}
              </div>
            </div>
          )}

          {!dividir && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Pessoa
              </label>
              <select
                value={pessoa}
                onChange={(e) => setPessoa(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Anderson Ferreira">Anderson Ferreira</option>
                <option value="Evelin Mulbaier">Evelin Mulbaier</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={dividir}
                onChange={(e) => setDividir(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#06b6d4'
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                Dividir 50/50 com o casal
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: carregando ? 'not-allowed' : 'pointer',
              opacity: carregando ? 0.5 : 1
            }}
          >
            {carregando ? 'Adicionando...' : 'Adicionar Compra'}
          </button>
        </form>
      </div>
    </div>
  );
}