import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Edit3,
  Send,
  Copy,
  Check,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { VirtualNumber } from '../types';

interface FleetStats {
  total: number;
  active: number;
  reserved: number;
  idle: number;
  totalReceived: number;
  totalSent: number;
  totalCalls: number;
}

interface NumbersFleetViewProps {
  domain: string;
  onDomainChange: (newDomain: string) => void;
  onQuickCompose: (num: VirtualNumber) => void;
  onQuickSimulate: (num: VirtualNumber) => void;
  refreshTrigger: number;
}

export const NumbersFleetView: React.FC<NumbersFleetViewProps> = ({
  domain,
  onDomainChange,
  onQuickCompose,
  onQuickSimulate,
  refreshTrigger
}) => {
  const [numbers, setNumbers] = useState<VirtualNumber[]>([]);
  const [stats, setStats] = useState<FleetStats>({
    total: 1000,
    active: 900,
    reserved: 50,
    idle: 50,
    totalReceived: 0,
    totalSent: 0,
    totalCalls: 0
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(20);
  const [totalFiltered, setTotalFiltered] = useState(1000);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Batch Provision Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDomain, setBatchDomain] = useState(domain);
  const [batchPrefix, setBatchPrefix] = useState('+1201555');
  const [batchCount, setBatchCount] = useState(1000);
  const [batchLoading, setBatchLoading] = useState(false);

  // Edit Single Number Modal
  const [editingNumber, setEditingNumber] = useState<VirtualNumber | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editStatus, setEditStatus] = useState<VirtualNumber['status']>('active');
  const [editRoutingMode, setEditRoutingMode] = useState<VirtualNumber['routingMode']>('self-hosted');
  const [editWebhook, setEditWebhook] = useState('');
  const [editVoiceEnabled, setEditVoiceEnabled] = useState(true);
  const [editSmsEnabled, setEditSmsEnabled] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        status: statusFilter,
        search: debouncedSearch
      });
      const res = await fetch(`/api/numbers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load numbers');
      const data = await res.json();
      setNumbers(data.numbers);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalFiltered(data.pagination.total || 0);
    } catch (err) {
      console.error('Error loading numbers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers, refreshTrigger]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const openEditDrawer = (num: VirtualNumber) => {
    setEditingNumber(num);
    setEditLabel(num.label);
    setEditStatus(num.status);
    setEditRoutingMode(num.routingMode || 'self-hosted');
    setEditWebhook(num.webhookUrl);
    setEditVoiceEnabled(num.voiceEnabled);
    setEditSmsEnabled(num.smsEnabled);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNumber) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/numbers/${editingNumber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editLabel,
          status: editStatus,
          routingMode: editRoutingMode,
          webhookUrl: editWebhook,
          voiceEnabled: editVoiceEnabled,
          smsEnabled: editSmsEnabled
        })
      });
      if (res.ok) {
        setEditingNumber(null);
        fetchNumbers();
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchLoading(true);
    try {
      const res = await fetch('/api/numbers/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: batchDomain.trim() || 'sms.customlinux.org',
          prefix: batchPrefix.trim() || '+1201555',
          count: batchCount
        })
      });
      if (res.ok) {
        onDomainChange(batchDomain.trim() || 'sms.customlinux.org');
        setShowBatchModal(false);
        setPage(1);
        fetchNumbers();
      }
    } finally {
      setBatchLoading(false);
    }
  };

  const renderStatusText = (status: VirtualNumber['status']) => {
    switch (status) {
      case 'active':
        return <span className="text-emerald-400 font-medium">Active</span>;
      case 'reserved':
        return <span className="text-amber-400 font-medium">Reserved</span>;
      case 'forwarding':
        return <span className="text-cyan-400 font-medium">Forwarding</span>;
      default:
        return <span className="text-slate-400">Idle</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Architecture Overview Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>100% Self-Hosted Linux Telephony &amp; SMTP Switch (No External Carrier)</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono text-slate-300">{domain}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 max-w-2xl" style={{ textWrap: 'balance' }}>
              1,000 Working Numbers for Calling &amp; SMS
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Every DID in this 1,000-line pool operates independently on your Linux host: direct Postfix/RFC 5321 SMTP for SMS, embedded SIP UDP registrar (<span className="font-mono text-slate-200">sip:1201555xxxx@{domain}</span>), and live browser WebRTC audio calling with zero third-party carrier dependencies.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Provisioned DIDs</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-50 mt-0.5">
                {stats.total.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Active Calling &amp; SMS</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {stats.active.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">SMS Rx / Tx</div>
              <div className="text-xl font-bold font-mono tabular-nums text-cyan-400 mt-0.5">
                {stats.totalReceived.toLocaleString()} / {stats.totalSent.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Self-Hosted Calls</div>
              <div className="text-xl font-bold font-mono tabular-nums text-slate-200 mt-0.5">
                {(stats.totalCalls || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="relative h-40 lg:h-44 w-full bg-slate-950 overflow-hidden">
            <img
              src="/src/assets/images/linux_mail_server_rack_1795186465577.jpg"
              alt="Linux SMTP Gateway Server Rack"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
              <span className="font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Carrier Self-Hosted Stack
              </span>
              <span className="font-mono text-slate-300">SMTP + SIP</span>
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Re-delegate all 1,000 numbers to your domain or export Postfix SMTP maps and 1,000 self-hosted Asterisk PJSIP endpoints.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowBatchModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Re-Provision
              </button>
              <a
                href={`/api/export/postfix-virtual?domain=${encodeURIComponent(domain)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Postfix Map
              </a>
              <a
                href={`/api/export/asterisk-pjsip?domain=${encodeURIComponent(domain)}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                PJSIP 1K
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number, extension (0001–1000), SIP URI, email, or label..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(['all', 'active', 'reserved', 'idle'] as const).map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => {
                  setStatusFilter(statusKey);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 ${
                  statusFilter === statusKey
                    ? 'bg-slate-800 text-slate-50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {statusKey}
              </button>
            ))}
          </div>

          <button
            onClick={fetchNumbers}
            title="Refresh Fleet"
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* High-Density 1,000 Numbers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4 w-20">Ext</th>
                <th className="py-3 px-4">Virtual Number</th>
                <th className="py-3 px-4">SMTP Address</th>
                <th className="py-3 px-4">SIP URI</th>
                <th className="py-3 px-4">Routing Mode</th>
                <th className="py-3 px-4">Label</th>
                <th className="py-3 px-4 text-right">Last OTP</th>
                <th className="py-3 px-4 text-right">Rx / Tx / Calls</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {loading && numbers.length === 0 ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4"><div className="h-4 w-10 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-32 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-44 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-44 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-28 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-14 bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-16 bg-slate-800 rounded ml-auto" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-14 bg-slate-800 rounded" /></td>
                    <td className="py-3 px-4"><div className="h-4 w-20 bg-slate-800 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : numbers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-300">No virtual numbers match your query</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing your search or switching the status filter.</p>
                  </td>
                </tr>
              ) : (
                numbers.map((num) => (
                  <tr key={num.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-400">
                      #{num.extension.toString().padStart(4, '0')}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-medium text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{num.phoneNumber}</span>
                        {num.sipRegistered && (
                          <span className="text-[10px] font-sans font-semibold text-emerald-400">Online</span>
                        )}
                        <button
                          onClick={() => handleCopy(num.e164, num.id)}
                          title="Copy E.164"
                          className="text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          {copiedId === num.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {num.assignedEmail}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-cyan-300/90 whitespace-nowrap">
                      {num.sipUri}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {num.routingMode}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-300 max-w-[180px] truncate">
                      {num.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                      {num.lastOtp ? (
                        <button
                          onClick={() => handleCopy(num.lastOtp!, `${num.id}-otp`)}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold"
                          title="Copy OTP"
                        >
                          {copiedId === `${num.id}-otp` ? 'Copied' : num.lastOtp}
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-300 whitespace-nowrap">
                      {num.totalReceived} / {num.totalSent} / {num.totalCalls || 0}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      {renderStatusText(num.status)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onQuickSimulate(num)}
                          className="px-2 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                          title="Deliver direct SMTP test SMS to this line"
                        >
                          Test Rx
                        </button>
                        <button
                          onClick={() => onQuickCompose(num)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                          title="Open Voice & SMS Console with this DID"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditDrawer(num)}
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                          title="Configure DID"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="font-mono tabular-nums">
            Showing {(page - 1) * 50 + (numbers.length > 0 ? 1 : 0)}–{(page - 1) * 50 + numbers.length} of {totalFiltered.toLocaleString()} numbers
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="font-mono tabular-nums px-2 text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit DID Modal */}
      {editingNumber && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Configure Self-Hosted DID</h3>
                <p className="text-xs font-mono text-cyan-400 mt-0.5">{editingNumber.phoneNumber}</p>
              </div>
              <button
                onClick={() => setEditingNumber(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Assignment Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Line Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as VirtualNumber['status'])}
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="active">Active</option>
                    <option value="reserved">Reserved</option>
                    <option value="forwarding">Forwarding</option>
                    <option value="idle">Idle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Routing Mode</label>
                  <select
                    value={editRoutingMode}
                    onChange={(e) => setEditRoutingMode(e.target.value as VirtualNumber['routingMode'])}
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="self-hosted">self-hosted</option>
                    <option value="federated-sip">federated-sip</option>
                    <option value="webhook">webhook</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={editVoiceEnabled}
                    onChange={(e) => setEditVoiceEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-400"
                  />
                  <span>SIP / WebRTC Voice</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <input
                    type="checkbox"
                    checked={editSmsEnabled}
                    onChange={(e) => setEditSmsEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-400"
                  />
                  <span>SMTP Port 25 SMS</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Public HTTPS Webhook Relay (Optional)</label>
                <input
                  type="url"
                  value={editWebhook}
                  onChange={(e) => setEditWebhook(e.target.value)}
                  placeholder={`https://gateway.${domain}/api/webhooks/inbound-sms`}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNumber(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Re-Provision Pool Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">Re-Provision 1,000-Number Pool</h3>
                <p className="text-xs text-slate-400 mt-0.5">Assign your publicly delegated domain and area code prefix</p>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Delegated Public Domain</label>
                <input
                  type="text"
                  required
                  value={batchDomain}
                  onChange={(e) => setBatchDomain(e.target.value)}
                  placeholder="sms.yourdomain.com"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">E.164 Base Prefix (7 digits)</label>
                  <input
                    type="text"
                    required
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="+1201555"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Pool Size (Max 1000)</label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={batchCount}
                    onChange={(e) => setBatchCount(parseInt(e.target.value) || 1000)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50"
                >
                  {batchLoading ? 'Provisioning...' : 'Provision Numbers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
