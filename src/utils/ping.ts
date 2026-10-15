export async function measureSinglePing(url = '/api/ping'): Promise<{ latency: number; clientIp?: string }> {
  const start = performance.now();
  const cacheBuster = `${url}?t=${Date.now()}_${Math.random()}`;

  try {
    const res = await fetch(cacheBuster, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const end = performance.now();
    const latency = Math.max(1, Math.round((end - start) * 10) / 10);
    return { latency, clientIp: data.clientIp };
  } catch (err) {
    const end = performance.now();
    throw new Error('Falha no ping: ' + (err as Error).message);
  }
}

export async function runPingSequence(
  samplesCount = 6,
  intervalMs = 300,
  onSample?: (current: number, samples: number[]) => void
): Promise<{
  samples: number[];
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  jitter: number;
  packetLoss: number;
  clientIp?: string;
}> {
  const samples: number[] = [];
  let detectedIp: string | undefined;
  let failed = 0;

  for (let i = 0; i < samplesCount; i++) {
    try {
      const res = await measureSinglePing();
      samples.push(res.latency);
      if (res.clientIp) detectedIp = res.clientIp;
      if (onSample) onSample(res.latency, [...samples]);
    } catch {
      failed++;
    }

    if (i < samplesCount - 1) {
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  if (samples.length === 0) {
    throw new Error('Nenhum pacote respondeu');
  }

  const sum = samples.reduce((acc, val) => acc + val, 0);
  const avg = Math.round((sum / samples.length) * 10) / 10;
  const min = Math.min(...samples);
  const max = Math.max(...samples);

  // Jitter: mean difference between consecutive packets (RFC 3550 style)
  let jitterSum = 0;
  for (let i = 1; i < samples.length; i++) {
    jitterSum += Math.abs(samples[i] - samples[i - 1]);
  }
  const jitter = samples.length > 1
    ? Math.round((jitterSum / (samples.length - 1)) * 10) / 10
    : 0;

  const packetLoss = Math.round((failed / samplesCount) * 100);

  return {
    samples,
    averageLatency: avg,
    minLatency: min,
    maxLatency: max,
    jitter,
    packetLoss,
    clientIp: detectedIp
  };
}

export function maskIpAddress(ip: string): string {
  if (!ip) return '***.***.***.***';
  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    if (parts.length > 2) {
      return `${parts[0]}:${parts[1]}:****:****:${parts[parts.length - 1]}`;
    }
    return '****:****:****';
  }

  // IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***.***';
}

export function getLatencyQuality(latency: number): {
  label: string;
  color: string;
  bg: string;
  description: string;
} {
  if (latency <= 30) {
    return {
      label: 'Excelente',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      description: 'Ideal para jogos competitivos e chamadas em 4K'
    };
  }
  if (latency <= 70) {
    return {
      label: 'Bom',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
      description: 'Ótimo para streaming e navegação fluida'
    };
  }
  if (latency <= 120) {
    return {
      label: 'Regular',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
      description: 'Pode apresentar leve atraso em jogos online'
    };
  }
  return {
    label: 'Alto / Instável',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
    description: 'Atraso perceptível e risco de buffering'
  };
}
