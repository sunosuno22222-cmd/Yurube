import React from 'react';
import { getLatencyQuality } from '../utils/ping';
import { Activity, Zap, RefreshCw } from 'lucide-react';

interface LatencyGaugeProps {
  currentLatency: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  jitter: number;
  packetLoss: number;
  samples: number[];
  isTesting: boolean;
  onRefresh?: () => void;
}

export const LatencyGauge: React.FC<LatencyGaugeProps> = ({
  currentLatency,
  averageLatency,
  minLatency,
  maxLatency,
  jitter,
  packetLoss,
  samples,
  isTesting,
  onRefresh
}) => {
  const quality = getLatencyQuality(currentLatency || averageLatency || 20);

  // SVG Sparkline path calculation
  const maxSample = Math.max(...samples, 100);
  const minSample = Math.min(...samples, 0);
  const range = Math.max(maxSample - minSample, 1);
  const height = 48;
  const width = 280;

  const points = samples.length > 1
    ? samples
        .map((s, idx) => {
          const x = (idx / (samples.length - 1)) * width;
          const y = height - ((s - minSample) / range) * (height - 10) - 5;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : `0,${height / 2} ${width},${height / 2}`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Diagnóstico de Latência (RTT)
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isTesting}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Repetir medição"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isTesting ? 'Testando...' : 'Re-testar'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Main metric display */}
        <div className="md:col-span-5 flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black font-mono tracking-tight text-white tabular-nums">
              {currentLatency > 0 ? currentLatency.toFixed(1) : '--'}
            </span>
            <span className="text-xl font-bold text-slate-400 font-mono">ms</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded font-medium border ${quality.bg} ${quality.color}`}>
              {quality.label}
            </span>
            <span className="text-slate-400 truncate">{quality.description}</span>
          </div>
        </div>

        {/* Real-time sparkline graph */}
        <div className="md:col-span-7 flex flex-col justify-end">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>Amostras de Pacotes ({samples.length})</span>
            <span>Média: <strong className="text-slate-200 tabular-nums">{averageLatency > 0 ? averageLatency.toFixed(1) : '--'} ms</strong></span>
          </div>

          <div className="h-14 w-full bg-slate-950/70 border border-slate-800/80 rounded-lg p-1.5 flex items-center justify-center">
            {samples.length > 0 ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
                {samples.map((s, idx) => {
                  const x = (idx / (samples.length - 1)) * width;
                  const y = height - ((s - minSample) / range) * (height - 10) - 5;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="3.5"
                      className="fill-slate-950 stroke-emerald-400 stroke-2"
                    />
                  );
                })}
              </svg>
            ) : (
              <span className="text-xs text-slate-500 font-mono">Aguardando início do teste...</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabular Telemetry Strip */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-slate-400 block">Jitter (Variação)</span>
          <span className="text-sm font-semibold font-mono tabular-nums text-slate-200">
            ± {jitter > 0 ? jitter.toFixed(1) : '0.0'} ms
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">Menor Ping (Mín)</span>
          <span className="text-sm font-semibold font-mono tabular-nums text-emerald-400">
            {minLatency > 0 ? `${minLatency.toFixed(1)} ms` : '--'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">Maior Ping (Máx)</span>
          <span className="text-sm font-semibold font-mono tabular-nums text-amber-400">
            {maxLatency > 0 ? `${maxLatency.toFixed(1)} ms` : '--'}
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-400 block">Perda de Pacotes</span>
          <span className="text-sm font-semibold font-mono tabular-nums text-slate-200">
            {packetLoss}%
          </span>
        </div>
      </div>
    </div>
  );
};
