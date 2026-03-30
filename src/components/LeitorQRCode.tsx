'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onLeitura: (dados: { url: string; valor?: number; descricao: string }) => void;
}

// Tenta extrair o valor total da URL da NFC-e
// Formato comum: ...nNF=XXXX&nValue=XXXX... ou valor embutido no chave de acesso
function extrairValorNFCe(url: string): number | undefined {
  try {
    const urlObj = new URL(url);

    // Tentativa 1: parâmetro vNF ou vTot ou nVTotal
    for (const param of ['vNF', 'vTot', 'nVTotal', 'valor', 'value']) {
      const val = urlObj.searchParams.get(param);
      if (val) {
        const num = parseFloat(val.replace(',', '.'));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // Tentativa 2: parâmetro "p=" contém dados codificados
    const p = urlObj.searchParams.get('p');
    if (p) {
      // Chave de acesso NFC-e tem 44 dígitos + cDV
      // Formato: cUF|AAMM|CNPJ|mod|serie|nNF|tpEmis|cNF|cDV|valor (alguns estados)
      const partes = p.split('|');
      if (partes.length >= 8) {
        // O valor total não está diretamente na URL da maioria dos estados
        // mas tentamos o índice 7 que alguns estados usam
        const possivel = parseFloat(partes[7]);
        if (!isNaN(possivel) && possivel > 0 && possivel < 999999) return possivel;
      }
    }
  } catch { /* URL inválida */ }
  return undefined;
}

export default function LeitorQRCode({ aberto, onFechar, onLeitura }: Props) {
  const [status, setStatus] = useState<'idle' | 'lendo' | 'sucesso' | 'erro'>('idle');
  const [mensagemErro, setMensagemErro] = useState('');
  const [urlLida, setUrlLida] = useState('');
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const elementId = 'qr-reader-fincontrol';

  useEffect(() => {
    if (!aberto) return;
    setStatus('lendo');
    setMensagemErro('');
    setUrlLida('');

    // Import dinâmico para evitar SSR
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' }, // câmera traseira
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          // Leitura bem-sucedida
          scanner.stop().catch(() => {});
          setUrlLida(decodedText);
          setStatus('sucesso');

          const valor = extrairValorNFCe(decodedText);
          const isNFCe = decodedText.includes('nfce') || decodedText.includes('nfe') || decodedText.includes('fazenda') || decodedText.includes('sefaz');

          onLeitura({
            url: decodedText,
            valor,
            descricao: isNFCe ? '📄 Nota Fiscal' : decodedText.slice(0, 60)
          });
        },
        () => { /* frame sem QR, ignora */ }
      ).catch((err: { message?: string }) => {
        setStatus('erro');
        setMensagemErro(
          err?.message?.includes('permission') || err?.message?.includes('Permission')
            ? 'Permissão de câmera negada. Verifique as configurações do navegador.'
            : 'Não foi possível acessar a câmera. Tente novamente.'
        );
      });
    }).catch(() => {
      setStatus('erro');
      setMensagemErro('Biblioteca de QR Code não encontrada. Execute: npm install html5-qrcode');
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [aberto, onLeitura]);

  const handleFechar = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setStatus('idle');
    onFechar();
  };

  if (!aberto) return null;

  return (
    <div
      onClick={handleFechar}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '1rem',
          width: '90%', maxWidth: '420px',
          padding: '1.5rem',
          animation: 'slideUp 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#374151' }}>Ler Nota Fiscal</h3>
          </div>
          <button
            onClick={handleFechar}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
          >✕</button>
        </div>

        {/* Área da câmera */}
        {status === 'lendo' && (
          <>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', textAlign: 'center' }}>
              Aponte a câmera para o QR Code da NFC-e
            </p>
            <div
              id={elementId}
              style={{
                width: '100%',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '2px solid #06b6d4'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.75rem', textAlign: 'center' }}>
              O QR Code será detectado automaticamente
            </p>
          </>
        )}

        {/* Sucesso */}
        {status === 'sucesso' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <p style={{ fontWeight: '600', color: '#10b981', marginBottom: '0.5rem' }}>QR Code lido com sucesso!</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', wordBreak: 'break-all', marginBottom: '1rem' }}>
              {urlLida.slice(0, 80)}{urlLida.length > 80 ? '...' : ''}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#374151' }}>O modal de despesa foi preenchido automaticamente.</p>
          </div>
        )}

        {/* Erro */}
        {status === 'erro' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>❌</div>
            <p style={{ fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem' }}>Não foi possível ler</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>{mensagemErro}</p>
            <button
              onClick={() => { setStatus('idle'); setTimeout(() => setStatus('lendo'), 100); }}
              style={{ padding: '0.625rem 1.25rem', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Dica */}
        <div style={{ marginTop: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.8rem', color: '#0369a1' }}>
          💡 <strong>Dica:</strong> O QR Code da NFC-e fica geralmente no rodapé do cupom fiscal. Mantenha o celular firme e bem iluminado.
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
