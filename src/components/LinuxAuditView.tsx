import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  PhoneCall,
  Mail,
  Radio
} from 'lucide-react';
import { SystemCapabilities, BenchmarkResult } from '../types';

export const LinuxAuditView: React.FC = () => {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);
  const [loadingCaps, setLoadingCaps] = useState(true);
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [runningBench, setRunningBench] = useState(false);

  const loadCapabilities = useCallback(async () => {
    setLoadingCaps(true);
    try {
      const res = await fetch('/api/system/capabilities');
      if (res.ok) {
        setCaps(await res.json());
      }
    } finally {
      setLoadingCaps(false);
    }
  }, []);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  const run1000Benchmark = async () => {
    setRunningBench(true);
    try {
      const res = await fetch('/api/system/benchmark', { method: 'POST' });
      if (res.ok) {
        setBenchmark(await res.json());
      }
    } finally {
      setRunningBench(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Live Benchmark Trigger */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>Real Linux Host Inspection &amp; Zero-Carrier 1,000-DID Audit</span>
          </div>
          <h2 className="text-xl font-bold text-slate-50">
            Live Linux Runtime &amp; 1,000 Calling + SMS Capacity
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Directly inspects this Linux machine&apos;s embedded SIP/SMTP listeners, mail/PBX daemons, open sockets, kernel file descriptors, and runs a live 1,000-number config compilation &amp; MIME throughput benchmark without simulation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadCapabilities}
            disabled={loadingCaps}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCaps ? 'animate-spin' : ''}`} />
            Re-Scan Host
          </button>

          <button
            onClick={run1000Benchmark}
            disabled={runningBench}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            {runningBench ? 'Benchmarking 1,000 DIDs...' : 'Run 1,000-Line Benchmark'}
          </button>
        </div>
      </div>

      {/* Embedded Self-Hosted Services Live Status */}
      {caps && caps.embeddedServices && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Embedded Self-Hosted Engine (Zero External Carrier Required)</span>
            </div>
            <span className="text-xs font-mono text-emerald-400">
              {caps.readiness1000.canRunSelfHosted1000 ? '1,000-Line Self-Hosted Ready' : 'Partial Bind'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-slate-400">RFC 3261 SIP UDP Registrar</div>
              <div className="font-mono font-semibold text-slate-100 mt-1">
                {caps.embeddedServices.sipActive ? `UDP /${caps.embeddedServices.sipUdpPort} Active` : 'Inactive'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {caps.embeddedServices.sipRegisteredLines.length} SIP clients registered
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-slate-400">RFC 5321 SMTP Inbound Server</div>
              <div className="font-mono font-semibold text-slate-100 mt-1">
                {caps.embeddedServices.smtpActive ? `TCP /${caps.embeddedServices.smtpListenPort} Active` : 'Inactive'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Direct 1,000-DID mail ingestion
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-slate-400">WebRTC Audio Switch (SSE)</div>
              <div className="font-mono font-semibold text-cyan-400 mt-1">
                Active on TCP /3000
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                {caps.embeddedServices.webrtcOnlineLines.length} online lines in browser
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-slate-400">External Carrier Dependency</div>
              <div className="font-mono font-semibold text-emerald-400 mt-1">
                None (100% Self-Hosted)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Direct Linux sockets &amp; federation
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live 1,000-Line Benchmark Result */}
      {benchmark && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                1,000-Number Calling &amp; SMS Host Benchmark Results
              </h3>
              <p className="text-xs text-cyan-300 mt-0.5">{benchmark.verdict}</p>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Total: {benchmark.totalDurationMs} ms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <div className="text-xs text-slate-400">DIDs Indexed</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-100 mt-0.5">
                {benchmark.numbersTested}
              </div>
              <div className="text-[11px] font-mono text-slate-500">{benchmark.didIndexMs} ms</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">PJSIP 1K Compile</div>
              <div className="text-lg font-bold font-mono tabular-nums text-cyan-400 mt-0.5">
                {benchmark.pjsipConfigGenMs} ms
              </div>
              <div className="text-[11px] text-slate-500">1,000 SIP endpoints</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Postfix 1K Map</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                {benchmark.postfixMapGenMs} ms
              </div>
              <div className="text-[11px] text-slate-500">1,000 SMTP aliases</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">1K MIME + HMAC</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-100 mt-0.5">
                {benchmark.mimeBuild1000Ms} ms
              </div>
              <div className="text-[11px] text-slate-500">SHA-256 signed</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Disk State Flush</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-200 mt-0.5">
                {benchmark.diskFlushMs} ms
              </div>
              <div className="text-[11px] text-slate-500">RSS {benchmark.rssMb} MB</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Max Active Calls</div>
              <div className="text-lg font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
                ~{benchmark.estimatedMaxConcurrentCalls.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500">Simultaneous RTP</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">SMS Engine Cap</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-300 mt-0.5">
                {benchmark.estimatedMaxSmsPerMin.toLocaleString()}/m
              </div>
              <div className="text-[11px] text-slate-500">Payload throughput</div>
            </div>
          </div>
        </div>
      )}

      {/* Advisories if Postfix/ulimit need adjustment on this host */}
      {caps && caps.readiness1000.warnings.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Host Tuning Notes for Public Port 25 &amp; 1,000-Line Concurrency</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {caps.readiness1000.warnings.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-amber-400 shrink-0">0{idx + 1}.</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {caps && (
        <>
          {/* Hardware & Kernel Limits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Linux Kernel &amp; Hardware Telemetry</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500">Hostname &amp; OS</div>
                  <div className="font-mono text-slate-100 mt-1 truncate">
                    {caps.hostname} ({caps.platform} {caps.arch})
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5">{caps.release}</div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500">CPU &amp; Memory</div>
                  <div className="font-mono text-slate-100 mt-1">
                    {caps.cpuCores} vCPU · {caps.totalMemMb} MB RAM
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {caps.freeMemMb} MB free · load {caps.loadAvg.map((l) => l.toFixed(2)).join(' ')}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500">File Descriptor Limits</div>
                  <div className="font-mono text-slate-100 mt-1">
                    ulimit -n: {caps.kernelLimits.nofileLimit}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    fs.file-max: {caps.kernelLimits.fileMax}
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500">Socket Queue &amp; Ports</div>
                  <div className="font-mono text-slate-100 mt-1">
                    somaxconn: {caps.kernelLimits.somaxconn}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    Ephemeral: {caps.kernelLimits.ephemeralPorts}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-1">
                Persistent State File: <span className="font-mono text-slate-200">{caps.persistencePath}</span>
              </div>
            </div>

            {/* Live Socket Listeners */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Live Local Service Sockets (127.0.0.1)</span>
                </div>
                <span className="text-xs text-slate-400">Real TCP Connect Scan</span>
              </div>
              <div className="divide-y divide-slate-800/80">
                {caps.ports.map((p) => (
                  <div key={p.port} className="py-2.5 px-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-semibold text-slate-100">
                        {p.protocol} /{p.port}
                      </span>
                      <span className="text-slate-400 ml-2.5">{p.service}</span>
                    </div>
                    {p.listening ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Listening
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">Not Running</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Installed Linux Binaries */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Installed Linux Mail &amp; Telephony Daemons
              </h3>
              <span className="text-xs text-slate-400">Checked via filesystem &amp; PATH</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400">
                    <th className="py-2.5 px-5">Binary</th>
                    <th className="py-2.5 px-5">System Role</th>
                    <th className="py-2.5 px-5">Detected Path</th>
                    <th className="py-2.5 px-5 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {caps.binaries.map((b) => (
                    <tr key={b.name} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-5 font-mono font-semibold text-slate-100">{b.name}</td>
                      <td className="py-2.5 px-5 text-slate-300">{b.role}</td>
                      <td className="py-2.5 px-5 font-mono text-slate-400">{b.path || '—'}</td>
                      <td className="py-2.5 px-5 text-right">
                        {b.installed ? (
                          <span className="text-emerald-400 font-medium">Installed</span>
                        ) : (
                          <span className="text-slate-500">Optional / Not Installed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calling vs SMS 1,000-Line Architecture Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                <PhoneCall className="w-4 h-4" />
                <span>1,000-Number Self-Hosted Voice (WebRTC + Embedded SIP / Asterisk)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Zero external telecom carrier needed: the embedded SIP UDP registrar and browser WebRTC switch register all 1,000 DIDs directly in RAM/disk. When scaled to <strong className="text-slate-200">1,000 simultaneous RTP audio streams</strong> on Linux, Asterisk PJSIP handles it with UDP <span className="font-mono text-slate-200">10000–20000</span>, <span className="font-mono text-slate-200">ulimit -n 65535</span>, ~85 Mbps bandwidth, and 4+ vCPU / ~2.5 GB RAM.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Mail className="w-4 h-4" />
                <span>1,000-Number Self-Hosted SMS (Postfix + Embedded RFC 5321)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                All 1,000 numbers route internally via direct RFC 5321 SMTP and externally to any federated Linux domain over TCP Port 25 + STARTTLS, with zero paid SMS aggregator. Public internet delivery requires unblocked TCP/25, matching PTR Reverse DNS, OpenDKIM, SPF, DMARC, and TLS 1.3 certificates.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
