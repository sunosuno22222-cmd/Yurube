import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory data store with file persistence fallback
interface LatencyHistorySample {
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

const DATA_DIR = path.join(__dirname, '.data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create .data dir:', err);
  }
}

// In-memory store
let sessions: PingSession[] = [];
let adminPassword = process.env.ADMIN_PASSWORD || 'dog_satan';

// Load stored data
try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    sessions = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Failed to load sessions from file:', e);
}

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const cfg = JSON.parse(raw);
    if (cfg.adminPassword) {
      adminPassword = cfg.adminPassword;
    } else {
      adminPassword = 'dog_satan';
    }
  } else {
    adminPassword = 'dog_satan';
  }
} catch (e) {
  console.warn('Failed to load config from file:', e);
  adminPassword = 'dog_satan';
}

// Helper to save sessions
function persistSessions() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist sessions:', e);
  }
}

function persistConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ adminPassword }, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist config:', e);
  }
}

// IP Helper functions
function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first) return normalizeIp(first);
  }
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string') return normalizeIp(cf.trim());
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return normalizeIp(realIp.trim());

  const remote = req.socket.remoteAddress || '127.0.0.1';
  return normalizeIp(remote);
}

function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip;
}

function isPrivateIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc00:') || ip.startsWith('fd00:') || ip.startsWith('fe80:')) return true;
  return false;
}


interface GeoInfo {
  city: string;
  region: string;
  country: string;
  countryCode: string;
  isp: string;
}

const geoCache = new Map<string, GeoInfo>();

async function getGeoForIp(ip: string): Promise<GeoInfo> {
  if (isPrivateIp(ip)) {
    return {
      city: 'Rede Local / Loopback',
      region: 'Privada',
      country: 'Rede Interna',
      countryCode: 'LAN',
      isp: 'Localhost / Intranet'
    };
  }

  const cached = geoCache.get(ip);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const info: GeoInfo = {
          city: data.city || 'Desconhecida',
          region: data.region || '',
          country: data.country || 'Desconhecido',
          countryCode: data.country_code || 'UN',
          isp: data.connection?.isp || data.connection?.org || 'Desconhecido'
        };
        geoCache.set(ip, info);
        return info;
      }
    }
  } catch {
    // fallback gracefully
  }

  const defaultGeo: GeoInfo = {
    city: 'Localização Indisponível',
    region: '',
    country: 'Global',
    countryCode: 'XX',
    isp: 'Provedor Não Identificado'
  };
  return defaultGeo;
}

// Add default sample data if completely empty
if (sessions.length === 0) {
  sessions = [
    {
      id: 'sample-google-dns',
      name: 'Google DNS (8.8.8.8)',
      ip: '8.8.8.8',
      isIpv6: false,
      isPrivate: false,
      latency: 14.2,
      jitter: 1.1,
      minLatency: 12.8,
      maxLatency: 16.5,
      packetLoss: 0,
      city: 'Mountain View',
      region: 'California',
      country: 'United States',
      countryCode: 'US',
      isp: 'Google LLC',
      timestamp: Date.now() - 3600000,
      lastSeen: Date.now() - 600000,
      history: [
        { timestamp: Date.now() - 1800000, latency: 15.0 },
        { timestamp: Date.now() - 1200000, latency: 13.8 },
        { timestamp: Date.now() - 600000, latency: 14.2 },
      ],
      notes: 'Nó de referência primário'
    },
    {
      id: 'sample-cloudflare',
      name: 'Cloudflare Edge (1.1.1.1)',
      ip: '1.1.1.1',
      isIpv6: false,
      isPrivate: false,
      latency: 9.8,
      jitter: 0.8,
      minLatency: 8.5,
      maxLatency: 11.2,
      packetLoss: 0,
      city: 'Anycast DNS',
      region: 'Global',
      country: 'Australia / Global',
      countryCode: 'AU',
      isp: 'Cloudflare, Inc.',
      timestamp: Date.now() - 7200000,
      lastSeen: Date.now() - 300000,
      history: [
        { timestamp: Date.now() - 1800000, latency: 10.4 },
        { timestamp: Date.now() - 900000, latency: 9.5 },
        { timestamp: Date.now() - 300000, latency: 9.8 },
      ],
      notes: 'Anycast de alta velocidade'
    }
  ];
  persistSessions();
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// 1. Client info: returns detected public/local IP and initial geo
app.get('/api/client-info', async (req: Request, res: Response) => {
  const ip = extractClientIp(req);
  const userAgent = req.headers['user-agent'] || 'Desconhecido';
  const geo = await getGeoForIp(ip);

  res.json({
    ip,
    isPrivate: isPrivateIp(ip),
    isIpv6: ip.includes(':'),
    userAgent,
    geo,
    serverTime: Date.now()
  });
});

// 2. High resolution Ping endpoint for client-to-server RTT
app.all('/api/ping', (req: Request, res: Response) => {
  const clientTime = Number(req.query.t || req.body?.t || Date.now());
  res.json({
    pong: true,
    clientTime,
    serverTime: Date.now(),
    clientIp: extractClientIp(req)
  });
});

// 3. Probe any target IP/host via TCP connect socket from server
app.post('/api/probe-ip', async (req: Request, res: Response) => {
  const { target, port = 443, timeoutMs = 3000 } = req.body;

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Alvo IP ou host é obrigatório' });
  }

  const cleanTarget = target.trim();

  // Measure TCP connection time
  const testPort = Number(port) || 443;
  const start = process.hrtime.bigint();

  const socket = new net.Socket();
  let resolved = false;

  socket.setTimeout(timeoutMs);

  const cleanup = () => {
    socket.removeAllListeners();
    socket.destroy();
  };

  socket.on('connect', () => {
    if (resolved) return;
    resolved = true;
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    cleanup();
    res.json({
      target: cleanTarget,
      port: testPort,
      success: true,
      latencyMs: Math.round(durationMs * 10) / 10,
      protocol: 'TCP Handshake'
    });
  });

  socket.on('timeout', () => {
    if (resolved) return;
    resolved = true;
    cleanup();
    res.json({
      target: cleanTarget,
      port: testPort,
      success: false,
      error: 'Tempo limite esgotado (Timeout > ' + timeoutMs + 'ms)'
    });
  });

  socket.on('error', (err: Error) => {
    if (resolved) return;
    resolved = true;
    cleanup();
    // In some cases connection is actively refused, but the round-trip still succeeded!
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    if (err.message.includes('ECONNREFUSED')) {
      res.json({
        target: cleanTarget,
        port: testPort,
        success: true,
        latencyMs: Math.round(durationMs * 10) / 10,
        protocol: 'TCP RST/ACK (Host Ativo)',
        note: 'Porta fechada, mas host respondeu ao pacote'
      });
    } else {
      res.json({
        target: cleanTarget,
        port: testPort,
        success: false,
        error: err.message
      });
    }
  });

  try {
    socket.connect(testPort, cleanTarget);
  } catch (err: any) {
    if (!resolved) {
      resolved = true;
      cleanup();
      res.status(500).json({ error: err.message || 'Falha ao conectar' });
    }
  }
});

// 4. Verify admin password
app.post('/api/verify-admin', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ valid: false, error: 'Senha não informada' });
  }

  const isValid = password.trim() === adminPassword.trim();
  res.json({ valid: isValid });
});

// 5. Change admin password (requires current password)
app.post('/api/change-password', (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (currentPassword !== adminPassword) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  if (!newPassword || newPassword.length < 3) {
    return res.status(400).json({ error: 'Nova senha deve ter pelo menos 3 caracteres' });
  }

  adminPassword = newPassword;
  persistConfig();
  res.json({ success: true, message: 'Senha atualizada com sucesso' });
});

// 6. Save or update a session with Name and Latency
app.post('/api/sessions', async (req: Request, res: Response) => {
  const {
    name,
    ip: providedIp,
    latency = 0,
    jitter = 0,
    minLatency = 0,
    maxLatency = 0,
    packetLoss = 0,
    notes,
    userAgent
  } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'O nome é obrigatório antes de salvar' });
  }

  const cleanName = name.trim();
  const detectedIp = extractClientIp(req);
  const finalIp = (providedIp && typeof providedIp === 'string' && providedIp.trim().length > 0)
    ? normalizeIp(providedIp.trim())
    : detectedIp;

  const geo = await getGeoForIp(finalIp);
  const now = Date.now();

  // Check if session for this name already exists
  const existingIndex = sessions.findIndex(
    s => s.name.toLowerCase() === cleanName.toLowerCase()
  );

  let session: PingSession;

  if (existingIndex >= 0) {
    const existing = sessions[existingIndex];
    const newHistory = [...(existing.history || []), { timestamp: now, latency: Math.round(latency * 10) / 10 }];
    // Keep max 20 samples in history
    if (newHistory.length > 20) newHistory.shift();

    session = {
      ...existing,
      name: cleanName,
      ip: finalIp,
      isIpv6: finalIp.includes(':'),
      isPrivate: isPrivateIp(finalIp),
      latency: Math.round(latency * 10) / 10,
      jitter: Math.round(jitter * 10) / 10,
      minLatency: minLatency > 0 ? Math.round(minLatency * 10) / 10 : Math.round(latency * 10) / 10,
      maxLatency: maxLatency > 0 ? Math.round(maxLatency * 10) / 10 : Math.round(latency * 10) / 10,
      packetLoss: Math.round(packetLoss),
      city: geo.city || existing.city,
      region: geo.region || existing.region,
      country: geo.country || existing.country,
      countryCode: geo.countryCode || existing.countryCode,
      isp: geo.isp || existing.isp,
      userAgent: userAgent || req.headers['user-agent'] || existing.userAgent,
      lastSeen: now,
      history: newHistory,
      notes: notes !== undefined ? notes : existing.notes
    };
    sessions[existingIndex] = session;
  } else {
    session = {
      id: 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: cleanName,
      ip: finalIp,
      isIpv6: finalIp.includes(':'),
      isPrivate: isPrivateIp(finalIp),
      latency: Math.round(latency * 10) / 10,
      jitter: Math.round(jitter * 10) / 10,
      minLatency: Math.round((minLatency || latency) * 10) / 10,
      maxLatency: Math.round((maxLatency || latency) * 10) / 10,
      packetLoss: Math.round(packetLoss || 0),
      city: geo.city,
      region: geo.region,
      country: geo.country,
      countryCode: geo.countryCode,
      isp: geo.isp,
      userAgent: userAgent || req.headers['user-agent'],
      timestamp: now,
      lastSeen: now,
      history: [{ timestamp: now, latency: Math.round(latency * 10) / 10 }],
      notes: notes || ''
    };
    sessions.unshift(session);
  }

  persistSessions();
  res.json({ success: true, session });
});

// 7. Get all sessions (requires admin password check)
app.get('/api/sessions', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-admin-password'];
  const queryPwd = req.query.password;

  let provided = '';
  if (typeof customHeader === 'string') {
    provided = customHeader;
  } else if (typeof queryPwd === 'string') {
    provided = queryPwd;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    provided = authHeader.substring(7);
  }

  if (provided !== adminPassword) {
    return res.status(401).json({
      error: 'Acesso negado. Senha de administrador inválida.',
      requireAuth: true
    });
  }

  res.json({ sessions, total: sessions.length });
});

// 8. Delete a session (requires admin)
app.delete('/api/sessions/:id', (req: Request, res: Response) => {
  const customHeader = req.headers['x-admin-password'] || req.headers['authorization']?.replace('Bearer ', '');
  if (customHeader !== adminPassword) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { id } = req.params;
  const initialLength = sessions.length;
  sessions = sessions.filter(s => s.id !== id);

  if (sessions.length === initialLength) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }

  persistSessions();
  res.json({ success: true, message: 'Registro removido com sucesso' });
});

// 9. Update a session (e.g. rename or notes)
app.patch('/api/sessions/:id', (req: Request, res: Response) => {
  const customHeader = req.headers['x-admin-password'] || req.headers['authorization']?.replace('Bearer ', '');
  if (customHeader !== adminPassword) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { id } = req.params;
  const { name, notes, ip } = req.body;

  const session = sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Registro não encontrado' });
  }

  if (name && typeof name === 'string') session.name = name.trim();
  if (notes !== undefined) session.notes = notes;
  if (ip && typeof ip === 'string') session.ip = ip.trim();

  persistSessions();
  res.json({ success: true, session });
});

// Mount Vite in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
