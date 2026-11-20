import React, { useState } from 'react';
import { Search, Send, Globe2 } from 'lucide-react';
import { GLOBAL_CARRIERS } from '../data/carriers';

interface CarriersViewProps {
  onTestCarrier: (smsGateway: string) => void;
}

export const CarriersView: React.FC<CarriersViewProps> = ({ onTestCarrier }) => {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');

  const countries = ['All', 'United States', 'Canada', 'United Kingdom', 'Global / Linux'];

  const filtered = GLOBAL_CARRIERS.filter((c) => {
    const matchesCountry = countryFilter === 'All' || c.country === countryFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.carrier.toLowerCase().includes(q) ||
      c.smsGateway.toLowerCase().includes(q) ||
      c.mmsGateway.toLowerCase().includes(q);
    return matchesCountry && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
            <Globe2 className="w-3.5 h-3.5" />
            <span>Global Carrier SMTP-to-SMS Matrix</span>
          </div>
          <h2 className="text-xl font-bold text-slate-50">
            Verified Carrier Email-to-SMS Gateways
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Direct carrier SMTP relays accept messages from your hardened Linux Port 25 / OpenDKIM host when PTR reverse DNS, SPF, and DMARC records are properly aligned.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search carrier or domain..."
              className="pl-9 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit overflow-x-auto max-w-full">
        {countries.map((country) => (
          <button
            key={country}
            onClick={() => setCountryFilter(country)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              countryFilter === country
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {country}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400">
                <th className="py-3 px-4">Carrier Network</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">SMS Gateway Domain</th>
                <th className="py-3 px-4">MMS Gateway Domain</th>
                <th className="py-3 px-4 text-right">Limit</th>
                <th className="py-3 px-4">Routing & Security Notes</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filtered.map((c) => (
                <tr key={`${c.carrier}-${c.smsGateway}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-100 whitespace-nowrap">{c.carrier}</td>
                  <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">{c.country}</td>
                  <td className="py-3 px-4 font-mono text-xs text-cyan-400 whitespace-nowrap">
                    number@{c.smsGateway}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                    number@{c.mmsGateway}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-300">
                    {c.charLimit}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400 max-w-xs">{c.notes}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onTestCarrier(c.smsGateway)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Test Route
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
