import React, { useState } from 'react';
import { TopNav } from './components/TopNav';
import { NumbersFleetView } from './components/NumbersFleetView';
import { LiveConsoleView } from './components/LiveConsoleView';
import { LinuxAuditView } from './components/LinuxAuditView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { DeploymentView } from './components/DeploymentView';
import { SimulateInboundModal } from './components/SimulateInboundModal';
import { VirtualNumber } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('fleet');
  const [domain, setDomain] = useState<string>('sms.customlinux.org');
  const [publicIp, setPublicIp] = useState<string>('198.51.100.45');

  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  const [preselectedSimNumber, setPreselectedSimNumber] = useState<VirtualNumber | null>(null);
  const [composeNumber, setComposeNumber] = useState<VirtualNumber | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleQuickCompose = (num: VirtualNumber) => {
    setComposeNumber(num);
    setActiveTab('console');
  };

  const handleQuickSimulate = (num: VirtualNumber) => {
    setPreselectedSimNumber(num);
    setSimulateModalOpen(true);
  };

  const handleSimulationSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulateModal={() => {
          setPreselectedSimNumber(null);
          setSimulateModalOpen(true);
        }}
      />

      {/* Mobile Nav Strip */}
      <div className="md:hidden border-b border-slate-800 bg-slate-900/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'fleet', label: 'Fleet' },
          { id: 'console', label: 'Voice & SMS' },
          { id: 'audit', label: 'Linux Audit' },
          { id: 'diagnostics', label: 'Port 25' },
          { id: 'deployment', label: 'Deployment' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === item.id
                ? 'bg-slate-800 text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'fleet' && (
          <NumbersFleetView
            domain={domain}
            onDomainChange={setDomain}
            onQuickCompose={handleQuickCompose}
            onQuickSimulate={handleQuickSimulate}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'console' && (
          <LiveConsoleView
            domain={domain}
            initialComposeNumber={composeNumber}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'audit' && <LinuxAuditView />}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView
            domain={domain}
            publicIp={publicIp}
            onDomainChange={setDomain}
            onPublicIpChange={setPublicIp}
          />
        )}

        {activeTab === 'deployment' && (
          <DeploymentView
            domain={domain}
            publicIp={publicIp}
            onDomainChange={setDomain}
            onPublicIpChange={setPublicIp}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 py-5 px-6 text-xs text-slate-500">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Linux Carrier 1000 · Real Port 25 SMTP &amp; Asterisk PJSIP Gateway</span>
          <span className="font-mono text-slate-500">
            {domain} · {publicIp}
          </span>
        </div>
      </footer>

      <SimulateInboundModal
        isOpen={simulateModalOpen}
        onClose={() => setSimulateModalOpen(false)}
        preselectedNumber={preselectedSimNumber}
        domain={domain}
        onSuccess={handleSimulationSuccess}
      />
    </div>
  );
}
