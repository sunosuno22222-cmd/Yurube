import React, { useState, useEffect } from 'react';
import { PingSession } from '../types';
import { maskIpAddress, getLatencyQuality } from '../utils/ping';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit2,
  Plus,
  Activity,
  Shield,
  Download,
  KeyRound,
  ExternalLink,
  Zap,
  Globe,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminPanelProps {
  adminPassword: string;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ adminPassword, onLogout }) => {
  const [sessions, setSessions] = useState<PingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [latencyFilter, setLatencyFilter] = useState<'all' | 'fast' | 'medium' | 'slow'>('all');

  // Privacy toggles
  const [globalMaskIp, setGlobalMaskIp] = useState(true);
  const [unmaskedIds, setUnmaskedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live pinging state
  const [probingId, setProbingId] = useState<string | null>(null);

  // Add person modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Inline edit name
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameVal, setEditNameVal] = useState('');

  // Password change modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPwdInput, setCurrentPwdInput] = useState('');
  const [newPwdInput, setNewPwdInput] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions', {
        headers: {
          'x-admin-password': adminPassword
        }
      });

      if (res.status === 401) {
        setError('Sessão expirada ou senha inválida.');
        onLogout();
        return;
      }

      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setError('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [adminPassword]);

  const toggleIpVisibility = (id: string) => {
    setUnmaskedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyIp = (id: string, ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSession = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o registro de "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword }
      });

      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      } else {
        alert('Falha ao excluir registro.');
      }
    } catch {
      alert('Erro de comunicação.');
    }
  };

  const handleProbeSession = async (session: PingSession) => {
    setProbingId(session.id);
    try {
      const res = await fetch('/api/probe-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: session.ip,
          port: 443,
          timeoutMs: 4000
        })
      });

      const data = await res.json();
      if (data.success && data.latencyMs !== undefined) {
        // Update session in local and server state
        const updatedLatency = data.latencyMs;
        setSessions(prev =>
          prev.map(s => {
            if (s.id === session.id) {
              return {
                ...s,
                latency: updatedLatency,
                lastSeen: Date.now(),
                history: [...(s.history || []), { timestamp: Date.now(), latency: updatedLatency }]
              };
            }
            return s;
          })
        );

        // Update on server
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: session.name,
            ip: session.ip,
            latency: updatedLatency,
            jitter: session.jitter
          })
        });
      } else {
        alert(`Não foi possível alcançar o host (${session.ip}): ${data.error || 'Porta fechada ou sem resposta ICMP/TCP'}`);
      }
    } catch {
      alert('Erro ao testar ping deste IP.');
    } finally {
      setProbingId(null);
    }
  };

  const handleSaveEditName = async (id: string) => {
    if (!editNameVal.trim()) return;

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ name: editNameVal.trim() })
      });

      if (res.ok) {
        setSessions(prev =>
          prev.map(s => (s.id === id ? { ...s, name: editNameVal.trim() } : s))
        );
        setEditingId(null);
      }
    } catch {
      alert('Falha ao atualizar nome.');
    }
  };

  const handleAddManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIp.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({
          name: newName.trim(),
          ip: newIp.trim(),
          latency: 20,
          jitter: 1,
          packetLoss: 0,
          notes: newNotes.trim()
        })
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewName('');
        setNewIp('');
        setNewNotes('');
        await fetchSessions();
      } else {
        alert('Falha ao cadastrar registro.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPwdInput,
          newPassword: newPwdInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPwdMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdMsg(null);
          setCurrentPwdInput('');
          setNewPwdInput('');
        }, 1500);
      } else {
        setPwdMsg({ type: 'error', text: data.error || 'Erro ao alterar senha.' });
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Falha de comunicação.' });
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) return;

    const headers = ['Nome', 'IP', 'Latencia_ms', 'Jitter_ms', 'Cidade', 'Pais', 'Provedor', 'Ultima_Verificacao'];
    const rows = sessions.map(s => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.ip}"`,
      s.latency,
      s.jitter,
      `"${s.city || ''}"`,
      `"${s.country || ''}"`,
      `"${s.isp || ''}"`,
      `"${new Date(s.lastSeen || s.timestamp).toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `netping_relatorio_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered sessions
  const filteredSessions = sessions.filter(session => {
    const matchesQuery =
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.ip.includes(searchQuery) ||
      (session.city && session.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (session.isp && session.isp.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;

    if (latencyFilter === 'fast') return session.latency <= 35;
    if (latencyFilter === 'medium') return session.latency > 35 && session.latency <= 80;
    if (latencyFilter === 'slow') return session.latency > 80;
    return true;
  });

  // Aggregate stats
  const totalCount = sessions.length;
  const avgLatency = totalCount > 0
    ? Math.round((sessions.reduce((acc, s) => acc + s.latency, 0) / totalCount) * 10) / 10
    : 0;
  const bestLatency = totalCount > 0
    ? Math.min(...sessions.map(s => s.latency))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
            <span>Olho do Diabo</span>
            <span>/</span>
            <span className="text-red-400">Painel Secreto (dog_satan)</span>
            <span>/</span>
            <span className="text-slate-300">Monitor de IPs por Nome</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Painel Olho do Diabo — Monitor de IPs & Latência</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setGlobalMaskIp(!globalMaskIp)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              globalMaskIp
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Mascarar todos os IPs para segurança em gravações de tela ou transmissões"
          >
            {globalMaskIp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{globalMaskIp ? 'IPs Mascarados (Seguro)' : 'IPs Visíveis'}</span>
          </button>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Mudar Senha</span>
          </button>

          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium block">Pessoas / Conexões Salvas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white tabular-nums">
              {totalCount}
            </span>
            <span className="text-xs text-slate-500">identificadas por nome</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium block">Latência Média da Rede</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tabular-nums">
              {avgLatency > 0 ? avgLatency.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium block">Melhor Latência Registrada</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-sky-400 tabular-nums">
              {bestLatency > 0 ? bestLatency.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-400 font-mono">ms</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium block">Modo de Segurança</span>
          <div className="mt-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {globalMaskIp ? 'IPs Protegidos' : 'Modo Auditoria'}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Add Person & Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, IP, cidade ou provedor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Segmented Filter */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setLatencyFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                latencyFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setLatencyFilter('fast')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                latencyFilter === 'fast' ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              &le; 35ms
            </button>
            <button
              onClick={() => setLatencyFilter('medium')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                latencyFilter === 'medium' ? 'bg-slate-800 text-sky-400 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              35-80ms
            </button>
            <button
              onClick={() => setLatencyFilter('slow')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                latencyFilter === 'slow' ? 'bg-slate-800 text-amber-400 font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              &gt; 80ms
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar IP Manualmente</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            title="Baixar lista em formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Main High-Density Data Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nome Registrado</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4 text-right">Latência (RTT)</th>
                <th className="py-3 px-4 text-right">Jitter & Perda</th>
                <th className="py-3 px-4">Localização & Provedor</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => {
                  const isSpecificUnmasked = unmaskedIds.has(session.id);
                  const shouldMask = globalMaskIp && !isSpecificUnmasked;
                  const displayIp = shouldMask ? maskIpAddress(session.ip) : session.ip;
                  const quality = getLatencyQuality(session.latency);
                  const isBeingProbed = probingId === session.id;

                  return (
                    <tr key={session.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name Column */}
                      <td className="py-3.5 px-4 font-medium text-white">
                        {editingId === session.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNameVal}
                              onChange={(e) => setEditNameVal(e.target.value)}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditName(session.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-slate-400 hover:text-slate-300"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-semibold text-white">{session.name}</span>
                            <button
                              onClick={() => {
                                setEditingId(session.id);
                                setEditNameVal(session.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                              title="Editar nome"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {session.notes && (
                          <span className="text-slate-500 text-xs block truncate max-w-xs">
                            {session.notes}
                          </span>
                        )}
                      </td>

                      {/* IP Column with reveal and copy */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200 tracking-wide select-all">
                            {displayIp}
                          </span>

                          <button
                            onClick={() => toggleIpVisibility(session.id)}
                            className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                            title={shouldMask ? 'Revelar IP completo' : 'Mascarar IP'}
                          >
                            {shouldMask ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>

                          <button
                            onClick={() => handleCopyIp(session.id, session.ip)}
                            className="text-slate-500 hover:text-emerald-400 p-1 rounded hover:bg-slate-800 transition-colors"
                            title="Copiar IP"
                          >
                            {copiedId === session.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Latency Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono font-bold tabular-nums text-sm text-white">
                            {session.latency.toFixed(1)} ms
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${quality.bg} ${quality.color}`}>
                            {quality.label}
                          </span>
                        </div>
                      </td>

                      {/* Jitter & Loss */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-400">
                        <span>± {session.jitter.toFixed(1)} ms</span>
                        <span className="text-slate-500 ml-1.5 text-xs">· {session.packetLoss}% perda</span>
                      </td>

                      {/* Location & ISP */}
                      <td className="py-3.5 px-4">
                        <div className="truncate max-w-[200px]">
                          <span className="text-slate-200 block truncate font-medium">
                            {session.city ? `${session.city}, ${session.country || ''}` : 'Localização Indefinida'}
                          </span>
                          <span className="text-slate-500 text-xs truncate block">
                            {session.isp || 'Provedor Local'}
                          </span>
                        </div>
                      </td>

                      {/* Last seen */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>
                            {new Date(session.lastSeen || session.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleProbeSession(session)}
                            disabled={isBeingProbed}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded transition-colors disabled:opacity-50"
                            title="Testar ping deste IP agora"
                          >
                            <Zap className={`w-3.5 h-3.5 ${isBeingProbed ? 'animate-bounce' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleDeleteSession(session.id, session.name)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-medium text-slate-400">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Peça para seus amigos ou visitantes colocarem o nome no testador para aparecerem aqui.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Adicionar Pessoa / IP Manualmente
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cadastre um nome e um endereço IP ou servidor para monitoramento contínuo.
            </p>

            <form onSubmit={handleAddManualSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nome da Pessoa ou Dispositivo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João (Escritório), Servidor Backup..."
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Endereço IP ou Host
                </label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Ex: 177.136.20.10 ou 1.1.1.1"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Conexão Fibra 500MB, Gateway SP..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  {isAdding ? 'Cadastrando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Alterar Senha do Painel
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Atualize a senha que protege a visualização dos IPs e do painel.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={currentPwdInput}
                  onChange={(e) => setCurrentPwdInput(e.target.value)}
                  required
                  placeholder="Digite a senha atual..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPwdInput}
                  onChange={(e) => setNewPwdInput(e.target.value)}
                  required
                  placeholder="Mínimo 3 caracteres..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {pwdMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    pwdMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {pwdMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{pwdMsg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
