'use client';

import { CartaoCredito, FaturaMensal } from '@/types';
import { formatarMoeda, gerarMesKey } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  cartoes: CartaoCredito[];
  faturas: { [mesKey: string]: FaturaMensal[] };
}

interface AlertaFatura {
  cartao: CartaoCredito;
  fatura: FaturaMensal;
  diasRestantes: number;
  dataVencimento: Date;
}

function calcularAlertas(cartoes: CartaoCredito[], faturas: { [mesKey: string]: FaturaMensal[] }): AlertaFatura[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alertas: AlertaFatura[] = [];

  cartoes.forEach(cartao => {
    // Verificar mês atual e próximo mês (fatura pode ter fechado e vencer no próximo mês)
    [-1, 0, 1].forEach(offset => {
      const dataRef = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
      const mesKey = gerarMesKey(dataRef);
      const faturasDoMes = faturas[mesKey] || [];
      const fatura = faturasDoMes.find(f => f.cartaoId === cartao.id);

      if (!fatura || fatura.paga || fatura.totalFatura <= 0) return;

      // Calcular data de vencimento
      const vencimento = new Date(dataRef.getFullYear(), dataRef.getMonth(), cartao.diaVencimento);
      vencimento.setHours(0, 0, 0, 0);

      const diffMs = vencimento.getTime() - hoje.getTime();
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // Mostrar alertas de faturas vencidas (até 30 dias atrás) ou vencendo em até 7 dias
      if (diasRestantes >= -30 && diasRestantes <= 7) {
        // Evitar duplicatas — pegar só o mais próximo por cartão
        const jaExiste = alertas.find(a => a.cartao.id === cartao.id);
        if (!jaExiste || Math.abs(diasRestantes) < Math.abs(jaExiste.diasRestantes)) {
          const idx = alertas.findIndex(a => a.cartao.id === cartao.id);
          const alerta = { cartao, fatura, diasRestantes, dataVencimento: vencimento };
          if (idx >= 0) alertas[idx] = alerta;
          else alertas.push(alerta);
        }
      }
    });
  });

  // Ordenar: vencidas primeiro, depois por proximidade
  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

function getConfig(dias: number) {
  if (dias < 0) return {
    bg: '#fef2f2', border: '#fecaca', texto: '#991b1b',
    badge: '#ef4444', badgeTexto: 'white',
    icone: '🚨',
    label: `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`
  };
  if (dias === 0) return {
    bg: '#fef2f2', border: '#fca5a5', texto: '#991b1b',
    badge: '#ef4444', badgeTexto: 'white',
    icone: '🚨',
    label: 'Vence hoje!'
  };
  if (dias <= 3) return {
    bg: '#fff7ed', border: '#fed7aa', texto: '#9a3412',
    badge: '#f97316', badgeTexto: 'white',
    icone: '⚠️',
    label: `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`
  };
  return {
    bg: '#eff6ff', border: '#bfdbfe', texto: '#1e40af',
    badge: '#3b82f6', badgeTexto: 'white',
    icone: '📅',
    label: `Vence em ${dias} dias`
  };
}

export default function AlertaFaturas({ cartoes, faturas }: Props) {
  const isMobile = useIsMobile();
  const alertas = calcularAlertas(cartoes, faturas);

  if (alertas.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Título da seção apenas se houver múltiplos alertas */}
      {alertas.length > 1 && (
        <div style={{
          fontSize: '0.8125rem',
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.75rem'
        }}>
          🔔 Faturas com atenção
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {alertas.map(({ cartao, fatura, diasRestantes, dataVencimento }) => {
          const config = getConfig(diasRestantes);

          return (
            <div
              key={`alerta-${cartao.id}`}
              style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: '0.75rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                // Mobile: empilha verticalmente. Desktop: linha horizontal
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              {/* Ícone + info do cartão */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flex: 1,
                minWidth: '200px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.5rem',
                  background: cartao.cor || '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}>
                  💳
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: config.texto, fontSize: '0.9375rem' }}>
                    {config.icone} {cartao.nome}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: config.texto, opacity: 0.8, marginTop: '0.1rem' }}>
                    Vencimento: dia {cartao.diaVencimento} • {dataVencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </div>
                </div>
              </div>

              {/* Valor + badge — lado a lado no mobile */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'space-between' : 'flex-end',
                width: isMobile ? '100%' : 'auto',
                gap: '1rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: config.texto, opacity: 0.7, marginBottom: '0.125rem' }}>
                    Valor da fatura
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: config.texto }}>
                    {formatarMoeda(fatura.totalFatura)}
                  </div>
                </div>

                {/* Badge de urgência */}
                <div style={{
                  background: config.badge,
                  color: config.badgeTexto,
                  padding: '0.375rem 0.875rem',
                  borderRadius: '2rem',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {config.label}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}