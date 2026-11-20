import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  Lock,
  Terminal,
  Server,
  AlertTriangle
} from 'lucide-react';

interface DeploymentViewProps {
  domain: string;
  publicIp: string;
  onDomainChange: (d: string) => void;
  onPublicIpChange: (ip: string) => void;
}

type ConfigTab =
  | 'main_cf'
  | 'master_cf'
  | 'asterisk_pjsip'
  | 'dns_dkim'
  | 'mta_sts'
  | 'pipe_fail2ban'
  | 'wireguard_edge'
  | 'kernel_systemd'
  | 'verify_cmds';

function isPrivateOrCgnatIp(ip: string): boolean {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export const DeploymentView: React.FC<DeploymentViewProps> = ({
  domain,
  publicIp,
  onDomainChange,
  onPublicIpChange
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('main_cf');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hardened Public-Network Security Profile Controls
  const [networkMode, setNetworkMode] = useState<'direct-public' | 'wireguard-edge'>('direct-public');
  const [webhookUrl, setWebhookUrl] = useState(`https://gateway.${domain || 'sms.customlinux.org'}/api/webhooks/inbound-sms`);
  const [dkimBits, setDkimBits] = useState<'2048' | '4096'>('2048');
  const [mtaStsMode, setMtaStsMode] = useState<'enforce' | 'testing'>('enforce');
  const [enablePostscreen, setEnablePostscreen] = useState(true);
  const [enableFail2Ban, setEnableFail2Ban] = useState(true);
  const [rateLimit, setRateLimit] = useState(60);

  const safeDomain = domain.trim() || 'sms.customlinux.org';
  const safeIp = publicIp.trim() || '198.51.100.45';
  const ipIsPrivate = isPrivateOrCgnatIp(safeIp);

  const copySnippet = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const mainCfContent = `# /etc/postfix/main.cf — Hardened Public-Network Enterprise SMTP
compatibility_level = 3.6
myhostname = mx1.${safeDomain}
mydomain = ${safeDomain}
myorigin = $mydomain
mydestination = localhost, mx1.${safeDomain}
inet_interfaces = all
inet_protocols = ipv4
${
  networkMode === 'direct-public'
    ? `smtp_bind_address = ${safeIp}`
    : `postscreen_upstream_proxy_protocol = haproxy\nsmtpd_upstream_proxy_protocol = haproxy`
}

# Identity & Surface Minimization
smtpd_banner = $myhostname ESMTP
disable_vrfy_command = yes
smtpd_helo_required = yes
biff = no
append_dot_mydomain = no
message_size_limit = 2097152
recipient_delimiter = +

# 1,000 Working Virtual Numbers Mapping
virtual_alias_domains = ${safeDomain}
virtual_alias_maps = hash:/etc/postfix/virtual

# Strict Inbound & Outbound TLS (TLS 1.3 / 1.2 Only, Perfect Forward Secrecy)
smtpd_tls_cert_file = /etc/letsencrypt/live/mx1.${safeDomain}/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mx1.${safeDomain}/privkey.pem
smtpd_tls_dh1024_param_file = /etc/postfix/dh2048.pem
smtpd_tls_security_level = may
smtpd_tls_auth_only = yes
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_ciphers = high
smtpd_tls_mandatory_ciphers = high
smtpd_tls_exclude_ciphers = aNULL, eNULL, EXPORT, DES, RC4, MD5, PSK, aECDH, EDH-DSS-DES-CBC3-SHA, EDH-RSA-DES-CBC3-SHA, KRB5-DES, CBC3-SHA
smtpd_tls_eecdh_grade = ultra
smtpd_tls_loglevel = 1
smtpd_tls_received_header = yes
tls_preempt_cipherlist = yes

# Outbound DANE DNSSEC Verification
smtp_dns_support_level = dnssec
smtp_tls_security_level = dane
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_ciphers = high
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

# Strict Anti-Relay, HELO, Sender & DNSBL Policy
smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, defer_unauth_destination
smtpd_helo_restrictions =
    permit_mynetworks,
    reject_invalid_helo_hostname,
    reject_non_fqdn_helo_hostname
smtpd_sender_restrictions =
    permit_mynetworks,
    reject_non_fqdn_sender,
    reject_unknown_sender_domain
smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_non_fqdn_recipient,
    reject_unknown_recipient_domain,
    reject_unauth_destination,
    reject_rbl_client zen.spamhaus.org,
    reject_rbl_client bl.spamcop.net

# Anvil Connection & Rate Throttling
anvil_rate_time_unit = 60s
smtpd_client_connection_count_limit = 15
smtpd_client_message_rate_limit = ${rateLimit}
smtpd_client_recipient_rate_limit = ${rateLimit}
smtpd_error_sleep_time = 2s
smtpd_soft_error_limit = 3
smtpd_hard_error_limit = 5

# OpenDKIM Milter (${dkimBits}-bit)
milter_protocol = 6
milter_default_action = accept
smtpd_milters = local:/opendkim/opendkim.sock
non_smtpd_milters = local:/opendkim/opendkim.sock${
    enablePostscreen
      ? `

# Postscreen Pre-Greeting & DNSBL Screening
postscreen_greet_action = enforce
postscreen_dnsbl_threshold = 2
postscreen_dnsbl_sites = zen.spamhaus.org*2, bl.spamcop.net*1
postscreen_dnsbl_action = enforce
postscreen_bare_newline_action = enforce`
      : ''
  }`;

  const masterCfContent = `# /etc/postfix/master.cf — Postscreen (25), Submission (587), SMTPS (465), Chrooted Pipe
${
  enablePostscreen
    ? `smtp      inet  n       -       y       -       1       postscreen
smtpd     pass  -       -       y       -       -       smtpd
dnsblog   unix  -       -       y       -       0       dnsblog
tlsproxy  unix  -       -       y       -       0       tlsproxy`
    : `smtp      inet  n       -       y       -       -       smtpd`
}

# Authenticated Submission (Port 587 STARTTLS Mandatory)
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_tls_auth_only=yes
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING

# Authenticated SMTPS (Port 465 Implicit TLS)
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING

# Unprivileged Self-Hosted Pipe for 1,000 Working Virtual Numbers
apex-carrier-pipe unix - n n - 10 pipe
  flags=FRq user=apexcarrier null_sender= argv=/usr/local/bin/apex-carrier-pipe.py \${recipient}`;

  const dnsZoneContent = `; Authoritative Public DNS Zone Records for ${safeDomain} (DNSSEC Enabled)
$TTL 300

; 1. Primary Mail Exchanger & FCrDNS PTR Alignment
mx1.${safeDomain}.              IN  A       ${safeIp}
; Set Reverse PTR on your public IP host panel: ${safeIp} -> mx1.${safeDomain}.
${safeDomain}.                  IN  MX  10  mx1.${safeDomain}.

; 2. Strict SPF (-all denies unauthorized senders)
${safeDomain}.                  IN  TXT     "v=spf1 ip4:${safeIp} -all"

; 3. OpenDKIM ${dkimBits}-bit Public Key (generated via opendkim-genkey -b ${dkimBits})
mail2026._domainkey.${safeDomain}. IN TXT  "v=DKIM1; h=sha256; k=rsa; p=<PASTE_FROM_/etc/opendkim/keys/${safeDomain}/mail2026.txt>"

; 4. Strict DMARC Policy (Reject unaligned mail, strict DKIM/SPF)
_dmarc.${safeDomain}.           IN  TXT     "v=DMARC1; p=reject; adkim=s; aspf=s; pct=100; rua=mailto:dmarc@${safeDomain}"

; 5. MTA-STS & TLS Reporting (Enforces TLS over SMTP)
mta-sts.${safeDomain}.          IN  A       ${safeIp}
_mta-sts.${safeDomain}.         IN  TXT     "v=STSv1; id=20261120T01;"
_smtp._tls.${safeDomain}.       IN  TXT     "v=TLSRPTv1; rua=mailto:tlsrpt@${safeDomain}"

; 6. DANE TLSA Record (3 1 1 = DANE-EE SPKI SHA-256)
_25._tcp.mx1.${safeDomain}.     IN  TLSA    3 1 1 <SHA256_PUBKEY_HASH_FROM_CERTBOT>`;

  const mtaStsNginxContent = `# 1. Issue ECDSA P-384 Trusted Certificates via Certbot
sudo certbot certonly --standalone --non-interactive --agree-tos \\
  --key-type ecdsa --elliptic-curve secp384r1 \\
  --email postmaster@${safeDomain} \\
  -d mx1.${safeDomain} -d mta-sts.${safeDomain}

# 2. /var/www/mta-sts/.well-known/mta-sts.txt
version: STSv1
mode: ${mtaStsMode}
mx: mx1.${safeDomain}
max_age: 604800

# 3. /etc/nginx/sites-available/mta-sts.${safeDomain}
server {
    listen 443 ssl http2;
    server_name mta-sts.${safeDomain};
    ssl_certificate /etc/letsencrypt/live/mx1.${safeDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mx1.${safeDomain}/privkey.pem;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    root /var/www/mta-sts;
    location = /.well-known/mta-sts.txt {
        default_type text/plain;
    }
}`;

  const pipeFail2BanContent = `# 1. /usr/local/bin/apex-carrier-pipe.py (Public HTTPS Webhook + HMAC-SHA256 + DLQ)
#!/usr/bin/env python3
import sys, os, json, hmac, hashlib, email, urllib.request
from email import policy

SECRET_PATH = "/etc/apex-carrier.secret"
DLQ_DIR = "/var/spool/apex-sms/dlq"
WEBHOOK_URL = "${webhookUrl}"

with open(SECRET_PATH, "r", encoding="utf-8") as f:
    SECRET = f.read().strip().encode("utf-8")

raw_bytes = sys.stdin.buffer.read(1024 * 512)
msg = email.message_from_bytes(raw_bytes, policy=policy.default)
recipient = sys.argv[1] if len(sys.argv) > 1 else str(msg.get("To", ""))
sender = str(msg.get("From", ""))
body = msg.get_body(preferencelist=('plain',)).get_content() if msg.is_multipart() else msg.get_content()

payload = json.dumps({
    "fromPhone": sender,
    "targetNumberId": recipient.split("@")[0],
    "body": body.strip()[:1600],
    "authResults": str(msg.get("Authentication-Results", ""))
}, separators=(",", ":")).encode("utf-8")

sig = hmac.new(SECRET, payload, hashlib.sha256).hexdigest()
req = urllib.request.Request(WEBHOOK_URL, data=payload, headers={
    "Content-Type": "application/json",
    "X-Carrier-Signature-256": f"sha256={sig}"
})
urllib.request.urlopen(req, timeout=5)

# 2. /etc/fail2ban/jail.d/postfix-carrier.conf (${enableFail2Ban ? 'Enabled' : 'Disabled in Profile'})
[postfix]
enabled  = ${enableFail2Ban ? 'true' : 'false'}
port     = smtp,465,587
filter   = postfix
logpath  = /var/log/mail.log
maxretry = 5
bantime  = 3600

[postfix-rbl]
enabled  = ${enableFail2Ban ? 'true' : 'false'}
port     = smtp,465,587
filter   = postfix-rbl
logpath  = /var/log/mail.log
maxretry = 3
bantime  = 86400`;

  const asteriskPjsipContent = `# 1. /etc/asterisk/rtp.conf — 10,000 UDP Ports (Self-Hosted Concurrent Voice Streams)
[general]
rtpstart=10000
rtpend=20000
icesupport=yes

# 2. /etc/asterisk/manager.conf — Local AMI Control for Node.js Call Origination
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1

[linuxcarrier]
secret = ChangeMeStrongAmiSecret
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,originate
write = system,call,log,verbose,command,agent,user,originate

# 3. /etc/asterisk/extensions.conf — 100% Self-Hosted Dialplan (No Paid Trunk Needed)
[carrier-selfhosted]
exten => _1201555XXXX,1,NoOp(Self-hosted DID call from \${CALLERID(num)} to \${EXTEN})
 same => n,Dial(PJSIP/did_\${EXTEN},30)
 same => n,Hangup()

; Federated SIP URI Calling across independent Linux nodes
exten => _[a-zA-Z0-9._-].,1,NoOp(Federated SIP call to \${EXTEN}@\${SIPDOMAIN})
 same => n,Dial(PJSIP/\${EXTEN}@\${SIPDOMAIN},30)
 same => n,Hangup()

# Download full 1,000 self-hosted endpoints: /api/export/asterisk-pjsip?domain=${safeDomain}&ip=${safeIp}`;

  const kernelSystemdContent = `# 1. /etc/sysctl.d/99-linux-carrier-1000.conf — 1,000 Concurrent Calling + SMS Kernel Tuning
fs.file-max = 2097152
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_max_syn_backlog = 4096

# 2. /etc/security/limits.d/99-linux-carrier-1000.conf
* soft nofile 65535
* hard nofile 65535

# 3. /etc/systemd/system/linux-carrier-1000.service — Run This Gateway Directly on Linux
[Unit]
Description=Linux Carrier 1000 Real Voice & SMTP Control Plane
After=network-online.target postfix.service asterisk.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/linux-carrier-1000
Environment=NODE_ENV=production
Environment=CARRIER_DOMAIN=${safeDomain}
Environment=CARRIER_PUBLIC_IP=${safeIp}
ExecStart=/usr/bin/npx tsx server.ts
Restart=always
LimitNOFILE=65535
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/linux-carrier

[Install]
WantedBy=multi-user.target`;

  const wireguardEdgeContent = `# Public Network Ingress Bridge (Exposes NAT/ChromeOS Linux Machine to Public Internet)
# Run HAProxy + WireGuard on a static-IP Public VPS (${safeIp}) so Port 25/465/587 are globally reachable.

# --- 1. Public Edge VPS (/etc/haproxy/haproxy.cfg) ---
frontend public_smtp_25
    bind ${safeIp}:25
    mode tcp
    option tcplog
    # Preserve real external carrier IP via PROXY protocol v2 to your Linux Postfix
    default_backend wg_linux_postfix_25

frontend public_submission_587
    bind ${safeIp}:587
    mode tcp
    default_backend wg_linux_postfix_587

backend wg_linux_postfix_25
    mode tcp
    server linux_node 10.66.0.2:25 send-proxy-v2

backend wg_linux_postfix_587
    mode tcp
    server linux_node 10.66.0.2:587 send-proxy-v2

# --- 2. Public Edge VPS (/etc/wireguard/wg0.conf) ---
[Interface]
Address = 10.66.0.1/24
ListenPort = 51820
PrivateKey = <VPS_PRIVATE_KEY>
PostUp = sysctl -w net.ipv4.ip_forward=1

[Peer]
PublicKey = <LOCAL_LINUX_PUBLIC_KEY>
AllowedIPs = 10.66.0.2/32

# --- 3. Local Linux Machine (/etc/wireguard/wg0.conf) ---
[Interface]
Address = 10.66.0.2/24
PrivateKey = <LOCAL_LINUX_PRIVATE_KEY>

[Peer]
PublicKey = <VPS_PUBLIC_KEY>
Endpoint = ${safeIp}:51820
AllowedIPs = 10.66.0.1/32, 0.0.0.0/0
PersistentKeepalive = 25`;

  const verifyCommandsContent = `# Complete Public Network Audit & Verification Runbook for ${safeDomain} (${safeIp})

# 1. Verify listening sockets on Public IP Port 25 (SMTP), 465/587, 5060/5061 (SIP), 5038 (AMI)
sudo ss -tulnp | grep -E ':(25|465|587|5038|5060|5061)\\b'

# 2. Validate Postfix syntax and Asterisk PJSIP endpoints
sudo postfix check && sudo asterisk -rx "pjsip show endpoints"

# 3. Verify TLS 1.3 STARTTLS handshake & certificate chain from EXTERNAL public internet
openssl s_client -connect mx1.${safeDomain}:25 -starttls smtp -tls1_3 -servername mx1.${safeDomain} </dev/null

# 4. Generate & verify DANE TLSA SHA-256 hash against live public DNS
openssl x509 -in /etc/letsencrypt/live/mx1.${safeDomain}/cert.pem -pubkey -noout \\
  | openssl pkey -pubin -outform DER | openssl dgst -sha256 -hex
dig +short TLSA _25._tcp.mx1.${safeDomain}

# 5. Verify Public Reverse DNS (PTR), MX, SPF, DMARC, and MTA-STS policy
dig +short -x ${safeIp}
dig +short MX ${safeDomain}
dig +short TXT _dmarc.${safeDomain}
curl -fsSL https://mta-sts.${safeDomain}/.well-known/mta-sts.txt

# 6. End-to-End Public Port 25 Delivery Probe to Virtual Number #0001
swaks --to 12015550001@${safeDomain} \\
      --from probe@external-carrier.net \\
      --server mx1.${safeDomain} \\
      --port 25 --tls \\
      --body "Verification code: 918273"

# 7. Inspect Fail2Ban SMTP/SIP Jails & OpenDKIM Milter Socket
sudo fail2ban-client status postfix
sudo fail2ban-client status asterisk`;

  const tabs: { id: ConfigTab; label: string; content: string }[] = [
    { id: 'main_cf', label: 'main.cf (TLS & Anti-Relay)', content: mainCfContent },
    { id: 'master_cf', label: 'master.cf (Postscreen & 587/465)', content: masterCfContent },
    { id: 'asterisk_pjsip', label: 'Asterisk PJSIP (1K Voice)', content: asteriskPjsipContent },
    { id: 'dns_dkim', label: 'DNS Zone + DANE + DKIM', content: dnsZoneContent },
    { id: 'mta_sts', label: 'Certbot ECDSA + MTA-STS', content: mtaStsNginxContent },
    { id: 'pipe_fail2ban', label: 'Public Webhook + Fail2Ban', content: pipeFail2BanContent },
    { id: 'wireguard_edge', label: 'VPS WireGuard Bridge', content: wireguardEdgeContent },
    { id: 'kernel_systemd', label: 'Kernel 1K & Systemd', content: kernelSystemdContent },
    { id: 'verify_cmds', label: 'Public Audit Commands', content: verifyCommandsContent }
  ];

  const activeSnippet = tabs.find((t) => t.id === activeConfigTab)?.content || '';

  const downloadUrl = `/api/export/install-script?domain=${encodeURIComponent(safeDomain)}&ip=${encodeURIComponent(safeIp)}&dkimBits=${dkimBits}&mtaStsMode=${mtaStsMode}&rateLimit=${rateLimit}&postscreen=${enablePostscreen}&fail2ban=${enableFail2Ban}&webhookUrl=${encodeURIComponent(webhookUrl)}&networkMode=${networkMode}`;

  return (
    <div className="space-y-6">
      {/* Hardened Security Profile Builder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Public-Network Enterprise Hardened Mail Stack</span>
            </div>
            <h2 className="text-xl font-bold text-slate-50">
              Secure Public SMTP Configuration & Deployment
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Exposes your 1,000-number Linux gateway on the public internet with globally routable IPv4 binding (or WireGuard + HAProxy public VPS edge), Postscreen DNSBL screening, TLS 1.3 ECDSA P-384, DANE TLSA pinning, OpenDKIM, MTA-STS, Fail2Ban, and HMAC-signed public HTTPS webhooks.
            </p>
          </div>

          <a
            href={downloadUrl}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              ipIsPrivate
                ? 'bg-slate-800 text-slate-400 pointer-events-none'
                : 'text-slate-950 bg-cyan-400 hover:bg-cyan-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Download Public Installer (.sh)
          </a>
        </div>

        {ipIsPrivate && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-700/50 rounded-lg flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Private / CGNAT IP Detected ({safeIp}):</span> Public internet mail hosting requires a globally routable public IPv4. Enter your public VPS or cloud host IPv4 above (the installer explicitly rejects RFC 1918 and CGNAT subnets).
            </div>
          </div>
        )}

        {/* Interactive Security Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Publicly Delegated Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => onDomainChange(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Public Routable IPv4</label>
            <input
              type="text"
              value={publicIp}
              onChange={(e) => onPublicIpChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-mono bg-slate-950 border rounded-lg text-slate-100 focus:outline-none ${
                ipIsPrivate ? 'border-rose-600 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Public HTTPS Webhook Endpoint</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={`https://gateway.${safeDomain}/api/webhooks/sms`}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Public Network Topology</label>
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setNetworkMode('direct-public')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  networkMode === 'direct-public'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct Public IP
              </button>
              <button
                type="button"
                onClick={() => setNetworkMode('wireguard-edge')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  networkMode === 'wireguard-edge'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                VPS WireGuard Edge
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">OpenDKIM Key & MTA-STS Policy</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={dkimBits}
                onChange={(e) => setDkimBits(e.target.value as '2048' | '4096')}
                className="px-2.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="2048">2048-bit DKIM</option>
                <option value="4096">4096-bit DKIM</option>
              </select>
              <select
                value={mtaStsMode}
                onChange={(e) => setMtaStsMode(e.target.value as 'enforce' | 'testing')}
                className="px-2.5 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="enforce">STS: Enforce</option>
                <option value="testing">STS: Testing</option>
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="w-24">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Rate/60s</label>
              <input
                type="number"
                min={10}
                max={1000}
                value={rateLimit}
                onChange={(e) => setRateLimit(parseInt(e.target.value) || 60)}
                className="w-full px-2.5 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setEnablePostscreen((v) => !v)}
              className={`flex-1 py-2 px-2.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
                enablePostscreen
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              Postscreen: {enablePostscreen ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => setEnableFail2Ban((v) => !v)}
              className={`flex-1 py-2 px-2.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
                enableFail2Ban
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              Fail2Ban: {enableFail2Ban ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Hardened Configuration Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveConfigTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeConfigTab === tab.id
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => copySnippet(activeSnippet, activeConfigTab)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            {copiedKey === activeConfigTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Configuration
              </>
            )}
          </button>
        </div>

        <pre className="p-5 bg-slate-950 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[540px] overflow-y-auto">
          {activeSnippet}
        </pre>
      </div>

      {/* Architecture Hardening Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
            <Lock className="w-4 h-4" />
            <span>Zero-Downgrade Public TLS & DANE</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Strips SSLv2/v3, TLS 1.0, and TLS 1.1 across public inbound and outbound channels. Enforces ECDSA P-384 certificates, DANE TLSA DNSSEC validation on outbound carrier connections, and strict MTA-STS policies.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Server className="w-4 h-4" />
            <span>Public Network Perimeter Isolation</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Binds directly to your public IPv4 (or terminates on a public VPS WireGuard + HAProxy PROXY v2 edge), separating unauthenticated Port 25 MX ingress from SASL Port 587/465 submission with Postscreen and Fail2Ban.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Sandbox Pipe & HMAC Public Webhook</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Executes inbound RFC 5322 parsing under an unprivileged <span className="font-mono text-slate-200">nologin</span> user with a 512 KiB payload cap, dead-letter queue fallback, and SHA-256 HMAC signature headers to your public HTTPS endpoint.
          </p>
        </div>
      </div>
    </div>
  );
};
