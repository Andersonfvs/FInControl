'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#fafafa'
    }}>
      {/* Banner Lateral */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #047857, #1e3a8a)',
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '2rem',
          backdropFilter: 'blur(10px)'
        }}>
          💎
        </div>

        <h1 style={{
          fontSize: '3rem',
          fontWeight: '800',
          marginBottom: '1rem',
          letterSpacing: '-0.02em'
        }}>
          FinControl
        </h1>

        <p style={{
          fontSize: '1.25rem',
          opacity: 0.9,
          marginBottom: '3rem'
        }}>
          Controle financeiro familiar inteligente
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '1.5rem' }}>✓</div>
            <div>
              <div style={{ fontWeight: '600' }}>Dashboard intuitivo</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Visualize suas finanças em tempo real</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '1.5rem' }}>✓</div>
            <div>
              <div style={{ fontWeight: '600' }}>Gestão de cartões</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Controle de faturas e parcelas</div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '0.75rem',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: '1.5rem' }}>✓</div>
            <div>
              <div style={{ fontWeight: '600' }}>Sincronizado na nuvem</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Acesse de qualquer lugar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Login */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              Bem-vindo de volta!
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              Entre com suas credenciais
            </p>
          </div>

          {erro && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={carregando}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151'
              }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                disabled={carregando}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.9375rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{
                width: '100%',
                padding: '0.875rem 1.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: carregando ? 'not-allowed' : 'pointer',
                opacity: carregando ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {carregando ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></div>
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}