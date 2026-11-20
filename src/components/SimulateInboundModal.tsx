import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, Sparkles } from 'lucide-react';
import { VirtualNumber } from '../types';

interface SimulateInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedNumber?: VirtualNumber | null;
  domain: string;
  onSuccess: () => void;
}

export const SimulateInboundModal: React.FC<SimulateInboundModalProps> = ({
  isOpen,
  onClose,
  preselectedNumber,
  domain,
  onSuccess
}) => {
  const [targetExtension, setTargetExtension] = useState('0001');
  const [fromPhone, setFromPhone] = useState('+12015550002');
  const [body, setBody] = useState('Your self-hosted verification code is 847291. Delivered over RFC 5321 SMTP.');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (preselectedNumber) {
      setTargetExtension(preselectedNumber.extension.toString().padStart(4, '0'));
    }
  }, [preselectedNumber]);

  if (!isOpen) return null;

  const applyPreset = (type: 'otp' | 'security' | 'probe') => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000);
    if (type === 'otp') {
      setFromPhone('+12015550002');
      setBody(`Auth code: ${randomOtp}. Use this code within 5 minutes to verify your login.`);
    } else if (type === 'security') {
      setFromPhone('+12015550042');
      setBody(`SSH Bastion Alert: Confirm sudo elevation using one-time passcode ${randomOtp}.`);
    } else {
      setFromPhone('+12015550003');
      setBody(`Self-hosted SMTP RFC 5321 health check passed for ${domain}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const targetId = `num-${targetExtension.padStart(4, '0')}`;
      const res = await fetch('/api/messages/simulate-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPhone,
          targetNumberId: targetId,
          body
        })
      });
      if (res.ok) {
        onSuccess();
        onClose();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">Test Direct Inbound SMTP SMS</h3>
              <p className="text-xs text-slate-400">Transmits a real RFC 5321 message through the self-hosted SMTP listener</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Templates:</span>
          <button
            type="button"
            onClick={() => applyPreset('otp')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            2FA Login OTP
          </button>
          <button
            type="button"
            onClick={() => applyPreset('security')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            SSH Security Alert
          </button>
          <button
            type="button"
            onClick={() => applyPreset('probe')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            SMTP Probe
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Line Extension (0001–1000)
              </label>
              <input
                type="text"
                required
                value={targetExtension}
                onChange={(e) => setTargetExtension(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="0001"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                RCPT TO: ...{targetExtension.padStart(4, '0')}@{domain}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Sender DID / Address
              </label>
              <input
                type="text"
                required
                value={fromPhone}
                onChange={(e) => setFromPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              SMS Payload Body (OTP auto-extracted)
            </label>
            <textarea
              rows={3}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {sending ? 'Sending over SMTP...' : 'Send Inbound SMTP SMS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
