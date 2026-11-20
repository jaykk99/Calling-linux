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
  const [fromPhone, setFromPhone] = useState('+1 (415) 890-3321');
  const [carrierName, setCarrierName] = useState('Verizon Wireless (vtext.com)');
  const [body, setBody] = useState('Your verification code is 847291. Do not share this code with anyone.');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (preselectedNumber) {
      setTargetExtension(preselectedNumber.extension.toString().padStart(4, '0'));
    }
  }, [preselectedNumber]);

  if (!isOpen) return null;

  const applyPreset = (type: 'otp' | 'bank' | 'alert') => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000);
    if (type === 'otp') {
      setFromPhone('+1 (888) 204-5910');
      setCarrierName('AT&T Mobility (txt.att.net)');
      setBody(`Auth code: ${randomOtp}. Use this code within 5 minutes to verify your Linux Carrier login.`);
    } else if (type === 'bank') {
      setFromPhone('+1 (800) 935-9935');
      setCarrierName('T-Mobile US (tmomail.net)');
      setBody(`Security Alert: Confirm $450.00 wire transfer using passcode ${randomOtp}. Reply STOP to cancel.`);
    } else {
      setFromPhone('+1 (650) 555-0148');
      setCarrierName('Direct SMTP Gateway');
      setBody('SMTP Port 25 MX routing heartbeat verified. TLS 1.3 cipher active on mx1.');
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
          body,
          carrierName
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
              <h3 className="text-base font-semibold text-slate-100">Simulate Inbound Port 25 SMS</h3>
              <p className="text-xs text-slate-400">Emulate an external carrier delivering mail to Postfix pipe</p>
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
            onClick={() => applyPreset('bank')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
          >
            Banking Verification
          </button>
          <button
            type="button"
            onClick={() => applyPreset('alert')}
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
                Sender Phone / Shortcode
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
              Originating Carrier Gateway
            </label>
            <input
              type="text"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            />
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
              {sending ? 'Delivering via Port 25...' : 'Deliver Inbound SMS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
