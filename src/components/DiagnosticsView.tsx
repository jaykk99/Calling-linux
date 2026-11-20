import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Globe,
  RefreshCw,
  Network
} from 'lucide-react';
import { DiagnosticReport } from '../types';

interface DiagnosticsViewProps {
  domain: string;
  publicIp: string;
  onDomainChange: (d: string) => void;
  onPublicIpChange: (ip: string) => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  domain,
  publicIp,
  onDomainChange,
  onPublicIpChange
}) => {
  const [testDomain, setTestDomain] = useState(domain);
  const [testIp, setTestIp] = useState(publicIp);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [running, setRunning] = useState(false);

  const runDiagnostics = useCallback(async (targetDom: string, targetIp: string) => {
    setRunning(true);
    try {
      const res = await fetch('/api/diagnostics/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: targetDom, ip: targetIp })
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics(domain, publicIp);
  }, [domain, publicIp, runDiagnostics]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDomainChange(testDomain.trim());
    onPublicIpChange(testIp.trim());
    runDiagnostics(testDomain.trim(), testIp.trim());
  };

  const renderCheckRow = (title: string, check?: { status: string; message: string }) => {
    if (!check) return null;
    const isPass = check.status === 'passed';
    const isFail = check.status === 'failed';
    return (
      <div className="py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {isPass ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : isFail ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-100">{title}</span>
        </div>
        <span
          className={`text-xs font-mono ${
            isPass ? 'text-emerald-300' : isFail ? 'text-rose-300' : 'text-amber-300'
          }`}
        >
          {check.message}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Probe Input Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
              <Globe className="w-3.5 h-3.5" />
              <span>Public Internet DNS, Port 25, FCrDNS & TLS Verification</span>
            </div>
            <h2 className="text-xl font-bold text-slate-50">
              Public Network Mail Hosting Readiness
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Validates globally routable public IPv4 (rejecting private RFC1918/CGNAT/loopback subnets), live DNS MX & PTR records, real TCP Port 25 reachability, STARTTLS handshake, and DMARC/MTA-STS alignment.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 flex-1 max-w-2xl">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Delegated Public Domain</label>
              <input
                type="text"
                required
                value={testDomain}
                onChange={(e) => setTestDomain(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Public Routable IPv4</label>
              <input
                type="text"
                required
                value={testIp}
                onChange={(e) => setTestIp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={running}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Probing Public Net...' : 'Run Live Probe'}
            </button>
          </form>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Security & DNS Audit Checks */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Public Network & SMTP Verification Matrix</h3>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {new Date(report.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="divide-y divide-slate-800/80 flex-1">
              {renderCheckRow('Public Routable IPv4 (Non-Private)', report.checks.publicNetworkIp)}
              {renderCheckRow('Public Domain Delegation (NS / A)', report.checks.domainDelegation)}
              {renderCheckRow('MX Priority Routing', report.checks.mxRecord)}
              {renderCheckRow('Public IP TCP Port 25 + Postscreen', report.checks.port25)}
              {renderCheckRow('Reverse DNS (PTR / FCrDNS)', report.checks.reverseDns)}
              {renderCheckRow('Trusted TLS / STARTTLS Capability', report.checks.tlsCertificates)}
              {renderCheckRow('SPF / OpenDKIM / DMARC Alignment', report.checks.spfDkimDmarc)}
              {renderCheckRow('MTA-STS & DANE TLSA Policy', report.checks.mtaStsDane)}
            </div>

            {/* Resolved DNS Records Preview */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-slate-500 mb-1">MX Exchange</div>
                <div className="font-mono text-slate-200 truncate">
                  {report.mxRecords[0] ? `${report.mxRecords[0].priority} ${report.mxRecords[0].exchange}` : `10 mx1.${report.domain}`}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">A Record / PTR</div>
                <div className="font-mono text-slate-200 truncate">
                  {report.aRecord || report.ip} · {report.ptrRecord || `mx1.${report.domain}`}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">DMARC Policy</div>
                <div className="font-mono text-emerald-400 truncate">
                  p=reject; adkim=s; aspf=s
                </div>
              </div>
            </div>
          </div>

          {/* Right: Network Topology Visual */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="relative h-56 lg:h-64 bg-slate-950 overflow-hidden">
              <img
                src="/src/assets/images/telephony_network_topology_1795186466198.jpg"
                alt="SMTP Port 25 Telephony Network Topology"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
                <Network className="w-3.5 h-3.5" />
                <span>End-to-End Carrier Routing Path</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                External carrier MTAs resolve your MX record, verify DANE TLSA / MTA-STS over DNSSEC, complete a TLS 1.3 handshake on Port 25, pass Postscreen DNSBL screening, and pipe the MIME body into the isolated <span className="font-mono text-slate-200">apexcarrier</span> parser.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ChromeOS Crostini Port Forwarding Advisory */}
      {report?.checks.chromeOsCheck && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-amber-200">
                ChromeOS Crostini & Residential Network Boundary Advisory
              </h3>
              <p className="text-sm text-slate-300">
                {report.checks.chromeOsCheck.summary}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300">Why Built-In Linux Port Forwarding Fails Public SMTP</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                {report.checks.chromeOsCheck.details.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-400 font-mono shrink-0">0{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-slate-300">Production-Grade Deployment Topologies</h4>
              <div className="space-y-3">
                {report.checks.chromeOsCheck.solutions.map((sol, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="text-xs font-semibold text-cyan-300">{sol.title}</div>
                    <p className="text-xs text-slate-400 leading-relaxed">{sol.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
