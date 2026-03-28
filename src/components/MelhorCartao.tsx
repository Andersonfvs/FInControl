'use client';

import { CartaoCredito } from '@/types';
import { formatarMoeda } from '@/utils/financeiro';

interface Props {
  cartoes: CartaoCredito[];
}

interface AnaliseCartao {
  cartao: CartaoCredito;
  diasAteProximoFechamento: number;
  diasDeFolga: number; // dias até o vencimento após o próximo fechamento
}

function analisarCartoes(cartoes: CartaoCredito[]): AnaliseCartao | null {
  if (!cartoes || cartoes.length === 0) return null;

  const hoje = new Date();
  const diaHoje = hoje.getDate();

  const analises: AnaliseCartao[] = cartoes.map(cartao => {
    const { diaFechamento, diaVencimento } = cartao;

    // Quantos dias faltam para o próximo fechamento
    let diasAteProximoFechamento: number;
    if (diaHoje <= diaFechamento) {
      // Fechamento ainda não ocorreu neste mês
      diasAteProximoFechamento = diaFechamento - diaHoje;
    } else {
      // Fechamento já ocorreu — próximo é no mês que vem
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      diasAteProximoFechamento = (diasNoMes - diaHoje) + diaFechamento;
    }

    // Dias de folga = dias até o próximo fechamento + dias entre fechamento e vencimento
    // Ex: fecha dia 6, vence dia 13 → 7 dias entre fechamento e vencimento
    let diasEntreFecharEVencer: number;
    if (diaVencimento > diaFechamento) {
      diasEntreFecharEVencer = diaVencimento - diaFechamento;
    } else {
      // Vencimento é no mês seguinte ao fechamento
      diasEntreFecharEVencer = (30 - diaFechamento) + diaVencimento;
    }

    const diasDeFolga = diasAteProximoFechamento + diasEntreFecharEVencer;

    return { cartao, diasAteProximoFechamento, diasDeFolga };
  });

  // Ordena: maior prazo primeiro, desempata por maior limite
  analises.sort((a, b) => {
    if (b.diasDeFolga !== a.diasDeFolga) return b.diasDeFolga - a.diasDeFolga;
    return b.cartao.limite - a.cartao.limite;
  });

  return analises[0];
}

function descricaoPrazo(dias: number): string {
  if (dias >= 40) return 'Prazo máximo — compre hoje!';
  if (dias >= 30) return 'Ótimo prazo para compras';
  if (dias >= 20) return 'Bom prazo disponível';
  if (dias >= 10) return 'Prazo razoável';
  return 'Fechamento próximo — cuidado';
}

function corTexto(dias: number): string {
  if (dias >= 30) return '#065f46';
  if (dias >= 20) return '#0369a1';
  if (dias >= 10) return '#92400e';
  return '#991b1b';
}

function corFundo(dias: number): string {
  if (dias >= 30) return 'rgba(16, 185, 129, 0.08)';
  if (dias >= 20) return 'rgba(6, 182, 212, 0.08)';
  if (dias >= 10) return 'rgba(245, 158, 11, 0.08)';
  return 'rgba(239, 68, 68, 0.08)';
}

export default function MelhorCartao({ cartoes }: Props) {
  if (!cartoes || cartoes.length === 0) return null;

  const melhor = analisarCartoes(cartoes);
  if (!melhor) return null;

  const { cartao, diasDeFolga, diasAteProximoFechamento } = melhor;
  const cor = cartao.cor || '#06b6d4';

  return (
    <div style={{
      background: corFundo(diasDeFolga),
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1.5px solid ${cor}40`,
      borderLeft: `4px solid ${cor}`,
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      {/* Ícone + textos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
        {/* Mini card colorido */}
        <div style={{
          width: '44px',
          height: '30px',
          background: cor,
          borderRadius: '5px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          boxShadow: `0 2px 8px ${cor}55`,
        }}>
          ⭐
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>
            Melhor Cartão para Hoje
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cartao.nome}
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '400', marginLeft: '0.5rem' }}>
              {cartao.bandeira}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: corTexto(diasDeFolga), marginTop: '0.125rem', fontWeight: '500' }}>
            {descricaoPrazo(diasDeFolga)}
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: cor, lineHeight: 1 }}>
            {diasDeFolga}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem', whiteSpace: 'nowrap' }}>
            dias de folga
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#374151', lineHeight: 1 }}>
            {diasAteProximoFechamento}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem', whiteSpace: 'nowrap' }}>
            dias p/ fechar
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#374151', lineHeight: 1, paddingTop: '0.25rem' }}>
            {formatarMoeda(cartao.limite)}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.125rem', whiteSpace: 'nowrap' }}>
            limite
          </div>
        </div>
      </div>
    </div>
  );
}