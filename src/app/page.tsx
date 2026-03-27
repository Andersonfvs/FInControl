'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    // authStateReady() espera o Firebase restaurar a sessão do localStorage
    // antes de qualquer decisão — sem loops, sem race conditions
    auth.authStateReady().then(() => {
      if (auth.currentUser) {
        router.push('/dashboard');
      } else {
        setVerificandoSessao(false);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Erro no login:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErro('Email ou senha incorretos');
      } else if (error.code === 'auth/user-not-found') {
        setErro('Usuário não encontrado');
      } else if (error.code === 'auth/too-many-requests') {
        setErro('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        setErro('Erro ao fazer login. Tente novamente.');
      }
      setCarregando(false);
    }
  };

  if (verificandoSessao) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Verificando sessão...
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <>
      <div className="login-container">
        <div className="banner-lateral">
          <div className="logo-container">💎</div>
          <h1 className="titulo">FinControl</h1>
          <p className="subtitulo">Controle financeiro familiar inteligente</p>
          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <div>
                <div className="feature-titulo">Dashboard intuitivo</div>
                <div className="feature-desc">Visualize suas finanças em tempo real</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <div>
                <div className="feature-titulo">Gestão de cartões</div>
                <div className="feature-desc">Controle de faturas e parcelas</div>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <div>
                <div className="feature-titulo">Sincronizado na nuvem</div>
                <div className="feature-desc">Acesse de qualquer lugar</div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-container">
          <div className="form-wrapper">
            <div className="logo-mobile">
              <div className="logo-icon">💎</div>
              <h1 className="titulo-mobile">FinControl</h1>
            </div>

            <div className="form-header">
              <h2 className="form-titulo">Bem-vindo de volta!</h2>
              <p className="form-subtitulo">Entre com suas credenciais</p>
            </div>

            {erro && (
              <div className="erro-box">
                <span>⚠️</span>
                {erro}
              </div>
            )}

            <form onSubmit={handleLogin} className="form">
              <div className="input-group">
                <label className="input-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={carregando}
                  className="input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={carregando}
                  className="input-field"
                />
              </div>

              <button type="submit" disabled={carregando} className="btn-entrar">
                {carregando ? (
                  <>
                    <div className="spinner"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span>🔓</span>
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container { min-height: 100vh; display: flex; background: #fafafa; }
        .banner-lateral { flex: 1; background: linear-gradient(135deg, #047857, #1e3a8a); padding: 3rem; display: flex; flex-direction: column; justify-content: center; color: white; }
        .logo-container { width: 80px; height: 80px; background: rgba(255, 255, 255, 0.2); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 2rem; backdrop-filter: blur(10px); }
        .titulo { font-size: 3rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.02em; }
        .subtitulo { font-size: 1.25rem; opacity: 0.9; margin-bottom: 3rem; }
        .features { display: flex; flex-direction: column; gap: 1rem; }
        .feature-card { display: flex; gap: 1rem; align-items: center; background: rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 0.75rem; backdrop-filter: blur(10px); }
        .feature-icon { font-size: 1.5rem; }
        .feature-titulo { font-weight: 600; }
        .feature-desc { font-size: 0.875rem; opacity: 0.9; }
        .form-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .form-wrapper { width: 100%; max-width: 400px; }
        .logo-mobile { display: none; }
        .form-header { margin-bottom: 2rem; }
        .form-titulo { font-size: 2rem; fontWeight: 700; margin-bottom: 0.5rem; color: #111827; }
        .form-subtitulo { color: #6b7280; font-size: 1rem; }
        .erro-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
        .form { display: flex; flex-direction: column; gap: 1.25rem; }
        .input-group { display: flex; flex-direction: column; }
        .input-label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #374151; }
        .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.9375rem; outline: none; box-sizing: border-box; }
        .input-field:focus { border-color: #10b981; }
        .input-field:disabled { background: #f9fafb; cursor: not-allowed; }
        .btn-entrar { width: 100%; padding: 0.875rem 1.5rem; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: opacity 0.2s; }
        .btn-entrar:hover:not(:disabled) { opacity: 0.9; }
        .btn-entrar:disabled { cursor: not-allowed; opacity: 0.5; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-container { flex-direction: column; }
          .banner-lateral { display: none; }
          .logo-mobile { display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem; }
          .logo-icon { width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 1rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 0.75rem; }
          .titulo-mobile { font-size: 1.75rem; font-weight: 800; color: #111827; margin: 0; }
          .form-container { padding: 1.5rem; }
          .form-titulo { font-size: 1.5rem; }
          .form-subtitulo { font-size: 0.875rem; }
        }
      `}</style>
    </>
  );
}