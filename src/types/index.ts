export interface VirtualNumber {
  id: string;
  phoneNumber: string;
  e164: string;
  extension: number;
  assignedEmail: string;
  sipUsername: string;
  carrierGateway: string;
  status: 'active' | 'idle' | 'reserved' | 'forwarding';
  label: string;
  webhookUrl: string;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  totalReceived: number;
  totalSent: number;
  totalCalls: number;
  lastActive: string;
  lastOtp?: string;
}

export interface SmsMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  timestamp: string;
  carrier: string;
  otpCode?: string;
  status: 'delivered' | 'received' | 'queued' | 'failed';
  deliveryMode?: 'live-smtp' | 'local-postfix' | 'webhook' | 'test-trigger';
  smtpTranscript?: string;
  rawMime?: string;
  port25Verified: boolean;
  tlsCipher: string;
}

export interface CallRecord {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: 'ringing' | 'connected' | 'completed' | 'failed';
  durationSec: number;
  timestamp: string;
  codec: string;
  sipTrunk: string;
  channel?: string;
  detail: string;
}

export interface DiagnosticCheck {
  status: 'passed' | 'warning' | 'failed' | 'pending';
  message: string;
  details?: string[];
}

export interface DiagnosticReport {
  domain: string;
  ip: string;
  isPublicIp: boolean;
  timestamp: string;
  mxRecords: { exchange: string; priority: number }[];
  aRecord: string | null;
  txtRecords: string[][];
  ptrRecord: string | null;
  smtpBanner: string | null;
  checks: {
    publicNetworkIp: DiagnosticCheck;
    domainDelegation: DiagnosticCheck;
    mxRecord: DiagnosticCheck;
    port25: DiagnosticCheck;
    reverseDns: DiagnosticCheck;
    tlsCertificates: DiagnosticCheck;
    spfDkimDmarc: DiagnosticCheck;
    mtaStsDane: DiagnosticCheck;
    chromeOsCheck: {
      status: 'warning';
      isChromeOsRisk: boolean;
      summary: string;
      details: string[];
      solutions: {
        title: string;
        desc: string;
      }[];
    };
  };
}

export interface CarrierGatewayInfo {
  carrier: string;
  country: string;
  smsGateway: string;
  mmsGateway: string;
  charLimit: number;
  notes: string;
}

export interface SystemCapabilities {
  hostname: string;
  platform: string;
  release: string;
  arch: string;
  uptimeSec: number;
  cpuModel: string;
  cpuCores: number;
  totalMemMb: number;
  freeMemMb: number;
  loadAvg: number[];
  isRoot: boolean;
  persistencePath: string;
  binaries: {
    name: string;
    path: string | null;
    installed: boolean;
    role: string;
  }[];
  ports: {
    port: number;
    protocol: string;
    service: string;
    listening: boolean;
  }[];
  kernelLimits: {
    nofileLimit: number | string;
    somaxconn: number | string;
    fileMax: number | string;
    ephemeralPorts: string;
  };
  readiness1000: {
    canRunNodeGateway: boolean;
    canSendLiveSmtp: boolean;
    canTerminateCalls: boolean;
    warnings: string[];
  };
}

export interface BenchmarkResult {
  timestamp: string;
  numbersTested: number;
  totalDurationMs: number;
  didIndexMs: number;
  pjsipConfigGenMs: number;
  postfixMapGenMs: number;
  mimeBuild1000Ms: number;
  diskFlushMs: number;
  heapUsedMb: number;
  rssMb: number;
  estimatedMaxConcurrentCalls: number;
  estimatedMaxSmsPerMin: number;
  verdict: string;
}
