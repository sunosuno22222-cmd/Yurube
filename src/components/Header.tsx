import React from 'react';
import { Activity, Lock, Unlock, ShieldCheck, Wifi } from 'lucide-react';

interface HeaderProps {
  currentTab: 'tester' | 'admin' | 'probe';
  onSelectTab: (tab: 'tester' | 'admin' | 'probe') => void;
  isAuthenticated: boolean;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isAuthenticated,
  onOpenAuthModal,
  onLogout
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-red-950/60 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-sm shadow-red-500/10">
          <Activity className="w-4 h-4 text-red-500" />
        </div>
        <button
          onClick={() => onSelectTab('tester')}
          className="text-lg font-extrabold tracking-tight text-white hover:text-red-400 transition-colors whitespace-nowrap text-left flex items-center gap-2"
        >
          <span>Olho do Diabo</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-mono font-normal">
            IP & Ping
          </span>
        </button>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('tester')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            currentTab === 'tester' ? 'text-white border-b-2 border-red-500' : ''
          }`}
        >
          Testador de Latência
        </button>
        <button
          onClick={() => {
            if (isAuthenticated) {
              onSelectTab('admin');
            } else {
              onOpenAuthModal();
            }
          }}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
            currentTab === 'admin' ? 'text-white border-b-2 border-red-500' : ''
          }`}
        >
          Painel de IPs por Nome
          {!isAuthenticated && <Lock className="w-3.5 h-3.5 text-slate-500" />}
        </button>
        <button
          onClick={() => {
            if (isAuthenticated) {
              onSelectTab('probe');
            } else {
              onOpenAuthModal();
            }
          }}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            currentTab === 'probe' ? 'text-white border-b-2 border-red-500' : ''
          }`}
        >
          Diagnóstico de IP
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
                currentTab === 'admin'
                  ? 'bg-red-500 text-white font-semibold border-red-400 shadow-sm'
                  : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Painel Liberado
            </button>
            <button
              onClick={onLogout}
              title="Encerrar sessão protegida"
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Sair
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 active:scale-98 rounded-lg transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            Entrar com Senha
          </button>
        )}
      </div>
    </header>
  );
};
