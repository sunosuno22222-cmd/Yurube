import React, { useState, useEffect } from 'react';
import { runPingSequence, maskIpAddress } from '../utils/ping';
import { LatencyGauge } from './LatencyGauge';
import { ClientInfo, BenchmarkNode } from '../types';
import { FunnyCelebrationModal } from './FunnyCelebrationModal';
import {
  Globe,
  Shield,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  Copy,
  Share2,
  Server,
  Zap,
  ArrowRight,
  Info,
  Flame,
  HelpCircle,
  Sparkles,
  Wifi,
  Activity
} from 'lucide-react';

interface VisitorTesterProps {
  onSessionSaved?: () => void;
  onOpenAdmin: () => void;
}

const DEFAULT_BENCHMARKS: BenchmarkNode[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare DNS (1.1.1.1)',
    host: '1.1.1.1',
    port: 443,
    location: 'Anycast Global Edge',
    flag: '⚡',
    status: 'idle'
  },
  {
    id: 'google',
    name: 'Google Public DNS (8.8.8.8)',
    host: '8.8.8.8',
    port: 443,
    location: 'Anycast DNS Global',
    flag: '🌐',
    status: 'idle'
  },
  {
    id: 'aws-sp',
    name: 'Servidores São Paulo (Cloud/Jogos)',
    host: 'sa-east-1.amazonaws.com',
    port: 443,
    location: 'São Paulo, Brasil',
    flag: '🇧🇷',
    status: 'idle'
  },
  {
    id: 'quad9',
    name: 'Quad9 DNS Seguro (9.9.9.9)',
    host: '9.9.9.9',
    port: 443,
    location: 'Segurança & Filtro DNS',
    flag: '🛡️',
    status: 'idle'
  }
];

export const VisitorTester: React.FC<VisitorTesterProps> = ({ onSessionSaved, onOpenAdmin }) => {
  const [userName, setUserName] = useState('');
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [hideIp, setHideIp] = useState(true);

  // Ping metrics state
  const [isTesting, setIsTesting] = useState(false);
  const [currentLatency, setCurrentLatency] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);
  const [minLatency, setMinLatency] = useState(0);
  const [maxLatency, setMaxLatency] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [samples, setSamples] = useState<number[]>([]);

  // UI status
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkNode[]>(DEFAULT_BENCHMARKS);
  const [isTestingBenchmarks, setIsTestingBenchmarks] = useState(false);

  // Funny celebration modal
  const [showFunnyModal, setShowFunnyModal] = useState(false);

  // Load client info on mount
  useEffect(() => {
    fetch('/api/client-info')
      .then(res => res.json())
      .then((data: ClientInfo) => {
        setClientInfo(data);
      })
      .catch(() => {
        // Fallback info
        setClientInfo({
          ip: '127.0.0.1',
          isPrivate: true,
          isIpv6: false,
          userAgent: navigator.userAgent,
          serverTime: Date.now(),
          geo: {
            city: 'Local',
            country: 'Brasil',
            isp: 'Conexão Direta'
          }
        });
      });

    // Check localStorage for previous name
    const savedName = localStorage.getItem('netping_user_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const handleStartTest = async () => {
    const finalName = userName.trim() || 'Visitante Curioso';

    setIsTesting(true);
    setSavedSuccess(null);
    setCurrentLatency(0);
    setSamples([]);

    try {
      const result = await runPingSequence(8, 250, (curr, all) => {
        setCurrentLatency(curr);
        setSamples([...all]);
      });

      setCurrentLatency(result.samples[result.samples.length - 1]);
      setAverageLatency(result.averageLatency);
      setMinLatency(result.minLatency);
      setMaxLatency(result.maxLatency);
      setJitter(result.jitter);
      setPacketLoss(result.packetLoss);
      setSamples(result.samples);

      // Save name to localStorage
      if (userName.trim()) {
        localStorage.setItem('netping_user_name', userName.trim());
      }

      // Persist to server session store
      const effectiveIp = result.clientIp || clientInfo?.ip || '127.0.0.1';

      const saveRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          ip: effectiveIp,
          latency: result.averageLatency,
          jitter: result.jitter,
          minLatency: result.minLatency,
          maxLatency: result.maxLatency,
          packetLoss: result.packetLoss,
          userAgent: navigator.userAgent
        })
      });

      if (saveRes.ok) {
        setSavedSuccess(`Latência salva com sucesso sob o nome "${finalName}"!`);
        if (onSessionSaved) onSessionSaved();
        // Trigger funny celebration modal!
        setShowFunnyModal(true);
      }
    } catch (err: any) {
      console.error('Erro no teste de latência:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestBenchmarks = async () => {
    setIsTestingBenchmarks(true);

    const updated = [...benchmarks];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'testing' };
      setBenchmarks([...updated]);

      try {
        const res = await fetch('/api/probe-ip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: updated[i].host,
            port: updated[i].port,
            timeoutMs: 3000
          })
        });

        const data = await res.json();
        if (data.success) {
          updated[i] = { ...updated[i], latency: data.latencyMs, status: 'success' };
        } else {
          updated[i] = { ...updated[i], status: 'error' };
        }
      } catch {
        updated[i] = { ...updated[i], status: 'error' };
      }

      setBenchmarks([...updated]);
    }

    setIsTestingBenchmarks(false);
  };

  const handleCopyShareLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const displayIp = clientInfo?.ip
    ? hideIp
      ? maskIpAddress(clientInfo.ip)
      : clientInfo.ip
    : 'Identificando...';

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Hero Welcome & Privacy Notice */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          Olho do Diabo: O Rastreador Supremo de Conexões
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-balance">
          Olho do Diabo <span className="text-red-500">·</span> Monitor de Latência
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Descubra a velocidade real da sua internet! O <strong className="text-red-400 font-bold">Olho do Diabo</strong> mede seu ping em milissegundos. Coloque apenas seu <strong className="text-amber-400 font-bold">Nome</strong> antes de testar para salvar com segurança e ver seu resultado no painel!
        </p>
      </div>

      {/* Main Interactive Testing Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Name identification & IP Info */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Name Step */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold tracking-tight">
                1. Coloque seu Nome Primeiro (Mais Seguro)
              </h2>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Por que o nome antes?</strong> Porque ninguém quer ver um bando de números de IP confusos! Ao colocar seu nome, seu teste fica etiquetado (ex: <em>"Carlos Fibra"</em> ou <em>"Meu PC Gamer"</em>) e protegido no painel.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Seu Nome ou Apelido
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Digite seu nome (Ex: Lucas, Gabriel Casa, PC Quarto)..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-xs mr-1">Sugestões rápidas:</span>
              {['Meu PC', 'Fibra Casa', 'Notebook Trabalho', 'Celular 5G', 'Quarto Gamer'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setUserName(tag)}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Detected IP Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Globe className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-bold tracking-tight">
                  2. Seu Endereço IP na Mira
                </h2>
              </div>
              <button
                onClick={() => setHideIp(!hideIp)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 transition-colors"
                title={hideIp ? 'Mostrar IP completo' : 'Ocultar IP para segurança'}
              >
                {hideIp ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{hideIp ? 'Mostrar IP' : 'Ocultar IP'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">IP Detectado pelo Olho:</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {clientInfo?.isPrivate ? 'Rede Local' : 'IP Público Seguro'}
                </span>
              </div>
              <div className="mt-1.5 text-lg font-mono font-bold text-white tracking-wide select-all">
                {displayIp}
              </div>
            </div>

            {/* Provider and location info */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500 block">Provedor de Internet</span>
                <span className="text-slate-200 font-medium truncate block">
                  {clientInfo?.geo?.isp || 'Provedor Local'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Localização Aproximada</span>
                <span className="text-slate-200 font-medium truncate block">
                  {clientInfo?.geo?.city ? `${clientInfo.geo.city}, ${clientInfo.geo.country}` : 'Detectando...'}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 bg-red-950/20 p-2.5 rounded-lg border border-red-900/40">
              <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">Segurança total:</strong> O Olho do Diabo mascara seu IP para evitar vazamentos. Para ver os IPs em detalhes, só com a senha <code className="text-amber-300 font-mono">dog_satan</code>.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Latency Diagnostic & Test Trigger */}
        <div className="lg:col-span-7 space-y-4">
          <LatencyGauge
            currentLatency={currentLatency}
            averageLatency={averageLatency}
            minLatency={minLatency}
            maxLatency={maxLatency}
            jitter={jitter}
            packetLoss={packetLoss}
            samples={samples}
            isTesting={isTesting}
            onRefresh={handleStartTest}
          />

          {/* Action Trigger Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-500" />
                {userName.trim() ? `Pronto para testar como "${userName.trim()}"` : 'Coloque seu nome e teste a latência'}
              </h3>
              <p className="text-xs text-slate-400">
                Dispara pacotes ultra-rápidos e revela a qualidade do seu sinal instantaneamente.
              </p>
            </div>

            <button
              onClick={handleStartTest}
              disabled={isTesting}
              className="w-full sm:w-auto px-6 py-3 text-sm font-extrabold text-slate-950 bg-gradient-to-r from-red-500 to-amber-400 hover:from-red-400 hover:to-amber-300 active:scale-98 disabled:opacity-50 rounded-lg transition-all shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isTesting ? (
                <>
                  <Zap className="w-4 h-4 animate-bounce text-slate-950" />
                  <span>O Olho Está Medindo...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>Invocar Teste de Latência!</span>
                </>
              )}
            </button>
          </div>

          {/* Success Save Banner */}
          {savedSuccess && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-red-400 shrink-0" />
                <span>{savedSuccess}</span>
              </div>
              <button
                onClick={onOpenAdmin}
                className="px-3 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors whitespace-nowrap"
              >
                Abrir no Painel
              </button>
            </div>
          )}

          {/* Share with Friends Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-white block">Envie para um amigo testar a internet dele!</span>
                <span className="text-slate-400">Ele coloca o nome, o teste roda e você confere quem tem a internet mais rápida no painel secreto.</span>
              </div>
            </div>
            <button
              onClick={handleCopyShareLink}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Desafio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Super Explanatory Pedagogical Guide Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Guia Didático do Olho do Diabo: Entenda Tudo de Forma Simples
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <Zap className="w-4 h-4 text-red-400" />
              <span>1. O que é Latência (Ping)?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              É o tempo (em milissegundos) que leva para um pacote sair do seu aparelho, chegar no servidor e voltar.
            </p>
            <div className="pt-1 text-slate-300 font-mono text-[11px] space-y-0.5">
              <div>&bull; <strong className="text-emerald-400">&le; 30ms:</strong> Conexão perfeita (Zero lag)</div>
              <div>&bull; <strong className="text-sky-400">30-70ms:</strong> Ótimo para tudo</div>
              <div>&bull; <strong className="text-amber-400">70-120ms:</strong> Pequeno atraso em jogos</div>
              <div>&bull; <strong className="text-rose-400">&gt; 120ms:</strong> Trava e engasga</div>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>2. O que é Jitter e Perda?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Jitter:</strong> é a instabilidade. Se o ping fica oscilando entre 20ms e 180ms, o áudio da sua call fica parecendo um robô.
            </p>
            <p className="text-slate-400 leading-relaxed pt-1">
              <strong className="text-slate-200">Perda de Pacotes:</strong> quando informações se perdem nos cabos e seus cliques ou tiros nos jogos não registram.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>3. Por que salvar por Nome?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              O IP é só um número técnico e sensível. Ao associar seu <strong className="text-white">Nome</strong>, você sabe exatamente qual amigo ou computador registrou cada teste no painel!
            </p>
            <p className="text-slate-400 leading-relaxed pt-1">
              O painel com todos os IPs só abre colocando a senha secreta: <code className="text-amber-400 font-mono font-bold">dog_satan</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Benchmark Comparisons Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Server className="w-4 h-4 text-red-400" />
              Comparativo com Grandes Servidores Globais
            </h2>
            <p className="text-xs text-slate-400">
              Veja a latência para os principais servidores de DNS e jogos do mundo.
            </p>
          </div>

          <button
            onClick={handleTestBenchmarks}
            disabled={isTestingBenchmarks}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isTestingBenchmarks ? 'text-red-400 animate-spin' : ''}`} />
            <span>{isTestingBenchmarks ? 'Medindo Servidores...' : 'Testar Todos os Servidores'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {benchmarks.map((node) => (
            <div
              key={node.id}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{node.flag}</span>
                <span className="text-xs font-mono text-slate-500">{node.host}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white truncate">{node.name}</h4>
                <span className="text-xs text-slate-400 block">{node.location}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Latência:</span>
                <span className="text-sm font-mono font-bold tabular-nums">
                  {node.status === 'testing' ? (
                    <span className="text-xs text-red-400 animate-pulse">Testando...</span>
                  ) : node.status === 'success' && node.latency !== undefined ? (
                    <span className={node.latency < 40 ? 'text-emerald-400' : node.latency < 90 ? 'text-sky-400' : 'text-amber-400'}>
                      {node.latency} ms
                    </span>
                  ) : node.status === 'error' ? (
                    <span className="text-xs text-rose-400">Falha</span>
                  ) : (
                    <span className="text-xs text-slate-600">--</span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The Funny Celebration Modal with devil dog meme */}
      <FunnyCelebrationModal
        isOpen={showFunnyModal}
        onClose={() => setShowFunnyModal(false)}
        userName={userName.trim() || 'Visitante Curioso'}
        latency={averageLatency || currentLatency || 18}
        jitter={jitter}
        ip={clientInfo?.ip || '127.0.0.1'}
        onOpenAdmin={onOpenAdmin}
      />
    </div>
  );
};

