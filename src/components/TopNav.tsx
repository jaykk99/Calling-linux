import React from 'react';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSimulateModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSimulateModal
}) => {
  const navItems = [
    { id: 'fleet', label: 'Numbers Fleet' },
    { id: 'console', label: 'Voice & SMS' },
    { id: 'audit', label: 'Linux Audit' },
    { id: 'diagnostics', label: 'Port 25 & Net' },
    { id: 'deployment', label: 'Deployment' }
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div 
        onClick={() => setActiveTab('fleet')}
        className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 cursor-pointer hover:text-cyan-400 transition-colors"
      >
        Linux Carrier 1000
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 relative py-1 ${
                isActive ? 'text-cyan-400 font-semibold' : ''
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenSimulateModal}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-cyan-900/30"
        >
          Simulate Inbound SMS
        </button>
      </div>
    </header>
  );
};
