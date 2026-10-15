import React, { useState } from 'react';
import { Target, Zap, Clock, Shield, Plus, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { getLatencyQuality } from '../utils/ping';

interface LivePingToolProps {
  adminPassword?: string;
  onSessionAdded?: () => void;
}

export const LivePingTool: React.FC<LivePingToolProps> = ({ adminPassword, onSessionAdded }) => {
  const [targetIp, setTargetIp] = useState('');
  const [targetPort, setTargetPort] = useState('443');
  const [isProbing, setIsProbing] = useState(false);
  const [result, setResult] = useState<{
    target: string;
    port: number;
    success: boolean;
    latencyMs?: number;
    protocol?: string;
    note?: string;
    error?: string;
  } | null>(null);

  // Quick save as person state
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetIp.trim()) return;

    setIsProbing(true);
    setResult(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/probe-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetIp.trim(),
          port: Number(targetPort) || 443,
          timeoutMs: 4000
        })
      });

      const data = await res.json();
      setResult(data);
      if (data.success && !saveName) {
        setSaveName(`Host ${targetIp.trim()}`);
      }
    } catch (err: any) {
      setResult({
        target: targetIp.trim(),
        port: Number(targetPort) || 443,
        success: false,
        error: 'Erro de conexão: ' + err.message
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handleSaveToPanel = async () => {
    if (!saveName.trim() || !result?.latencyMs) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminPassword ? { 'x-admin-password': adminPassword } : {})
        },
        body: JSON.stringify({
          name: saveName.trim(),
          ip: targetIp.trim(),
          latency: result.latencyMs,
          jitter: 0.5,
          minLatency: result.latencyMs,
          maxLatency: result.latencyMs,
          packetLoss: 0,
          notes: `Adicionado via Diagnóstico de IP (Porta ${targetPort})`
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (onSessionAdded) onSessionAdded();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const quickIps = [
    { label: 'Google DNS', ip: '8.8.8.8', port: '53' },
    { label: 'Cloudflare', ip: '1.1.1.1', port: '443' },
    { label: 'OpenDNS', ip: '208.67.222.222', port: '443' },
    { label: 'Quad9 DNS', ip: '9.9.9.9', port: '53' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">
            Diagnóstico e Teste de Latência por IP / Host
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Envie sondas de rede (TCP Handshake) diretamente para qualquer endereço IP ou servidor para medir o tempo exato de resposta em milissegundos.
        </p>
      </div>

      <form onSubmit={handleProbe} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Endereço IP ou Domínio de Destino
            </label>
            <input
              type="text"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value)}
              placeholder="Ex: 8.8.8.8, 177.136.20.10 ou meudominio.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Porta de Teste
            </label>
            <select
              value={targetPort}
              onChange={(e) => setTargetPort(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="443">443 (HTTPS Web)</option>
              <option value="80">80 (HTTP Web)</option>
              <option value="53">53 (DNS)</option>
              <option value="22">22 (SSH)</option>
              <option value="8080">8080 (Proxy/Web)</option>
            </select>
          </div>
        </div>

        {/* Quick IP presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Alvos Rápidos:</span>
          {quickIps.map((q) => (
            <button
              key={q.ip}
              type="button"
              onClick={() => {
                setTargetIp(q.ip);
                setTargetPort(q.port);
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-mono"
            >
              {q.label} ({q.ip})
            </button>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isProbing || !targetIp.trim()}
            className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-98 disabled:opacity-50 rounded-lg transition-all flex items-center gap-2 shadow-sm"
          >
            <Zap className={`w-4 h-4 ${isProbing ? 'animate-bounce' : ''}`} />
            <span>{isProbing ? 'Sondando Conexão...' : 'Medir Latência deste IP'}</span>
          </button>
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="pt-4 border-t border-slate-800 animate-fade-in space-y-4">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Alvo Testado</span>
                <span className="text-sm font-mono font-bold text-white">
                  {result.target}:{result.port}
                </span>
              </div>

              {result.success && result.latencyMs !== undefined ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-emerald-400 tabular-nums">
                    {result.latencyMs.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-slate-400 font-mono">ms</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Inacessível ou Timeout</span>
                </div>
              )}
            </div>

            {result.success ? (
              <div className="mt-3 text-xs text-slate-400 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-2.5">
                <span className="text-emerald-400">✓ Resposta confirmada</span>
                <span>·</span>
                <span>Protocolo: {result.protocol || 'TCP Handshake'}</span>
                {result.note && (
                  <>
                    <span>·</span>
                    <span className="text-slate-300">{result.note}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-2 text-xs text-rose-300">
                {result.error || 'Não foi possível estabelecer conexão no tempo limite estipulado.'}
              </div>
            )}
          </div>

          {/* Save to list option */}
          {result.success && (
            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Salvar este IP no Painel por Nome
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Nome para identificar (Ex: Servidor Game, Amigo Lucas)..."
                  className="w-full sm:flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="button"
                  onClick={handleSaveToPanel}
                  disabled={isSaving || !saveName.trim() || saveSuccess}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>Salvo no Painel!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar por Nome'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
