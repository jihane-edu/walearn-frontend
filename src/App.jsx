import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';

const WA_SERVER = 'https://walearn-server-production.up.railway.app';

function cn(...classes) { return classes.filter(Boolean).join(' '); }

function Badge({ children, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border', className)}>
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, className, variant = 'default', size = 'default' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-600',
  };
  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-6 text-base',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
}

function Card({ children, className }) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

// ── Input ────────────────────────────────────────────────────────────────────
function Input({ className, ...props }) {
  return (
    <input
      className={cn('flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all', className)}
      {...props}
    />
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ className }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ── WhatsApp Icon ─────────────────────────────────────────────────────────────
function WAIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState('phone');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [linkingStep, setLinkingStep] = useState('disconnected');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [phoneStep, setPhoneStep] = useState('input');
  const [isLoading, setIsLoading] = useState(false);

  const [qrImage, setQrImage] = useState(null);
  const [qrTimer, setQrTimer] = useState(60);
  const [qrExpired, setQrExpired] = useState(false);

  const normalizePhone = (raw) => raw.replace(/[\s\-\+\(\)]/g, '');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${WA_SERVER}/status`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) { setServerStatus('offline'); return; }
        const data = await res.json();
        setServerStatus(data.status);
        if (data.status === 'READY' && linkingStep !== 'connected') {
          setLinkingStep('connected');
          toast.success('WhatsApp connecté avec succès !');
        }
      } catch { setServerStatus('offline'); }
    };
    check();
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, [linkingStep]);

  useEffect(() => {
    if (tab !== 'qr' || linkingStep !== 'scanning') return;
    const poll = async () => {
      try {
        const res = await fetch(`${WA_SERVER}/qr`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.qr && data.qr !== qrImage) { setQrImage(data.qr); setQrExpired(false); setQrTimer(60); }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [tab, linkingStep, qrImage]);

  useEffect(() => {
    if (linkingStep !== 'scanning') return;
    setQrTimer(60); setQrExpired(false);
    const id = setInterval(() => setQrTimer(t => {
      if (t <= 1) { setQrExpired(true); clearInterval(id); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [linkingStep, qrImage]);

  const handleRequestPairingCode = async () => {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized || normalized.length < 8 || !/^\d+$/.test(normalized)) {
      toast.error('Numéro invalide. Exemple : +212 679218068'); return;
    }
    setPhoneStep('requesting'); setIsLoading(true);
    try {
      const res = await fetch(`${WA_SERVER}/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, sessionId: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      const code = data.code || data.pairingCode;
      if (!code) throw new Error('Aucun code reçu');
      setPairingCode(code); setPhoneStep('code');
      toast.success(`Code généré : ${code}`);
    } catch (err) {
      toast.error(`Erreur : ${err.message}`); setPhoneStep('input');
    } finaly { setIsLoading(false); }
  };

  const handleStartQr = async () => {
    setIsLoading(true);
    try {
      await fetch(`${WA_SERVER}/start`, { method: 'POST' });
      setLinkingStep('scanning'); setQrImage(null);
      toast.info('Génération du QR Code en cours...');
    } catch { toast.error('Serveur non joignable.'); }
    finaly { setIsLoading(false); }
  };

  const handleDisconnect = async () => {
    try { await fetch(`${WA_SERVER}/disconnect`, { method: 'POST' }); } catch {}
    setLinkingStep('disconnected'); setPhoneNumber(''); setPairingCode('');
    setPhoneStep('input'); setQrImage(null); setQrExpired(false);
    toast.success('Déconnecté.');
  };

  const statusBadge = {
    offline:      'bg-red-100 text-red-700',
    unknown:      'bg-slate-100 text-slate-500',
    DISCONNECTED: 'bg-slate-100 text-slate-600',
    INITIALIZING: 'bg-blue-100 text-blue-700',
    QR_READY:     'bg-amber-100 text-amber-700',
    READY:        'bg-green-100 text-green-700',
  }[serverStatus] || 'bg-slate-100 text-slate-500';

  const statusLabel = {
    offline: 'Hors ligne', unknown: 'Vérification...', DISCONNECTED: 'Serveur prêt',
    INITIALIZING: 'Initialisation...', QR_READY: 'QR prêt', READY: 'WhatsApp connecté',
  }[serverStatus] || serverStatus;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-2xl space-y-4">

        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center">
              <WAIcon className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold font-heading text-slate-800">WaLearn Manager</h1>
          </div>
          <p className="text-slate-500 text-sm">Connectez votre WhatsApp au serveur pédagogique</p>
        </div>

        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-700 truncate">{WA_SERVER}</p>
            </div>
            <Badge className={statusBadge}>{statusLabel}</Badge>
            <Badge className={linkingStep === 'connected' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}>
              {linkingStep === 'connected' ? '🟢 Connecté' : '🔴 Déconnecté'}
            </Badge>
          </div>

          {linkingStep !== 'connected' ? (
            <>
              <div className="flex gap-2 border-b border-slate-100 pb-3">
                <button onClick={() => setTab('phone')} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'phone' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                  📱 Numéro de téléphone
                </button>
                <button onClick={() => setTab('qr')} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'qr' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-100')}>
                  📷 QR Code
                </button>
              </div>

              {tab === 'phone' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {[
                      { n: '1', t: 'Serveur Railway actif', d: 'walearn-server-production.up.railway.app', done: serverStatus !== 'offline' },
                      { n: '2', t: 'Entrez votre numéro WhatsApp', d: 'Format international : +212 679218068', done: phoneStep === 'code' },
                      { n: '3', t: 'Entrez le code dans WhatsApp', d: 'Paramètres → Appareils liés → Lier avec numéro', done: false },
                    ].map(s => (
                      <div key={s.n} className={cn('flex items-start gap-3 p-3 rounded-xl border text-sm', s.done ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200')}>
                        <span className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white', s.done ? 'bg-green-500' : 'bg-emerald-500')}>
                          {s.done ? '✓' : s.n}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-700">{s.t}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {phoneStep === 'input' && (
                    <div className="space-y-3">
                      <Input
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        placeholder="+212 679218068"
                        disabled={isLoading}
                        className="text-lg"
                      />
                      <p className="text-xs text-slate-400">Normalisé → <code className="bg-slate-100 px-1 rounded">{normalizePhone(phoneNumber) || '212679218068'}</code></p>
                      <Button onClick={handleRequestPairingCode} disabled={isLoading} className="w-full bg-[#25D366] hover:bg-[#1da851]">
                        {isLoading ? <Spinner className="h-4 w-4" /> : '📲'}
                        {isLoading ? 'Génération...' : 'Recevoir le code WhatsApp'}
                      </Button>
                    </div>
                  )}

                  {phoneStep === 'requesting' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <Spinner className="h-10 w-10 text-[#25D366]" />
                      <p className="text-sm text-slate-500">Connexion au serveur Railway...</p>
                    </div>
                  )}

                  {phoneStep === 'code' && (
                    <div className="space-y-3">
                      <div className="p-5 rounded-xl bg-green-50 border border-green-200 text-center">
                        <p className="text-xs text-green-700 font-semibold mb-2">✅ Code généré pour <strong>+{normalizePhone(phoneNumber)}</strong></p>
                        <div className="text-4xl font-mono font-bold tracking-[0.4em] text-green-800 py-3">{pairingCode}</div>
                        <p className="text-xs text-green-600">WhatsApp → <strong>Paramètres → Appareils liés → Lier avec numéro</strong></p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-xs text-blue-700">⏳ Code valable quelques minutes. Une fois entré, la connexion est automatique.</p>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setPhoneStep('input'); setPairingCode(''); }}>
                        ← Recommencer avec un autre numéro
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'qr' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {linkingStep === 'disconnected' && (
                      <>
                        <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400">
                          📷
                          <p className="text-xs text-center">Cliquez sur "Générer" pour démarrer</p>
                        </div>
                        <Button onClick={handleStartQr} disabled={isLoading} className="bg-[#25D366] hover:bg-[#1da851]">
                          {isLoading ? <Spinner className="h-4 w-4" /> : '📷'} Générer le QR Code
                        </Button>
                      </>
                    )}
                    {linkingStep === 'scanning' && !qrImage && (
                      <div className="w-52 h-52 rounded-2xl border-2 border-emerald-200 flex flex-col items-center justify-center gap-3">
                        <Spinner className="h-10 w-10 text-[#25D366]" />
                        <p className="text-xs text-slate-500">Génération en cours...</p>
                      </div>
                    )}
                    {linkingStep === 'scanning' && qrImage && !qrExpired && (
                      <div className="space-y-2 w-full flex flex-col items-center">
                        <div className="w-52 h-52 rounded-2xl border-2 border-[#25D366] shadow-lg overflow-hidden bg-white">
                          <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-xs text-slate-400">Expire dans <strong className={qrTimer < 15 ? 'text-red-500' : 'text-slate-700'}>{qrTimer}s</strong></p>
                        <div className="w-52 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(qrTimer / 60) * 100}%`, background: qrTimer < 15 ? '#ef4444' : '#25D366' }} />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setQrImage(null); handleStartQr(); }}>🔄 Nouveau QR</Button>
                      </div>
                    )}
                    {qrExpired && (
                      <div className="w-52 h-52 rounded-2xl border-2 border-orange-200 bg-orange-50 flex flex-col items-center justify-center gap-3">
                        <p className="text-orange-500 text-2xl">⚠️</p>
                        <p className="text-sm font-semibold text-orange-600">QR Code expiré</p>
                        <Button size="sm" className="bg-[#25D366] hover:bg-[#1da851]" onClick={() => { setQrExpired(false); handleStartQr(); }}>
                          🔄 Rafraîchir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30">
                <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-2xl">👤</div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">WhatsApp connecté ✅</p>
                  <p className="text-xs text-slate-500">{phoneNumber ? `+${normalizePhone(phoneNumber)}` : 'Via QR Code'} · Statut : {serverStatus}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="text-red-600 border-red-200 hover:bg-red-50">
                  🔌 Déconnecter
                </Button>
              </div>
            </div>
          )}
        </Card>
        <p className="text-center text-xs text-slate-400">WaLearn · Plateforme pédagogique · Serveur Railway actif</p>
      </div>
    </div>
  );
}