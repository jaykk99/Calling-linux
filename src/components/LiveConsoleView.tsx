import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  FileCode2,
  X,
  PhoneCall,
  Mail,
  AlertTriangle,
  Globe2
} from 'lucide-react';
import { SmsMessage, CallRecord, VirtualNumber } from '../types';
import { GLOBAL_CARRIERS } from '../data/carriers';
import { CarriersView } from './CarriersView';

interface LiveConsoleViewProps {
  domain: string;
  initialComposeNumber?: VirtualNumber | null;
  initialGateway?: string | null;
  refreshTrigger: number;
}

export const LiveConsoleView: React.FC<LiveConsoleViewProps> = ({
  domain,
  initialComposeNumber,
  initialGateway,
  refreshTrigger
}) => {
  const [subView, setSubView] = useState<'sms' | 'voice' | 'carriers'>('sms');

  // SMS State
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loadingSms, setLoadingSms] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedMimeMsg, setSelectedMimeMsg] = useState<SmsMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [fromNumber, setFromNumber] = useState('+1 (201) 555-0001');
  const [toPhone, setToPhone] = useState('+1 (650) 555-0199');
  const [carrierGateway, setCarrierGateway] = useState('vtext.com');
  const [messageText, setMessageText] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResultBanner, setSmsResultBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Voice Calling State (Asterisk AMI)
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [callFrom, setCallFrom] = useState('+12015550001');
  const [callTo, setCallTo] = useState('+16505550199');
  const [sipTrunk, setSipTrunk] = useState('carrier-sip-trunk');
  const [dialing, setDialing] = useState(false);
  const [callResultBanner, setCallResultBanner] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (initialComposeNumber) {
      setFromNumber(initialComposeNumber.phoneNumber);
      setCallFrom(initialComposeNumber.e164);
      if (initialComposeNumber.carrierGateway && initialComposeNumber.carrierGateway !== 'direct-smtp') {
        setCarrierGateway(initialComposeNumber.carrierGateway);
      }
    }
  }, [initialComposeNumber]);

  useEffect(() => {
    if (initialGateway) {
      setCarrierGateway(initialGateway);
      setSubView('sms');
    }
  }, [initialGateway]);

  const fetchMessages = useCallback(async () => {
    setLoadingSms(true);
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      setLoadingSms(false);
    }
  }, []);

  const fetchCalls = useCallback(async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch('/api/calls');
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
      }
    } finally {
      setLoadingCalls(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchCalls();
  }, [fetchMessages, fetchCalls, refreshTrigger]);

  const handleCopy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleSendOutboundSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setSendingSms(true);
    setSmsResultBanner(null);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromNumber,
          toPhone,
          carrierGateway,
          message: messageText.trim(),
          dryRun
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessageText('');
        setSmsResultBanner({
          ok: true,
          text: dryRun
            ? `Queued dry-run payload for ${toPhone.replace(/[^0-9]/g, '')}@${carrierGateway}`
            : `Live SMTP accepted (${data.message?.deliveryMode}) for ${toPhone.replace(/[^0-9]/g, '')}@${carrierGateway}`
        });
      } else {
        setSmsResultBanner({
          ok: false,
          text: data.error || 'Real SMTP delivery failed; inspect protocol transcript in the message log.'
        });
      }
      fetchMessages();
    } finally {
      setSendingSms(false);
    }
  };

  const handleOriginateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialing(true);
    setCallResultBanner(null);
    try {
      const res = await fetch('/api/calls/originate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromNumber: callFrom,
          toPhone: callTo,
          sipTrunk
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCallResultBanner({ ok: true, text: data.call?.detail || 'Asterisk AMI Originate queued.' });
      } else {
        setCallResultBanner({
          ok: false,
          text: data.error || 'Asterisk AMI unavailable on 127.0.0.1:5038.'
        });
      }
      fetchCalls();
    } finally {
      setDialing(false);
    }
  };

  const filteredMessages = messages.filter((m) =>
    directionFilter === 'all' ? true : m.direction === directionFilter
  );

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setSubView('sms')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'sms' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Live SMTP SMS Relay
          </button>
          <button
            onClick={() => setSubView('voice')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'voice' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Live SIP Voice Calling
          </button>
          <button
            onClick={() => setSubView('carriers')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'carriers' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Carrier Gateway Matrix
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-2">
          Live Linux Socket Mode · Domain: {domain}
        </div>
      </div>

      {subView === 'carriers' ? (
        <CarriersView onTestCarrier={(gw) => { setCarrierGateway(gw); setSubView('sms'); }} />
      ) : subView === 'voice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Voice Originate Form */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">Asterisk AMI Call Origination</h2>
              <p className="text-xs text-slate-400">
                Places real SIP/RTP calls via local Asterisk AMI (<span className="font-mono text-slate-200">127.0.0.1:5038</span>) using any of your 1,000 PJSIP DIDs.
              </p>
            </div>

            <form onSubmit={handleOriginateCall} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Caller ID DID (1–1000)
                </label>
                <input
                  type="text"
                  required
                  value={callFrom}
                  onChange={(e) => setCallFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Destination Phone (E.164)
                </label>
                <input
                  type="text"
                  required
                  value={callTo}
                  onChange={(e) => setCallTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  PJSIP Outbound Trunk Name
                </label>
                <input
                  type="text"
                  required
                  value={sipTrunk}
                  onChange={(e) => setSipTrunk(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {callResultBanner && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    callResultBanner.ok
                      ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                  }`}
                >
                  {!callResultBanner.ok && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <span>{callResultBanner.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={dialing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                {dialing ? 'Connecting Asterisk AMI...' : 'Originate Live SIP Call'}
              </button>
            </form>
          </div>

          {/* Call Detail Records (CDRs) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">SIP Call Detail Records (CDR)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real Asterisk AMI origination attempts and inbound PJSIP webhook events
                </p>
              </div>
              <button
                onClick={fetchCalls}
                title="Refresh CDRs"
                className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCalls ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {calls.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <p className="text-sm font-medium text-slate-300">No SIP calls logged yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Originate a call via Asterisk AMI or receive an inbound DID call to `/api/webhooks/call-event`.
                  </p>
                </div>
              ) : (
                calls.map((c) => (
                  <div key={c.id} className="p-5 space-y-2 hover:bg-slate-800/30 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 capitalize">{c.direction}</span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-slate-200">{c.from}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-mono text-slate-100">{c.to}</span>
                      </div>
                      <span
                        className={`font-medium capitalize ${
                          c.status === 'failed'
                            ? 'text-rose-400'
                            : c.status === 'connected' || c.status === 'completed'
                            ? 'text-emerald-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">{c.detail}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Trunk: {c.sipTrunk}</span>
                      <span>·</span>
                      <span>Codec: {c.codec}</span>
                      <span>·</span>
                      <span>{new Date(c.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Real Outbound SMTP-to-SMS Composer */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">Live Outbound SMTP Relay</h2>
              <p className="text-xs text-slate-400">
                Opens a real TCP Port 25 / STARTTLS socket to local Postfix or the carrier&apos;s MX exchange—no faked delivery.
              </p>
            </div>

            <form onSubmit={handleSendOutboundSms} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Originating Virtual Number (1–1000)
                </label>
                <input
                  type="text"
                  required
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  MAIL FROM: {fromNumber.replace(/[^0-9]/g, '')}@{domain}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Destination Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={toPhone}
                  onChange={(e) => setToPhone(e.target.value)}
                  placeholder="+1 (650) 555-0199"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Carrier SMTP Gateway
                </label>
                <select
                  value={carrierGateway}
                  onChange={(e) => setCarrierGateway(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {GLOBAL_CARRIERS.map((c) => (
                    <option key={`${c.carrier}-${c.smsGateway}`} value={c.smsGateway}>
                      {c.carrier} ({c.smsGateway})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  RCPT TO: {toPhone.replace(/[^0-9]/g, '') || '0000000000'}@{carrierGateway}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Message Body</label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {messageText.length} / 160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enter alert or transactional SMS text..."
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-400 focus:ring-0"
                />
                <span>Dry-run only (do not open real Port 25 TCP socket)</span>
              </label>

              {smsResultBanner && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    smsResultBanner.ok
                      ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                  }`}
                >
                  {!smsResultBanner.ok && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <span>{smsResultBanner.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingSms || !messageText.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingSms ? 'Transmitting over TCP/25...' : dryRun ? 'Queue Dry-Run Payload' : 'Send Live via Port 25 SMTP'}
              </button>
            </form>
          </div>

          {/* Right Column: Live Message Stream & MIME/Transcript Inspector */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">SMTP Traffic & SMS Stream</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real Postfix webhook captures, live Port 25 transcripts, and OTP extraction
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                  {(['all', 'inbound', 'outbound'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setDirectionFilter(dir)}
                      className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                        directionFilter === dir
                          ? 'bg-slate-800 text-slate-100'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchMessages}
                  title="Refresh Stream"
                  className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingSms ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {filteredMessages.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <p className="text-sm font-medium text-slate-300">No messages recorded in this view</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Send a live SMTP SMS or deliver to `/api/webhooks/inbound-sms` from Postfix.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div key={msg.id} className="p-5 hover:bg-slate-800/30 transition-colors space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        {msg.direction === 'inbound' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-100 capitalize">{msg.direction}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-mono">{msg.from}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-mono text-slate-100">{msg.to}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono tabular-nums">
                        <span
                          className={`capitalize font-medium ${
                            msg.status === 'failed'
                              ? 'text-rose-400'
                              : msg.status === 'delivered' || msg.status === 'received'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {msg.status}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed">{msg.body}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2 text-slate-400">
                        <span>{msg.carrier}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          {msg.tlsCipher}
                        </span>
                        {msg.otpCode && (
                          <>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <button
                              onClick={() => handleCopy(msg.otpCode!, msg.id)}
                              className="inline-flex items-center gap-1 font-mono font-semibold text-cyan-400 hover:text-cyan-300"
                            >
                              OTP: {msg.otpCode}
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        )}
                      </div>

                      {(msg.rawMime || msg.smtpTranscript) && (
                        <button
                          onClick={() => setSelectedMimeMsg(msg)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-cyan-400 transition-colors"
                        >
                          <FileCode2 className="w-3.5 h-3.5" />
                          Inspect MIME & Transcript
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raw MIME + Real SMTP Transcript Modal */}
      {selectedMimeMsg && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">RFC 5322 Envelope & SMTP Transcript</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {selectedMimeMsg.from} → {selectedMimeMsg.to}
                </p>
              </div>
              <button
                onClick={() => setSelectedMimeMsg(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedMimeMsg.smtpTranscript && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-cyan-400">Live TCP/25 SMTP Protocol Transcript</div>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {selectedMimeMsg.smtpTranscript}
                </pre>
              </div>
            )}

            {selectedMimeMsg.rawMime && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-300">RFC 5322 Raw MIME</div>
                <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {selectedMimeMsg.rawMime}
                </pre>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  handleCopy(
                    `${selectedMimeMsg.smtpTranscript || ''}\n\n${selectedMimeMsg.rawMime || ''}`.trim(),
                    'mime-copy'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                {copiedId === 'mime-copy' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Log
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedMimeMsg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
