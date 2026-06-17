'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      } else {
        setVerificandoSessao(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace('/dashboard');
    } catch (error: unknown) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
        setErro('Email ou senha incorretos');
      } else if (authError.code === 'auth/user-not-found') {
        setErro('Usuário não encontrado');
      } else if (authError.code === 'auth/too-many-requests') {
        setErro('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        setErro('Erro ao fazer login. Tente novamente.');
      }
      setCarregando(false);
    }
  };

  if (verificandoSessao) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="slash-coin-loader" />
        </div>
        <style>{`
          .slash-coin-loader { display: inline-block; transform: translateZ(1px); }
          .slash-coin-loader::after {
            content: 'R$';
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            letter-spacing: -0.03em;
            background: #cc9166;
            color: #3d2a1a;
            border: 3px double #a8744a;
            box-sizing: border-box;
            box-shadow: 0 0 0 1px #2e3038;
            animation: coin-flip 3s cubic-bezier(0, 0.2, 0.8, 1) infinite;
          }
          @keyframes coin-flip {
            0%, 100% { animation-timing-function: cubic-bezier(0.5, 0, 1, 0.5); }
            0%   { transform: rotateY(0deg); }
            50%  { transform: rotateY(1800deg); animation-timing-function: cubic-bezier(0, 0.5, 0.5, 1); }
            100% { transform: rotateY(3600deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#000000', fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>

      {/* Painel editorial — desktop */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 64px', borderRight: '1px solid #1c1d22' }} className="slash-panel">
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e3e9', letterSpacing: '-0.007em' }}>
          Fin<span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: '#cc9166' }}>Control</span>
        </div>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#5e616e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '20px' }}>Controle financeiro familiar</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 400, color: '#e2e3e9', lineHeight: 1.15, letterSpacing: '-0.01em', margin: 0 }}>
            Suas finanças,<br />
            <span style={{ fontStyle: 'italic', color: '#cc9166' }}>clareza total.</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#777a88', letterSpacing: '-0.007em', marginTop: '24px', lineHeight: 1.6, maxWidth: '360px' }}>
            Dashboard completo para acompanhar receitas, despesas, cartões e metas em um só lugar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { valor: 'Tempo real', desc: 'Sincronizado' },
            { valor: 'Cartões', desc: 'Faturas e parcelas' },
            { valor: 'Metas', desc: 'Reserva de emergência' },
          ].map(item => (
            <div key={item.valor}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e3e9', letterSpacing: '-0.007em' }}>{item.valor}</div>
              <div style={{ fontSize: '11px', color: '#5e616e', marginTop: '2px', letterSpacing: '-0.007em' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulário */}
      <div style={{ width: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 48px' }} className="slash-form-panel">
        <div style={{ width: '100%' }}>

          <div style={{ marginBottom: '40px' }} className="slash-logo-mobile">
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e3e9', letterSpacing: '-0.007em' }}>
              Fin<span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: '#cc9166' }}>Control</span>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#e2e3e9', letterSpacing: '-0.02em', margin: 0, marginBottom: '6px' }}>Acessar conta</h2>
            <p style={{ fontSize: '13px', color: '#777a88', margin: 0, letterSpacing: '-0.007em' }}>Entre com suas credenciais para continuar</p>
          </div>

          {erro && (
            <div style={{ background: '#1c1d22', border: '1px solid #cc916640', borderRadius: '2px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: '#cc9166', letterSpacing: '-0.007em' }}>
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#5e616e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={carregando}
                style={{ width: '100%', padding: '10px 12px', background: '#121317', border: '1px solid #2e3038', borderRadius: '2px', fontSize: '14px', color: '#e2e3e9', outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.007em', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#cc9166'}
                onBlur={e => e.target.style.borderColor = '#2e3038'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#5e616e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                disabled={carregando}
                style={{ width: '100%', padding: '10px 12px', background: '#121317', border: '1px solid #2e3038', borderRadius: '2px', fontSize: '14px', color: '#e2e3e9', outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.007em', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#cc9166'}
                onBlur={e => e.target.style.borderColor = '#2e3038'}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{ marginTop: '8px', width: '100%', padding: '11px', background: carregando ? '#1c1d22' : '#ffffff', color: carregando ? '#5e616e' : '#08080a', border: '1px solid ' + (carregando ? '#2e3038' : '#ffffff'), borderRadius: '2px', fontSize: '14px', fontWeight: 600, cursor: carregando ? 'not-allowed' : 'pointer', letterSpacing: '-0.007em', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s, color 0.15s' }}
            >
              {carregando ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '1.5px solid #2e3038', borderTop: '1.5px solid #cc9166', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <p style={{ marginTop: '32px', fontSize: '12px', color: '#464853', letterSpacing: '-0.007em', textAlign: 'center', lineHeight: 1.6 }}>
            Acesso restrito aos membros da família.<br />Conta gerenciada pelo administrador.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }

        .slash-logo-mobile { display: none !important; }

        @media (max-width: 768px) {
          .slash-panel { display: none !important; }
          .slash-form-panel {
            width: 100% !important;
            padding: 48px 28px !important;
          }
          .slash-logo-mobile { display: block !important; }
        }

        input::placeholder { color: #464853; }
        input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
