import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Mail,
  AlertTriangle,
  Radio,
  Inbox
} from 'lucide-react';
import { SmsMessage, CallRecord, VirtualNumber, ImapMailboxMessage } from '../types';

interface LiveConsoleViewProps {
  domain: string;
  initialComposeNumber?: VirtualNumber | null;
  refreshTrigger: number;
}

interface IncomingOffer {
  from: string;
  fromFormatted: string;
  sdp: RTCSessionDescriptionInit;
  callId: string;
}

export const LiveConsoleView: React.FC<LiveConsoleViewProps> = ({
  domain,
  initialComposeNumber,
  refreshTrigger
}) => {
  const [subView, setSubView] = useState<'sms' | 'voice' | 'imap'>('sms');

  // SMS State
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loadingSms, setLoadingSms] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'internal' | 'inbound' | 'outbound'>('all');
  const [selectedMimeMsg, setSelectedMimeMsg] = useState<SmsMessage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [fromNumber, setFromNumber] = useState('+1 (201) 555-0001');
  const [toPhone, setToPhone] = useState('+1 (201) 555-0002');
  const [targetDomain, setTargetDomain] = useState(domain);
  const [messageText, setMessageText] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResultBanner, setSmsResultBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Self-Hosted WebRTC Live Softphone State
  const [myLine, setMyLine] = useState('+12015550001');
  const [webrtcRegistered, setWebrtcRegistered] = useState(false);
  const [onlineLines, setOnlineLines] = useState<string[]>([]);
  const [sipRegisteredLines, setSipRegisteredLines] = useState<string[]>([]);
  const [embeddedSipPort, setEmbeddedSipPort] = useState<number | null>(null);
  const [dialTarget, setDialTarget] = useState('+12015550002');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing_in' | 'connected'>('idle');
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<IncomingOffer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [rtcNotice, setRtcNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePeerRef = useRef<string | null>(null);
  const myLineRef = useRef<string>(myLine);
  const activeCallIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Asterisk AMI Optional PBX Originate State
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [amiFrom, setAmiFrom] = useState('+12015550001');
  const [amiTo, setAmiTo] = useState('+12015550002');
  const [dialingAmi, setDialingAmi] = useState(false);
  const [amiBanner, setAmiBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Coturn ICE & Dovecot IMAP Mailbox State
  const [turnEnabled, setTurnEnabled] = useState(false);
  const [turnHost, setTurnHost] = useState<string | null>(null);
  const [imapHost, setImapHost] = useState('127.0.0.1');
  const [imapPort, setImapPort] = useState('993');
  const [imapUseTls, setImapUseTls] = useState(true);
  const [imapUser, setImapUser] = useState(`12015550001@${domain}`);
  const [imapPassword, setImapPassword] = useState('');
  const [imapMessages, setImapMessages] = useState<ImapMailboxMessage[]>([]);
  const [imapSyncing, setImapSyncing] = useState(false);
  const [imapStatus, setImapStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    myLineRef.current = myLine;
  }, [myLine]);

  useEffect(() => {
    activePeerRef.current = activePeer;
  }, [activePeer]);

  useEffect(() => {
    activeCallIdRef.current = activeCallId;
  }, [activeCallId]);

  useEffect(() => {
    setTargetDomain(domain);
    setImapUser((prev) => (prev.includes('@') ? `${prev.split('@')[0]}@${domain}` : `12015550001@${domain}`));
  }, [domain]);

  useEffect(() => {
    if (initialComposeNumber) {
      setFromNumber(initialComposeNumber.phoneNumber);
      setMyLine(initialComposeNumber.e164);
      setAmiFrom(initialComposeNumber.e164);
      setImapUser(initialComposeNumber.imapMailbox || initialComposeNumber.assignedEmail);
    }
  }, [initialComposeNumber]);

  // Call duration timer
  useEffect(() => {
    if (callState !== 'connected') {
      setCallDurationSec(0);
      return;
    }
    const id = setInterval(() => setCallDurationSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

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

  const fetchPeers = useCallback(async () => {
    try {
      const res = await fetch('/api/rtc/peers');
      if (res.ok) {
        const data = await res.json();
        setOnlineLines(data.webrtcOnlineLines || []);
        setSipRegisteredLines(data.sipRegisteredLines || []);
        setEmbeddedSipPort(data.embeddedSipPort ?? null);
      }
    } catch {
      // Ignore transient
    }
  }, []);

  const fetchIceConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/rtc/ice-config');
      if (res.ok) {
        const data = await res.json();
        setTurnEnabled(Boolean(data.turnEnabled));
        setTurnHost(data.turnHost || null);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchCalls();
    fetchPeers();
    fetchIceConfig();
  }, [fetchMessages, fetchCalls, fetchPeers, fetchIceConfig, refreshTrigger]);

  const cleanupPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // Ignore
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    setCallState('idle');
    setActivePeer(null);
    setActiveCallId(null);
    setIncomingOffer(null);
    setIsMuted(false);
  }, []);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      cleanupPeerConnection();
    };
  }, [cleanupPeerConnection]);

  const createPeerConnection = useCallback(
    async (remoteE164: string, callId: string) => {
      let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const iceRes = await fetch('/api/rtc/ice-config');
        if (iceRes.ok) {
          const iceData = await iceRes.json();
          if (Array.isArray(iceData.iceServers) && iceData.iceServers.length > 0) {
            iceServers = iceData.iceServers;
          }
          setTurnEnabled(Boolean(iceData.turnEnabled));
          setTurnHost(iceData.turnHost || null);
        }
      } catch {
        // Fallback to STUN
      }

      const pc = new RTCPeerConnection({ iceServers });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch('/api/rtc/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'candidate',
              from: myLineRef.current,
              to: remoteE164,
              candidate: event.candidate.toJSON(),
              callId
            })
          }).catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected');
          setRtcNotice({ ok: true, text: `Encrypted DTLS-SRTP audio connected with ${remoteE164}` });
          fetchCalls();
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          cleanupPeerConnection();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanupPeerConnection, fetchCalls]
  );

  const registerWebRtcLine = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const cleanLine = myLine.trim();
    if (!cleanLine) return;

    const es = new EventSource(`/api/rtc/events?line=${encodeURIComponent(cleanLine)}`);
    eventSourceRef.current = es;

    es.addEventListener('registered', (ev: MessageEvent) => {
      const info = JSON.parse(ev.data);
      setMyLine(info.e164);
      setWebrtcRegistered(true);
      setRtcNotice({
        ok: true,
        text: `Line ${info.e164} (${info.sipUri}) registered live on Self-Hosted WebRTC Switch.`
      });
      fetchPeers();
    });

    es.addEventListener('presence', (ev: MessageEvent) => {
      const data = JSON.parse(ev.data);
      setOnlineLines(data.onlineLines || []);
    });

    es.addEventListener('signal', async (ev: MessageEvent) => {
      const sig = JSON.parse(ev.data);

      if (sig.type === 'offer') {
        setIncomingOffer({
          from: sig.from,
          fromFormatted: sig.fromFormatted || sig.from,
          sdp: sig.sdp,
          callId: sig.callId
        });
        setCallState('ringing_in');
        setRtcNotice({ ok: true, text: `Incoming self-hosted call from ${sig.fromFormatted || sig.from}` });
        fetchCalls();
      } else if (sig.type === 'answer' && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sig.sdp));
        for (const cand of pendingCandidatesRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
        }
        pendingCandidatesRef.current = [];
        setCallState('connected');
        fetchCalls();
      } else if (sig.type === 'candidate' && sig.candidate) {
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(sig.candidate));
        } else {
          pendingCandidatesRef.current.push(sig.candidate);
        }
      } else if (sig.type === 'hangup') {
        cleanupPeerConnection();
        setRtcNotice({ ok: true, text: `Call ended by remote line ${sig.from}` });
        fetchCalls();
      }
    });

    es.onerror = () => {
      setWebrtcRegistered(false);
      setRtcNotice({
        ok: false,
        text: 'WebRTC line disconnected or invalid DID. Enter a valid DID (+12015550001–+12015551000).'
      });
    };
  };

  const unregisterWebRtcLine = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    cleanupPeerConnection();
    setWebrtcRegistered(false);
    setRtcNotice(null);
    setTimeout(fetchPeers, 200);
  };

  const startWebRtcCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webrtcRegistered) {
      setRtcNotice({ ok: false, text: 'Register your own DID line online first before placing a call.' });
      return;
    }
    const target = dialTarget.trim();
    if (!target || target === myLine) {
      setRtcNotice({ ok: false, text: 'Select a different destination DID in the 1,000-number pool.' });
      return;
    }

    const callId = `rtc-${Date.now()}`;
    setActiveCallId(callId);
    setActivePeer(target);
    setCallState('calling');
    setRtcNotice(null);

    try {
      const pc = await createPeerConnection(target, callId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch('/api/rtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer',
          from: myLine,
          to: target,
          sdp: pc.localDescription,
          callId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        cleanupPeerConnection();
        setRtcNotice({ ok: false, text: data.error || 'Target DID is offline.' });
        fetchCalls();
      } else {
        setRtcNotice({ ok: true, text: `Ringing ${target}... waiting for answer.` });
        fetchCalls();
      }
    } catch (err: any) {
      cleanupPeerConnection();
      setRtcNotice({
        ok: false,
        text: err?.message || 'Microphone access denied or WebRTC failed in this browser context.'
      });
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingOffer) return;
    const { from, sdp, callId } = incomingOffer;
    setActivePeer(from);
    setActiveCallId(callId);
    setIncomingOffer(null);

    try {
      const pc = await createPeerConnection(from, callId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const cand of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch('/api/rtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'answer',
          from: myLine,
          to: from,
          sdp: pc.localDescription,
          callId
        })
      });
      setCallState('connected');
      setRtcNotice({ ok: true, text: `Connected live voice audio with ${from}` });
      fetchCalls();
    } catch (err: any) {
      cleanupPeerConnection();
      setRtcNotice({ ok: false, text: err?.message || 'Failed to capture microphone to answer call.' });
    }
  };

  const hangupWebRtcCall = async () => {
    const peer = activePeerRef.current || incomingOffer?.from;
    const cid = activeCallIdRef.current || incomingOffer?.callId;
    if (peer) {
      await fetch('/api/rtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hangup',
          from: myLineRef.current,
          to: peer,
          callId: cid
        })
      }).catch(() => {});
    }
    cleanupPeerConnection();
    fetchCalls();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

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
          targetDomain: targetDomain.trim() || domain,
          message: messageText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessageText('');
        setSmsResultBanner({
          ok: true,
          text: `Real SMTP delivery accepted (${data.message?.deliveryMode}) for ${data.message?.to}`
        });
      } else {
        setSmsResultBanner({
          ok: false,
          text: data.error || 'Real SMTP delivery failed; inspect protocol transcript in the message stream.'
        });
      }
      fetchMessages();
    } finally {
      setSendingSms(false);
    }
  };

  const handleOriginateAmiCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialingAmi(true);
    setAmiBanner(null);
    try {
      const res = await fetch('/api/calls/originate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromNumber: amiFrom,
          toPhone: amiTo
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAmiBanner({ ok: true, text: data.call?.detail || 'Self-hosted Asterisk AMI Originate queued.' });
      } else {
        setAmiBanner({
          ok: false,
          text: data.error || 'Asterisk AMI unavailable on 127.0.0.1:5038.'
        });
      }
      fetchCalls();
    } finally {
      setDialingAmi(false);
    }
  };

  const handleSyncImap = async (e: React.FormEvent) => {
    e.preventDefault();
    setImapSyncing(true);
    setImapStatus(null);
    try {
      const res = await fetch('/api/mailboxes/imap-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: imapHost,
          port: parseInt(imapPort, 10) || 993,
          username: imapUser,
          password: imapPassword,
          useTls: imapUseTls
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImapMessages(data.messages || []);
        setImapStatus({
          ok: true,
          text: `Synced ${data.messages?.length || 0} messages from ${data.mailbox} (${data.source})`
        });
      } else {
        setImapStatus({ ok: false, text: data.error || 'Failed to sync IMAP mailbox.' });
      }
    } finally {
      setImapSyncing(false);
    }
  };

  const filteredMessages = messages.filter((m) =>
    directionFilter === 'all' ? true : m.direction === directionFilter
  );

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

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
            Self-Hosted SMTP SMS
          </button>
          <button
            onClick={() => setSubView('voice')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'voice' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Self-Hosted Voice Calling (WebRTC &amp; SIP)
          </button>
          <button
            onClick={() => setSubView('imap')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subView === 'imap' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Dovecot IMAP Mailboxes
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono px-2">
          {turnEnabled ? `TURN Active (${turnHost})` : 'STUN Direct'} · Domain: {domain}
          {embeddedSipPort ? ` · SIP UDP :${embeddedSipPort}` : ''}
        </div>
      </div>

      {subView === 'imap' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">Dovecot IMAPS / Maildir Sync</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects directly over RFC 3501 IMAP/IMAPS (`993`/`143`) or local Linux Maildir (`/var/mail/vhosts`) for any of the 1,000 unified agent identities.
              </p>
            </div>

            <form onSubmit={handleSyncImap} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">IMAP Host</label>
                  <input
                    type="text"
                    required
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
                  <input
                    type="text"
                    required
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mailbox Identity</label>
                <input
                  type="text"
                  required
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dovecot Password (optional for local Maildir)
                </label>
                <input
                  type="password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={imapUseTls}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setImapUseTls(checked);
                    setImapPort(checked ? '993' : '143');
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-400"
                />
                <span>Use IMAPS TLS (port 993)</span>
              </label>

              {imapStatus && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    imapStatus.ok
                      ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                  }`}
                >
                  {!imapStatus.ok && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  <span>{imapStatus.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={imapSyncing}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Inbox className="w-3.5 h-3.5" />
                {imapSyncing ? 'Syncing Dovecot INBOX...' : 'Sync Real IMAP Mailbox'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-slate-100">Independent Dovecot INBOX ({imapUser})</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live RFC 3501 FETCH &amp; local `/var/mail/vhosts` Maildir reader
              </p>
            </div>
            <div className="divide-y divide-slate-800/80">
              {imapMessages.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <p className="text-sm font-medium text-slate-300">No IMAP messages synced yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click Sync Real IMAP Mailbox after provisioning Dovecot via the Deployment installer.
                  </p>
                </div>
              ) : (
                imapMessages.map((m) => (
                  <div key={m.uid} className="p-5 space-y-1.5 hover:bg-slate-800/30">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-100">{m.subject}</span>
                      <span className="font-mono text-slate-400">{m.date}</span>
                    </div>
                    <div className="text-xs font-mono text-cyan-400">From: {m.from}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{m.snippet}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : subView === 'voice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Browser WebRTC Softphone + Optional Asterisk AMI */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Zero-Carrier Self-Hosted WebRTC Switch</span>
                  </div>
                  <h2 className="text-base font-semibold text-slate-100">Live Browser Audio Softphone</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Register any DID in your 1,000-number pool and call another online tab or DID directly over DTLS-SRTP WebRTC audio—no paid SIP trunk required.
                  </p>
                </div>
              </div>

              {/* Line Registration */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Register This Tab as DID (e.g. +12015550001)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={myLine}
                    disabled={webrtcRegistered}
                    onChange={(e) => setMyLine(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100 disabled:opacity-60 focus:outline-none focus:border-cyan-500"
                  />
                  {!webrtcRegistered ? (
                    <button
                      type="button"
                      onClick={registerWebRtcLine}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap"
                    >
                      Go Online
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={unregisterWebRtcLine}
                      className="px-3.5 py-2 text-xs font-medium text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg whitespace-nowrap"
                    >
                      Go Offline
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    WebRTC Online: <strong className="text-emerald-400">{onlineLines.length}</strong>
                  </span>
                  <span>
                    SIP UDP Registered: <strong className="text-cyan-400">{sipRegisteredLines.length}</strong>
                  </span>
                </div>

                {onlineLines.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {onlineLines.map((line) => (
                      <button
                        key={line}
                        type="button"
                        onClick={() => {
                          if (line !== myLine) setDialTarget(line);
                        }}
                        className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors ${
                          line === myLine
                            ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                            : 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-500'
                        }`}
                        title={line === myLine ? 'Your active line' : `Click to dial ${line}`}
                      >
                        {line} {line === myLine ? '(You)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Incoming Ringing Card */}
              {callState === 'ringing_in' && incomingOffer && (
                <div className="p-4 bg-cyan-950/40 border border-cyan-500/60 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                    <PhoneIncoming className="w-4 h-4" />
                    <span>Incoming Voice Call: {incomingOffer.fromFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={acceptIncomingCall}
                      className="flex-1 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg"
                    >
                      Answer Audio
                    </button>
                    <button
                      type="button"
                      onClick={hangupWebRtcCall}
                      className="flex-1 py-2 text-xs font-medium text-rose-200 bg-rose-900/60 hover:bg-rose-800/70 rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Active Connected / Calling Controls */}
              {(callState === 'calling' || callState === 'connected') && (
                <div className="p-4 bg-emerald-950/30 border border-emerald-700/60 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
                      {callState === 'calling' ? `Calling ${activePeer}...` : `Connected: ${activePeer}`}
                    </span>
                    <span className="font-mono tabular-nums text-emerald-200">
                      {callState === 'connected' ? formatTimer(callDurationSec) : 'Ringing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg"
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5 text-amber-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                      {isMuted ? 'Unmute' : 'Mute Mic'}
                    </button>
                    <button
                      type="button"
                      onClick={hangupWebRtcCall}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      Hang Up
                    </button>
                  </div>
                </div>
              )}

              {/* Dial Form */}
              <form onSubmit={startWebRtcCall} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Dial Target DID (1–1000)
                  </label>
                  <input
                    type="text"
                    required
                    value={dialTarget}
                    onChange={(e) => setDialTarget(e.target.value)}
                    placeholder="+12015550002"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {rtcNotice && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      rtcNotice.ok
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                    }`}
                  >
                    {!rtcNotice.ok && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <span>{rtcNotice.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={callState !== 'idle'}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call DID Live via Self-Hosted WebRTC
                </button>
              </form>
            </div>

            {/* Optional Asterisk AMI Local PBX Bridge */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">Linux Asterisk AMI PBX Bridge (Optional)</h3>
                <p className="text-xs text-slate-400">
                  For SIP deskphones or Zoiper/Linphone clients on <span className="font-mono text-slate-200">127.0.0.1:5038</span> using context <span className="font-mono text-slate-200">carrier-selfhosted</span>.
                </p>
              </div>

              <form onSubmit={handleOriginateAmiCall} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">From DID</label>
                    <input
                      type="text"
                      required
                      value={amiFrom}
                      onChange={(e) => setAmiFrom(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">To DID / Ext</label>
                    <input
                      type="text"
                      required
                      value={amiTo}
                      onChange={(e) => setAmiTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {amiBanner && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      amiBanner.ok
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                    }`}
                  >
                    {!amiBanner.ok && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <span>{amiBanner.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={dialingAmi}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {dialingAmi ? 'Connecting Asterisk AMI...' : 'Originate via Asterisk PJSIP'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Call Detail Records (CDRs) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Self-Hosted Call Detail Records (CDR)</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live WebRTC sessions, embedded SIP UDP INVITEs, and Asterisk PJSIP calls
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
                  <p className="text-sm font-medium text-slate-300">No calls recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Register two DIDs in separate tabs via Go Online and place a real WebRTC audio call, or send a SIP INVITE to UDP port {embeddedSipPort || 5060}.
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
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                      <span>Transport: {c.transport}</span>
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
          {/* Left Column: Self-Hosted SMTP-to-SMS Composer */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-100">Self-Hosted SMTP SMS Relay</h2>
              <p className="text-xs text-slate-400">
                Opens a real RFC 5321 TCP socket to your local Postfix / embedded SMTP server or federated Linux domains over Port 25 + STARTTLS—zero third-party carrier.
              </p>
            </div>

            <form onSubmit={handleSendOutboundSms} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Originating DID (1–1000)
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
                  Recipient Number or Address
                </label>
                <input
                  type="text"
                  required
                  value={toPhone}
                  onChange={(e) => setToPhone(e.target.value)}
                  placeholder="+1 (201) 555-0002"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Target SMTP Domain</label>
                  <button
                    type="button"
                    onClick={() => setTargetDomain(domain)}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
                  >
                    Use Self-Hosted ({domain})
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder={domain}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  RCPT TO:{' '}
                  {toPhone.includes('@')
                    ? toPhone
                    : `${toPhone.replace(/[^0-9]/g, '') || '0000000000'}@${targetDomain || domain}`}
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
                  placeholder="Enter SMS message or OTP code..."
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

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
                {sendingSms ? 'Transmitting over SMTP...' : 'Send Live via Self-Hosted SMTP'}
              </button>
            </form>
          </div>

          {/* Right Column: Live Message Stream & MIME/Transcript Inspector */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">SMTP Traffic &amp; SMS Stream</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real Postfix webhook captures, embedded RFC 5321 transcripts, and OTP extraction
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                  {(['all', 'internal', 'inbound', 'outbound'] as const).map((dir) => (
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
                    Send a self-hosted SMTP SMS or deliver to `/api/webhooks/inbound-sms` from Postfix.
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
                        <span>{msg.transport}</span>
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
                          Inspect MIME &amp; Transcript
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
                <h3 className="text-base font-semibold text-slate-100">RFC 5322 Envelope &amp; SMTP Transcript</h3>
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
                <div className="text-xs font-medium text-cyan-400">Live SMTP Protocol Transcript</div>
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
