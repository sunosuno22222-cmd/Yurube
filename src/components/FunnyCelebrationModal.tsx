import React from 'react';
import { X, Sparkles, Zap, ShieldCheck, Flame, Share2, Copy, Check } from 'lucide-react';

interface FunnyCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  latency: number;
  jitter: number;
  ip: string;
  onOpenAdmin: () => void;
}

export const FunnyCelebrationModal: React.FC<FunnyCelebrationModalProps> = ({
  isOpen,
  onClose,
  userName,
  latency,
  jitter,
  ip,
  onOpenAdmin
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Funny verdicts based on ping
  let verdictTitle = '';
  let verdictDescription = '';

  if (latency <= 30) {
    verdictTitle = 'KKKKKKK QUE ISSO! INTERNET DA NASA?! 🔥';
    verdictDescription = `${userName}, o dog_satan tentou roer o cabo da sua fibra mas tomou um choque de tão rápida que tá sua rede (${latency} ms)! Tá liso demais pra jogar e ver live sem travar nada!`;
  } else if (latency <= 80) {
    verdictTitle = 'KKKKKK TÁ FIRME E FORTE! O CÃOZINHO APROVOU! 🐕';
    verdictDescription = `${userName}, sua conexão tá filé com ${latency} ms! O Olho do Diabo registrou seu nome com louvor. Dá pra jogar tranquilo e a call do Discord não vai chiar.`;
  } else {
    verdictTitle = 'KKKKKKKK QUEM TÁ GIRANDO A MANIVELA DESSA INTERNET?! 💀';
    verdictDescription = `Eita, ${userName}! Deu ${latency} ms de ping! O cãozinho do Olho do Diabo tá sentado em cima do seu modem mastigando os fios de internet kkkkk! Chame o suporte ou reinicie esse roteador urgente!`;
  }

  const handleCopyVerdict = () => {
    const text = `O Olho do Diabo testou a internet de ${userName}: Ping de ${latency}ms (Jitter: ±${jitter}ms)! Quem tem a melhor conexão? Testa aí também!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Ambient fire glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4 text-center">
          {/* Header pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            O Olho do Diabo Capturou Seu Ping!
          </div>

          {/* Funny Devil Dog Image */}
          <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden border-2 border-red-500/40 shadow-lg group">
            <img
              src="/src/assets/images/funny_devil_dog_1792096480109.jpg"
              alt="Cãozinho do Diabo mastigando cabos de internet"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-mono">
              dog_satan.exe
            </div>
          </div>

          {/* Verdict and funny comment */}
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white tracking-tight leading-snug">
              {verdictTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              {verdictDescription}
            </p>
          </div>

          {/* Telemetry Snapshot */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Nome Salvo</span>
              <span className="text-xs font-bold text-white truncate block">{userName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Latência (Ping)</span>
              <span className="text-sm font-bold text-red-400 tabular-nums">{latency.toFixed(1)} ms</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Jitter</span>
              <span className="text-xs font-bold text-amber-400 tabular-nums">±{jitter.toFixed(1)} ms</span>
            </div>
          </div>

          {/* Explanatory callout */}
          <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-left text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-red-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>O que aconteceu agora?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Seus dados de conexão foram gravados de forma segura sob o nome <strong className="text-white">"{userName}"</strong>. O dono do site agora consegue abrir o painel secreto com a senha <code className="px-1 py-0.2 bg-black text-amber-400 rounded font-mono font-bold">dog_satan</code> e comparar o ping de todo mundo!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={handleCopyVerdict}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado para zoar amigo!' : 'Copiar e Zoar no WhatsApp'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Abrir Painel (dog_satan)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
