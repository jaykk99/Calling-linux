import React, { useCallback, useEffect, useState } from 'react';

interface AgentMailStatus {
  live: boolean;
  url?: string;
  domain?: string | null;
  addresses?: number | null;
  accounts?: number | null;
  storage?: string | null;
  signup?: string | null;
  outbound?: string | null;
  outboundConfigured?: boolean;
  deadLetters?: number | null;
  error?: string;
}

export const AgentMailPanel: React.FC = () => {
  const [status, setStatus] = useState<AgentMailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent-mail/status');
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load agent mail status');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Agent Mail</h2>
          <p className="text-sm text-slate-400 mt-1">
            Live status of the agent-mail-service on this box. Counts come from
            its real /health endpoint; when it is down this panel says so
            instead of showing numbers.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
          Checking the mail service…
        </div>
      )}

      {!loading && error && (
        <div className="border border-red-900/60 bg-red-950/30 rounded-xl p-6">
          <p className="text-sm font-semibold text-red-300">Could not load agent mail status</p>
          <p className="text-xs text-red-200/70 mt-1 font-mono">{error}</p>
        </div>
      )}

      {!loading && !error && status && !status.live && (
        <div className="border border-amber-900/60 bg-amber-950/30 rounded-xl p-6">
          <p className="text-sm font-semibold text-amber-300">Agent mail is not live</p>
          <p className="text-xs text-amber-200/70 mt-1">
            {status.error || 'Mail API unreachable'} ({status.url || 'http://127.0.0.1:3000'}).
            Start it with <span className="font-mono">bash start-all.sh</span> in
            agent-mail-service, or set AGENT_MAIL_URL to where it runs.
          </p>
        </div>
      )}

      {!loading && !error && status && status.live && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Domain', value: status.domain ?? '—' },
            { label: 'Addresses', value: status.addresses ?? '—' },
            { label: 'Accounts', value: status.accounts ?? '—' },
            { label: 'Storage', value: status.storage ?? '—' },
            { label: 'Signup', value: status.signup ?? '—' },
            { label: 'Outbound', value: status.outbound ?? '—' },
            { label: 'Outbound configured', value: status.outboundConfigured ? 'Yes' : 'No' },
            { label: 'Dead letters', value: status.deadLetters ?? '—' }
          ].map((stat) => (
            <div key={stat.label} className="border border-slate-800 rounded-xl p-4 bg-slate-900/50">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-lg font-semibold text-slate-100 mt-1 break-words">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && status && status.live && (
        <p className="text-xs text-slate-500">
          Mail API: <span className="font-mono">{status.url}</span> · live, counts read
          from its /health endpoint just now.
        </p>
      )}
    </div>
  );
};
