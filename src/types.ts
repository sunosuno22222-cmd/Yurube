export interface LatencyHistorySample {
  timestamp: number;
  latency: number;
}

export interface PingSession {
  id: string;
  name: string;
  ip: string;
  isIpv6: boolean;
  isPrivate: boolean;
  latency: number;
  jitter: number;
  minLatency: number;
  maxLatency: number;
  packetLoss: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  userAgent?: string;
  deviceType?: string;
  timestamp: number;
  lastSeen: number;
  history: LatencyHistorySample[];
  notes?: string;
}

export interface ClientInfo {
  ip: string;
  isPrivate: boolean;
  isIpv6: boolean;
  userAgent: string;
  serverTime: number;
  geo?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
  };
}

export interface PingTestResult {
  currentLatency: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  jitter: number;
  packetLoss: number;
  samples: number[];
  serverIp: string;
}

export interface BenchmarkNode {
  id: string;
  name: string;
  host: string;
  port: number;
  location: string;
  flag: string;
  latency?: number;
  status: 'idle' | 'testing' | 'success' | 'error';
}
