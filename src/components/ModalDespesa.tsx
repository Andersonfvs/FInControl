'use client';

import { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { obterCategoriasDisponiveis, obterEmoji } from '@/utils/categorias';
import { gerarMesKey, gerarId } from '@/utils/financeiro';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  userId: string;
  categoriaPreenchida?: string;
  descricaoPreenchida?: string;
}

// Mapeamento inteligente de palavras-chave para categorias
function detectarCategoria(texto: string): string {
  const textoLower = texto.toLowerCase();
  
  if (textoLower.includes('combustivel') || textoLower.includes('gasolina') || textoLower.includes('etanol') || textoLower.includes('posto')) {
    return 'Transporte';
  }
  if (textoLower.includes('rancho') || textoLower.includes('mercado') || textoLower.includes('supermercado')) {
    return 'Alimentação';
  }
  if (textoLower.includes('lanche') || textoLower.includes('ifood') || textoLower.includes('uber eats') || textoLower.includes('delivery')) {
    return 'Lazer';
  }
  if (textoLower.includes('cafe') || textoLower.includes('café') || textoLower.includes('padaria')) {
    return 'Alimentação';
  }
  if (textoLower.includes('farmacia') || textoLower.includes('farmácia') || textoLower.includes('remedio') || textoLower.includes('remédio')) {
    return 'Saúde';
  }
  if (textoLower.includes('netflix') || textoLower.includes('spotify') || textoLower.includes('disney') || textoLower.includes('amazon prime')) {
    return 'Lazer';
  }
  if (textoLower.includes('academia') || textoLower.includes('nutricionista') || textoLower.includes('medico') || textoLower.includes('médico')) {
    return 'Saúde';
  }
  if (textoLower.includes('uber') || textoLower.includes('99') || textoLower.includes('taxi') || textoLower.includes('onibus') || textoLower.includes('ônibus')) {
    return 'Transporte';
  }
  if (textoLower.includes('aluguel') || textoLower.includes('condominio') || textoLower.includes('condomínio') || textoLower.includes('iptu')) {
    return 'Moradia';
  }
  
  return 'Outras Despesas';
}

export default function ModalDespesa({ aberto, onFechar, userId, categoriaPreenchida, descricaoPreenchida }: Props) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]); // NOVO: Estado da data
  const [categoria, setCategoria] = useState('Outras Despesas');
  const [responsavel, setResponsavel] = useState('Anderson Ferreira');
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [usarValeAlimentacao, setUsarValeAlimentacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const categorias = obterCategoriasDisponiveis();

  // Preencher automaticamente quando vier dos atalhos
  useEffect(() => {
    if (aberto) {
      if (categoriaPreenchida) setCategoria(categoriaPreenchida);
      if (descricaoPreenchida) setDescricao(descricaoPreenchida);
    }
  }, [aberto, categoriaPreenchida, descricaoPreenchida]);

  // Detecção inteligente de categoria ao digitar
  useEffect(() => {
    if (descricao.length > 3 && !categoriaPreenchida) {
      const categoriaDetectada = detectarCategoria(descricao);
      setCategoria(categoriaDetectada);
    }
  }, [descricao, categoriaPreenchida]);

  // Resetar ao fechar
  useEffect(() => {
    if (!aberto) {
      setDescricao('');
      setValor('');
      setData(new Date().toISOString().split('T')[0]);
      setCategoria('Outras Despesas');
      setResponsavel('Anderson Ferreira');
      setParcelado(false);
      setNumParcelas(2);
      setUsarValeAlimentacao(false);
      setErro('');
    }
  }, [aberto]);

  // ESC fecha o modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    if (aberto) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [aberto, onFechar]);

  // trava scroll do body
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [aberto]);

  const handleSalvar = async () => {
    if (!descricao.trim() || !valor || parseFloat(valor) <= 0) {
      setErro('Preencha todos os campos corretamente');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const valorNum = parseFloat(valor);
      // Ajuste de data para evitar problemas de fuso horário (meio-dia)
      const dataSelecionada = new Date(data + 'T12:00:00');

      if (parcelado && numParcelas > 1) {
        const valorParcela = parseFloat((valorNum / numParcelas).toFixed(2));

        for (let i = 0; i < numParcelas; i++) {
          const dataParcela = new Date(dataSelecionada);
          dataParcela.setMonth(dataParcela.getMonth() + i);
          
          const mesParcela = gerarMesKey(dataParcela);
          const refMes = ref(database, `usuarios/${userId}/dadosPorMes/${mesParcela}`);
          
          const snapshot = await get(refMes);
          const transacoesExistentes = snapshot.exists() ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val())) : [];

          const novaTransacao = {
            id: gerarId(),
            tipo: 'despesa',
            descricao: `${descricao} (${i + 1}/${numParcelas})`,
            valor: valorParcela,
            categoria,
            pessoa: responsavel,
            data: dataParcela.toISOString().split('T')[0],
            metodoPagamento: usarValeAlimentacao ? 'vale_alimentacao' : 'dinheiro',
            pago: false,
            parcelamento: {
              parcelaAtual: i + 1,
              totalParcelas: numParcelas
            }
          };

          await set(refMes, [...transacoesExistentes, novaTransacao]);
        }
      } else {
        // Despesa única baseada na data do calendário
        const mesSelecionado = gerarMesKey(dataSelecionada);
        const refMes = ref(database, `usuarios/${userId}/dadosPorMes/${mesSelecionado}`);
        const snapshot = await get(refMes);
        const transacoesExistentes = snapshot.exists() ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val())) : [];

        const novaTransacao = {
          id: gerarId(),
          tipo: 'despesa',
          descricao,
          valor: valorNum,
          categoria,
          pessoa: responsavel,
          data: data, // Usa a string YYYY-MM-DD do input
          metodoPagamento: usarValeAlimentacao ? 'vale_alimentacao' : 'dinheiro',
          pago: false
        };

        await set(refMes, [...transacoesExistentes, novaTransacao]);
      }

      onFechar();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErro('Erro ao salvar despesa. Tente novamente.');
    } finally {
      setSalvando(false);
    }
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
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💸</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Nova Despesa
            </h3>
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

        {erro && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            ⚠️ {erro}
          </div>
        )}

        {/* Formulário */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Campo de Data (Calendário) */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              📅 Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
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

          {/* Descrição */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Descrição
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Combustível, Rancho, Café..."
              autoFocus
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

          {/* Valor */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
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
              {obterEmoji(categoria)} Categoria
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
                <option key={cat} value={cat}>
                  {obterEmoji(cat)} {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              color: '#374151'
            }}>
              Responsável
            </label>
            <select
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                boxSizing: 'border-box'
              }}
            >
              <option value="Anderson Ferreira">Anderson Ferreira</option>
              <option value="Evelin Mulbaier">Evelin Mulbaier</option>
            </select>
          </div>

          {/* Toggle Vale Alimentação */}
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '0.75rem',
            padding: '1rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={usarValeAlimentacao}
                onChange={(e) => setUsarValeAlimentacao(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: '#10b981'
                }}
              />
              <div>
                <div style={{
                  fontWeight: '600',
                  color: '#065f46',
                  fontSize: '0.9375rem'
                }}>
                  🎫 Pagar com Vale Alimentação
                </div>
                <div style={{
                  fontSize: '0.8125rem',
                  color: '#047857',
                  marginTop: '0.25rem'
                }}>
                  Não será descontado do saldo bancário
                </div>
              </div>
            </label>
          </div>

          {/* Parcelamento */}
          <div style={{
            background: '#fef3c7',
            border: '2px solid #fcd34d',
            borderRadius: '0.75rem',
            padding: '1rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              marginBottom: parcelado ? '1rem' : 0
            }}>
              <input
                type="checkbox"
                checked={parcelado}
                onChange={(e) => setParcelado(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  accentColor: '#f59e0b'
                }}
              />
              <span style={{
                fontWeight: '600',
                color: '#92400e',
                fontSize: '0.9375rem'
              }}>
                💳 Parcelar despesa
              </span>
            </label>

            {parcelado && (
              <div>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#92400e'
                }}>
                  Número de parcelas
                </label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #fcd34d',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    boxSizing: 'border-box'
                  }}
                />
                {valor && numParcelas > 1 && (
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#92400e'
                  }}>
                    💡 {numParcelas}x de R$ {(parseFloat(valor) / numParcelas).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginTop: '0.5rem'
          }}>
            <button
              onClick={onFechar}
              disabled={salvando}
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
              disabled={salvando}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: salvando ? '#9ca3af' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: salvando ? 'not-allowed' : 'pointer'
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}