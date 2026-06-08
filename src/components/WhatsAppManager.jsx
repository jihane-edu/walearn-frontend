import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Send, Calendar, Smartphone, Bot, Clock, CheckCircle2, Plus, Eye, QrCode, Wifi, WifiOff, Shield, Settings, Users, Bell, RefreshCw, ChevronRight, Lock, Zap, ToggleLeft, ToggleRight, Phone, Trash2, AlertTriangle, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MobilePreview from '@/components/teacher/MobilePreview';

// ─── URL permanente du serveur Railway ───────────────────────────────────────
const WA_SERVER = 'https://walearn-server-production.up.railway.app';

// ─── WhatsApp Web Integration Component ──────────────────────────────────────
function WhatsAppWebIntegration() {
  const [linkingStep, setLinkingStep] = useState('disconnected');
  const [serverStatus, setServerStatus] = useState('unknown');
  const [qrImage, setQrImage] = useState(null);
  const [qrTimer, setQrTimer] = useState(60);
  const [qrExpired, setQrExpired] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [schedulingEnabled, setSchedulingEnabled] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [phoneStep, setPhoneStep] = useState('input');
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl] = useState(WA_SERVER);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  const isUrlReady = true;

  // Polling statut serveur
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${serverUrl}/status`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) { setServerStatus('offline'); return; }
        const data = await res.json();
        setServerStatus(data.status);
        if (data.status === 'READY' && linkingStep !== 'connected') {
          setLinkingStep('connected');
          toast.success('WhatsApp connecté avec succès !');
        }
      } catch {
        setServerStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [serverUrl, linkingStep]);

  // QR Timer countdown
  useEffect(() => {
    if (linkingStep !== 'scanning') return;
    setQrTimer(60);
    setQrExpired(false);
    const interval = setInterval(() => {
      setQrTimer(t => {
        if (t <= 1) { clearInterval(interval); setQrExpired(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [linkingStep, qrImage]);

  // Polling QR code
  useEffect(() => {
    if (linkingStep !== 'scanning') return;
    const poll = async () => {
      try {
        const res = await fetch(`${serverUrl}/qr`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return;
        const data = await res.json();
        if (data.qr && data.qr !== qrImage) {
          setQrImage(data.qr);
          setQrExpired(false);
          setQrTimer(60);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [linkingStep, serverUrl, qrImage]);

  const handleStartServer = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${serverUrl}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Serveur non joignable');
      setLinkingStep('scanning');
      setQrImage(null);
      toast.info('Génération du QR Code en cours...');
    } catch {
      toast.error(`Impossible de joindre le serveur.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setQrExpired(false);
    setQrTimer(60);
    setQrImage(null);
    try { await fetch(`${serverUrl}/start`, { method: 'POST' }); } catch {}
  };

  const normalizePhone = (raw) => raw.replace(/[\s\-\+\(\)]/g, '');

  // ── Demande le Pairing Code au serveur Railway ────────────────
  const handleRequestPairingCode = async () => {
    const normalized = normalizePhone(phoneNumber);
    if (!normalized || normalized.length < 8 || !/^\d+$/.test(normalized)) {
      toast.error('Numéro invalide. Exemple : +212 679218068');
      return;
    }
    setPhoneNumber(normalized);
    setPhoneStep('requesting');
    setIsLoading(true);

    try {
      const res = await fetch('https://walearn-server-production.up.railway.app/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, sessionId: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur Railway');
      const code = data.code || data.pairingCode;
      if (!code) throw new Error('Aucun code reçu du serveur');
      setPairingCode(code);
      setPhoneStep('code');
      toast.success(`Code généré : ${code} — Vérifiez votre WhatsApp !`);
    } catch (err) {
      toast.error(`Erreur : ${err.message}`);
      setPhoneStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try { await fetch(`${serverUrl}/disconnect`, { method: 'POST' }); } catch {}
    setLinkingStep('disconnected');
    setPhoneNumber('');
    setPairingCode('');
    setPhoneStep('input');
    setQrImage(null);
    setQrExpired(false);
    toast.success('Déconnecté.');
  };

  const groups = [
    { name: 'Classe CM2 - Maths', members: 28, lastActivity: 'il y a 2h', active: true },
    { name: 'Classe CM2 - Français', members: 28, lastActivity: 'il y a 5h', active: true },
    { name: 'Parents CM2', members: 31, lastActivity: 'hier', active: false },
    { name: 'Soutien Scolaire', members: 12, lastActivity: 'il y a 3j', active: false },
  ];

  const serverBadge = {
    offline:      { color: 'bg-red-100 text-red-700', label: 'Serveur hors ligne' },
    unknown:      { color: 'bg-gray-100 text-gray-600', label: 'Vérification...' },
    DISCONNECTED: { color: 'bg-gray-100 text-gray-600', label: 'Serveur prêt' },
    INITIALIZING: { color: 'bg-blue-100 text-blue-700', label: 'Initialisation...' },
    QR_READY:     { color: 'bg-amber-100 text-amber-700', label: 'QR Code disponible' },
    READY:        { color: 'bg-green-100 text-green-700', label: 'WhatsApp connecté' },
  }[serverStatus] || { color: 'bg-gray-100 text-gray-600', label: serverStatus };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b flex-wrap gap-y-2">
        <div className="h-11 w-11 rounded-2xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-lg">Intégration WhatsApp Web</h2>
          <p className="text-xs text-muted-foreground">Mode réel — Serveur Railway permanent</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-xs ${serverBadge.color}`}>{serverBadge.label}</Badge>
          {linkingStep === 'connected' ? (
            <Badge className="bg-green-100 text-green-700 border-green-300"><Wifi className="h-3 w-3 mr-1" />Connecté</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 border-red-300"><WifiOff className="h-3 w-3 mr-1" />Déconnecté</Badge>
          )}
        </div>
      </div>

      {/* Server status banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl border bg-green-50 border-green-300 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
        <span className="font-medium text-green-700">Serveur Railway actif :</span>
        <span className="font-mono text-green-800 truncate">{serverUrl}</span>
        <Badge className="bg-green-100 text-green-700 ml-auto shrink-0">Multi-Session</Badge>
      </div>

      {linkingStep !== 'connected' ? (
        <div className="space-y-5">
          <div className="flex gap-2 flex-wrap">
            {!isMobile && (
              <Button
                variant={linkingStep === 'scanning' || linkingStep === 'disconnected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setLinkingStep('disconnected'); setPhoneStep('input'); }}
                className="gap-2"
              >
                <QrCode className="h-4 w-4" />QR Code (Bureau)
              </Button>
            )}
            <Button
              variant={linkingStep === 'phone' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setLinkingStep('phone'); setPhoneStep('input'); }}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />Numéro de téléphone
            </Button>
          </div>

          {linkingStep === 'phone' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <h3 className="font-heading font-semibold">Connexion via numéro WhatsApp</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Serveur Railway actif', desc: 'walearn-server-production.up.railway.app', done: serverStatus !== 'offline' },
                    { step: '2', title: 'Entrez votre numéro WhatsApp', desc: 'Format: +212 679218068', done: phoneStep === 'code' || phoneStep === 'requesting' },
                    { step: '3', title: 'Entrez le code dans WhatsApp', desc: 'Paramètres → Appareils liés → Lier avec numéro', done: false },
                  ].map(item => (
                    <div key={item.step} className={`flex items-start gap-3 p-3 rounded-xl border ${item.done ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${item.done ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                        {item.done ? '✓' : item.step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {phoneStep === 'input' && (
                  <div className="space-y-3">
                    <Label>Numéro WhatsApp (format international)</Label>
                    <Input
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+212 679218068"
                      className="text-lg"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Normalisé → <code>{normalizePhone(phoneNumber) || '212679218068'}</code></p>
                    <Button
                      onClick={handleRequestPairingCode}
                      disabled={isLoading}
                      className="w-full bg-[#25D366] hover:bg-[#1da851] text-white"
                    >
                      {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                      {isLoading ? 'Génération du code...' : 'Recevoir le code WhatsApp'}
                    </Button>
                  </div>
                )}
                {phoneStep === 'requesting' && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <RefreshCw className="h-10 w-10 text-[#25D366] animate-spin" />
                    <p className="text-sm text-center text-muted-foreground">Connexion au serveur Railway...</p>
                  </div>
                )}
                {phoneStep === 'code' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center space-y-2">
                      <p className="text-xs text-green-700 font-semibold">✅ Code généré pour <strong>{phoneNumber}</strong></p>
                      <div className="text-3xl font-mono font-bold tracking-[0.3em] text-green-800 py-2">{pairingCode}</div>
                      <p className="text-xs text-green-700">WhatsApp → <strong>Appareils liés → Lier avec numéro de téléphone</strong></p>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setPhoneStep('input'); setPairingCode(''); }}>
                      ← Recommencer avec un autre numéro
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <h3 className="font-heading font-semibold">Liaison QR Code — Bureau</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Serveur Railway actif', desc: 'walearn-server-production.up.railway.app', done: serverStatus !== 'offline' },
                    { step: '2', title: 'Cliquez sur Générer', desc: 'Le QR Code WhatsApp apparaît ici', done: linkingStep === 'scanning' },
                    { step: '3', title: 'Scannez avec WhatsApp', desc: 'Paramètres → Appareils liés → Lier un appareil', done: false },
                  ].map(item => (
                    <div key={item.step} className={`flex items-start gap-3 p-3 rounded-xl border ${item.done ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${item.done ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                        {item.done ? '✓' : item.step}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {linkingStep === 'disconnected' && (
                    <Button onClick={handleStartServer} disabled={isLoading} className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white font-heading">
                      {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                      Générer le QR Code
                    </Button>
                  )}
                  {linkingStep === 'scanning' && (
                    <Button onClick={handleRefreshQr} variant="outline" className="flex-1 gap-2">
                      <RefreshCw className="h-4 w-4" />Nouveau QR Code
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                {linkingStep === 'disconnected' ? (
                  <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 bg-muted/30">
                    <QrCode className="h-16 w-16 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground text-center px-4">Cliquez sur "Générer le QR Code"</p>
                  </div>
                ) : !qrImage ? (
                  <div className="w-52 h-52 rounded-2xl border-2 border-[#25D366]/40 flex flex-col items-center justify-center gap-3 bg-muted/20">
                    <RefreshCw className="h-10 w-10 text-[#25D366] animate-spin" />
                    <p className="text-xs text-muted-foreground text-center">Génération du QR Code...</p>
                  </div>
                ) : qrExpired ? (
                  <div className="w-52 h-52 rounded-2xl border-2 border-orange-300 flex flex-col items-center justify-center gap-3 bg-orange-50">
                    <AlertTriangle className="h-10 w-10 text-orange-400" />
                    <p className="text-xs text-orange-600 text-center font-semibold">QR Code expiré</p>
                    <Button size="sm" onClick={handleRefreshQr} className="bg-[#25D366] hover:bg-[#1da851] text-white">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />Rafraîchir
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-52 h-52 rounded-2xl border-2 border-[#25D366] shadow-lg overflow-hidden bg-white">
                      <img src={qrImage} alt="QR Code WhatsApp" className="w-full h-full object-contain" />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Expire dans <strong className={qrTimer < 15 ? 'text-red-500' : ''}>{qrTimer}s</strong></p>
                      <Button variant="ghost" size="sm" onClick={handleRefreshQr} className="h-6 px-2 text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />Nouveau
                      </Button>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(qrTimer / 60) * 100}%`, backgroundColor: qrTimer < 15 ? '#ef4444' : '#25D366' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30">
            <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold text-lg">👤</div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Compte WhatsApp lié ✅</p>
              <p className="text-xs text-muted-foreground">{phoneNumber ? `+${phoneNumber}` : 'Via QR Code'} · Statut : {serverStatus}</p>
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleDisconnect}>
              <WifiOff className="h-3.5 w-3.5 mr-1" />Déconnecter
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Groupes gérés', value: '4', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Send, label: 'Messages envoyés', value: '127', color: 'text-green-500', bg: 'bg-green-50' },
              { icon: Bell, label: 'Rappels actifs', value: '3', color: 'text-yellow-500', bg: 'bg-yellow-50' },
              { icon: Zap, label: 'Réponses auto', value: '89', color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map(stat => (
              <Card key={stat.label} className="p-3 text-center">
                <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="font-bold text-xl">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState({ content: '', group_name: '', status: 'draft', scheduled_date: '' });
  const [previewContent, setPreviewContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['wa-posts'],
    queryFn: () => base44.entities.WhatsAppPost.filter({ teacher_id: user?.id }, '-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WhatsAppPost.create({ ...data, teacher_id: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wa-posts'] });
      setNewPost({ content: '', group_name: '', status: 'draft', scheduled_date: '' });
      toast.success('Publication créée !');
    },
  });

  const statusColors = { draft: 'bg-muted text-muted-foreground', scheduled: 'bg-amber-100 text-amber-700', sent: 'bg-green-100 text-green-700' };
  const statusLabels = { draft: 'Brouillon', scheduled: 'Planifié', sent: 'Envoyé' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl">Gestion WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Organisez et planifiez vos publications avec simulation mobile</p>
      </div>

      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList className="bg-muted flex-wrap h-auto gap-1">
          <TabsTrigger value="integration" className="font-heading"><QrCode className="h-4 w-4 mr-2" />Intégration Web</TabsTrigger>
          <TabsTrigger value="compose" className="font-heading"><Send className="h-4 w-4 mr-2" />Composer</TabsTrigger>
          <TabsTrigger value="scheduled" className="font-heading"><Calendar className="h-4 w-4 mr-2" />Planifié</TabsTrigger>
          <TabsTrigger value="bot" className="font-heading"><Bot className="h-4 w-4 mr-2" />WhatsApp Bot</TabsTrigger>
        </TabsList>

        <TabsContent value="integration">
          <Card className="p-6"><WhatsAppWebIntegration /></Card>
        </TabsContent>

        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-5">
              <h2 className="font-heading font-semibold text-lg">Nouvelle Publication</h2>
              <div>
                <Label>Nom du Groupe</Label>
                <Input value={newPost.group_name} onChange={e => setNewPost(p => ({ ...p, group_name: e.target.value }))} placeholder="Groupe CM2 - Maths" className="mt-1.5" />
              </div>
              <div>
                <Label>Contenu du Message</Label>
                <Textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} placeholder="Tapez votre message ici... Utilisez des emojis 🎯📚" className="mt-1.5 min-h-[200px]" />
              </div>
              <div>
                <Label>Planification (optionnel)</Label>
                <Input type="datetime-local" value={newPost.scheduled_date} onChange={e => setNewPost(p => ({ ...p, scheduled_date: e.target.value, status: e.target.value ? 'scheduled' : 'draft' }))} className="mt-1.5" />
              </div>
              <div className="flex gap-3">
                <Button onClick={() => createMutation.mutate(newPost)} disabled={!newPost.content || createMutation.isPending} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />{newPost.scheduled_date ? 'Planifier' : 'Sauvegarder'}
                </Button>
                <Button variant="outline" onClick={() => { setPreviewContent(newPost.content); setShowPreview(true); }} disabled={!newPost.content}>
                  <Smartphone className="h-4 w-4 mr-2" />Prévisualiser
                </Button>
              </div>
            </Card>
            <div className="flex justify-center">
              <MobilePreview content={showPreview ? previewContent : newPost.content} groupName={newPost.group_name || 'Groupe Classe'} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="p-4 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{post.group_name || 'Groupe'}</p>
                    <Badge className={`text-xs ${statusColors[post.status]}`}>{statusLabels[post.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                  {post.scheduled_date && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.scheduled_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>
              </Card>
            ))}
            {posts.length === 0 && (
              <Card className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune publication planifiée</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bot">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Bot className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-lg">WhatsApp Bot Intelligent</h2>
                <p className="text-sm text-muted-foreground">Correction automatique et feedback motivant</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                💡 Le WhatsApp Bot fonctionne en arrière-plan. Configurez vos exercices dans l'onglet "Composer" et le bot corrigera les réponses automatiquement.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}