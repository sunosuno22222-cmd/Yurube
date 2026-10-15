import React, { useState, useEffect } from 'react';
import { runPingSequence } from './utils/ping';
import { AdminPanel } from './components/AdminPanel';
import { AdminModal } from './components/AdminModal';
import { Flame, Lock, ArrowRight, ShieldCheck, Zap, RotateCcw } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'name_input' | 'meme' | 'admin'>('name_input');
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedLatency, setDetectedLatency] = useState<number | null>(null);

  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check existing session
  useEffect(() => {
    const savedName = localStorage.getItem('olho_diabo_nome');
    if (savedName) {
      setUserName(savedName);
    }

    const savedPwd = sessionStorage.getItem('netping_admin_pwd');
    if (savedPwd) {
      fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPwd })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setIsAuthenticated(true);
            setAdminPassword(savedPwd);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    const cleanName = userName.trim();
    localStorage.setItem('olho_diabo_nome', cleanName);

    try {
      // Measure real ping in background
      const pingRes = await runPingSequence(4, 150);
      setDetectedLatency(pingRes.averageLatency);

      // Save to server
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          ip: pingRes.clientIp || '',
          latency: pingRes.averageLatency,
          jitter: pingRes.jitter,
          minLatency: pingRes.minLatency,
          maxLatency: pingRes.maxLatency,
          packetLoss: pingRes.packetLoss,
          userAgent: navigator.userAgent
        })
      });
    } catch (err) {
      // Fallback save even if ping test network hiccup
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            latency: 24,
            jitter: 1.2
          })
        });
      } catch {}
      setDetectedLatency(24);
    } finally {
      setIsSubmitting(false);
      setScreen('meme');
    }
  };

  const handleLoginSuccess = (password: string) => {
    setIsAuthenticated(true);
    setAdminPassword(password);
    sessionStorage.setItem('netping_admin_pwd', password);
    setScreen('admin');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPassword('');
    sessionStorage.removeItem('netping_admin_pwd');
    setScreen('meme');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-red-500/30 selection:text-red-200">
      {/* ---------------------------------------------------------------- */}
      {/* TELA 1: APENAS O NOME "OLHO DO DIABO" E CAMPO PARA DIGITAR O NOME */}
      {/* ---------------------------------------------------------------- */}
      {screen === 'name_input' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full text-center animate-fade-in">
          {/* Flame eye emblem */}
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
            <Flame className="w-9 h-9 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase mb-8">
            Olho do Diabo
          </h1>

          <form onSubmit={handleProceed} className="w-full space-y-4">
            <div className="relative">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Digite seu nome..."
                autoFocus
                required
                className="w-full px-5 py-4 bg-slate-950/90 border-2 border-slate-800 rounded-xl text-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all text-center font-medium shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !userName.trim()}
              className="w-full py-4 text-base font-extrabold text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 active:scale-98 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Zap className="w-5 h-5 animate-bounce text-slate-950" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <span>Prosseguir</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Discreet admin button at the bottom */}
          <div className="mt-12">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Painel com senha</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TELA 2: IMAGEM ENGRAÇADA NO MEIO E BOTÃO DE SENHA LÁ EM CIMA     */}
      {/* ---------------------------------------------------------------- */}
      {screen === 'meme' && (
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          {/* Top Bar com o botão para colocar a senha */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-red-950/40 bg-slate-950/80 backdrop-blur-md">
            <button
              onClick={() => setScreen('name_input')}
              className="text-lg font-black tracking-tight text-white hover:text-red-400 transition-colors flex items-center gap-2"
            >
              <Flame className="w-5 h-5 text-red-500" />
              <span>Olho do Diabo</span>
            </button>

            <button
              onClick={() => {
                if (isAuthenticated) {
                  setScreen('admin');
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              {isAuthenticated ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Abrir Painel</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Abrir Painel (Colocar Senha)</span>
                </>
              )}
            </button>
          </header>

          {/* Centro da tela: Imagem engraçada */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto">
            {/* Imagem Hilária do Devil Dog mastigando cabos de internet */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border-4 border-red-500/50 shadow-2xl shadow-red-950 mb-6 bg-slate-900 group">
              <img
                src="/src/assets/images/funny_devil_dog_1792096480109.jpg"
                alt="Cãozinho do Diabo mastigando cabos de internet"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-mono border border-red-500/30">
                dog_satan.exe
              </div>
            </div>

            {/* Texto Engraçado */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-2">
              KKKKKKKKKKKK O OLHO DO DIABO JÁ PEGOU SEU IP! 😈
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-4">
              Fala, <strong className="text-amber-400 font-bold">{userName || 'Parceiro'}</strong>! O dog_satan acabou de mastigar seus cabos de rede e mediu sua latência!
              {detectedLatency !== null && (
                <span className="block mt-1 font-mono text-red-400 font-bold">
                  Ping Registrado: {detectedLatency.toFixed(1)} ms
                </span>
              )}
            </p>

            {/* Ações principais */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    setScreen('admin');
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3 text-xs font-black text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Colocar Senha para Ver Todos os IPs</span>
              </button>

              <button
                onClick={() => setScreen('name_input')}
                className="w-full sm:w-auto px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Colocar Outro Nome</span>
              </button>
            </div>
          </div>

          <div className="py-4 text-center text-xs text-slate-600">
            Olho do Diabo · Monitor Secreto de IPs por Nome
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TELA 3: PAINEL SEGREDO COM SENHA (DOG_SATAN) MOSTRANDO TODOS OS IPS */}
      {/* ---------------------------------------------------------------- */}
      {screen === 'admin' && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <header className="flex items-center justify-between px-6 py-4 border-b border-red-950/40 bg-slate-950/80 backdrop-blur-md">
            <button
              onClick={() => setScreen('meme')}
              className="text-lg font-black tracking-tight text-white hover:text-red-400 transition-colors flex items-center gap-2"
            >
              <Flame className="w-5 h-5 text-red-500" />
              <span>Olho do Diabo — Painel Secreto</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setScreen('meme')}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Voltar à Tela do Meme
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg transition-colors"
              >
                Sair
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <AdminPanel
              adminPassword={adminPassword}
              onLogout={handleLogout}
            />
          </main>
        </div>
      )}

      {/* Modal para digitar a senha dog_satan */}
      <AdminModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
