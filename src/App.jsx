import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, Copy, Check, Send, Inbox, Loader2 } from 'lucide-react';
import './index.css';

// Em produção, frontend e backend rodam no mesmo servidor
// Em desenvolvimento, o backend fica na porta 3001
const API = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function App() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [clock, setClock] = useState('');
  const [sessionSecs, setSessionSecs] = useState(0);
  const [expiresSecs, setExpiresSecs] = useState(600);
  const [unread, setUnread] = useState(new Set());

  // Tweaks
  const [theme, setTheme] = useState(() => localStorage.getItem('tm_theme') || 'light');
  const [density, setDensity] = useState(() => localStorage.getItem('tm_density') || 'comfortable');
  const [shadows, setShadows] = useState(() => localStorage.getItem('tm_shadows') !== 'off');
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const pollingInterval = useRef(null);
  const currentToken = useRef('');
  const sessionStart = useRef(Date.now());
  const expiresAt = useRef(Date.now() + 10 * 60 * 1000);

  // Apply tweaks to body
  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.density = density;
    document.body.dataset.shadows = shadows ? 'on' : 'off';
    localStorage.setItem('tm_theme', theme);
    localStorage.setItem('tm_density', density);
    localStorage.setItem('tm_shadows', shadows ? 'on' : 'off');
  }, [theme, density, shadows]);

  // Clocks
  useEffect(() => {
    const i = setInterval(() => {
      const now = new Date();
      setClock(now.toISOString().slice(11, 19) + ' UTC');
      setSessionSecs(Math.floor((Date.now() - sessionStart.current) / 1000));
      setExpiresSecs(Math.max(0, Math.floor((expiresAt.current - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const generateEmail = async () => {
    setLoading(true);
    setMessages([]);
    setSelectedMessage(null);
    setUnread(new Set());
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    try {
      const res = await fetch(`${API}/generate`);
      if (!res.ok) throw new Error('Falha ao gerar email');
      const data = await res.json();
      setEmail(data.email);
      setToken(data.token);
      currentToken.current = data.token;
      sessionStart.current = Date.now();
      expiresAt.current = Date.now() + 10 * 60 * 1000;
    } catch (err) {
      console.error('Erro ao gerar email:', err);
      showToast('✕ Erro ao gerar email');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (isBackground = false) => {
    const tok = currentToken.current;
    if (!tok) return;
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch(`${API}/messages?token=${tok}`);
      if (!res.ok) throw new Error('Falha ao buscar mensagens');
      const data = await res.json();
      // Track new unread messages
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        const newOnes = data.filter((m) => !prevIds.has(m.id));
        if (newOnes.length > 0) {
          setUnread((u) => {
            const next = new Set(u);
            newOnes.forEach((m) => next.add(m.id));
            return next;
          });
        }
        return data;
      });
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!isBackground) setRefreshing(false);
    }
  };

  const readMessage = async (id) => {
    if (selectedMessage?.id === id && !selectedMessage?.loading) return;
    setSelectedMessage({ id, loading: true });
    setUnread((u) => {
      const next = new Set(u);
      next.delete(id);
      return next;
    });
    try {
      const res = await fetch(`${API}/message/${id}?token=${currentToken.current}`);
      if (!res.ok) throw new Error('Falha ao ler mensagem');
      const data = await res.json();
      setSelectedMessage(data);
    } catch (err) {
      console.error('Erro ao ler mensagem:', err);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const copyToClipboard = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    showToast('✓ ' + email + ' copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTestEmail = async () => {
    if (!email) return;
    try {
      const res = await fetch(`${API}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email }),
      });
      if (!res.ok) throw new Error('Falha ao enviar email de teste');
      showToast('→ Email de teste enviado');
    } catch (err) {
      console.error('Erro ao enviar email de teste:', err);
      showToast('✕ Erro ao enviar teste');
    }
  };

  useEffect(() => {
    generateEmail();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchMessages(true);
    pollingInterval.current = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(pollingInterval.current);
  }, [token]);

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const r = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const [local, domain] = email ? email.split('@') : ['', ''];

  return (
    <div className="app">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">TM/</span>
          <span className="brand-name">
            TEMPMAIL<sup>v2.4</sup>
          </span>
        </div>
        <div className="topbar-meta">
          <span>
            <span className="status-dot"></span>SERVER ONLINE
          </span>
          <span>{clock}</span>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-kicker">
            <span className="line"></span>
            <span className="kicker-label">Seu endereço descartável / SSL encrypted</span>
          </div>
          <div className="email-display-wrap">
            <div
              className={`email-display ${!email ? 'skeleton' : ''}`}
              onClick={() => email && copyToClipboard()}
            >
              {email ? (
                <>
                  {local}
                  <span className="at">@</span>
                  {domain}
                </>
              ) : (
                'gerando'
              )}
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn primary" onClick={generateEmail} disabled={loading}>
              <RefreshCw size={14} />
              Novo endereço
            </button>
            <button className="btn" onClick={copyToClipboard} disabled={!email}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button className="btn" onClick={sendTestEmail} disabled={!email || loading}>
              <Send size={14} />
              Enviar teste
            </button>
          </div>
        </div>

        <aside className="hero-right">
          <div className="stat">
            <span className="k">Sessão</span> <span className="v">{fmtTime(sessionSecs)}</span>
          </div>
          <div className="stat">
            <span className="k">Expira em</span> <span className="v">{fmtTime(expiresSecs)}</span>
          </div>
          <div className="stat">
            <span className="k">Mensagens</span> <span className="v">{messages.length}</span>
          </div>
          <div className="stat">
            <span className="k">Auto-refresh</span> <span className="v">5s</span>
          </div>
          <div className="stat">
            <span className="k">Domain</span> <span className="v">{domain || '—'}</span>
          </div>
        </aside>
      </section>

      {/* SECTION HEADER */}
      <div className="section-head">
        <h2>
          <span className="idx">§ 01</span>Caixa de entrada
        </h2>
        <div className="meta">
          <span className={`refresh-ping ${refreshing ? 'active' : ''}`}>
            <RefreshCw size={12} />
            {refreshing ? 'atualizando...' : 'auto-sync 5s'}
          </span>
        </div>
      </div>

      {/* MAIN */}
      <main className="main shadow-box">
        <div className="inbox-col">
          <div className="inbox-head">
            <div className="inbox-count">
              <span>{unread.size}</span> não lidos{' '}
              <span className="total">
                / <span>{messages.length}</span> total
              </span>
            </div>
            <span className="kicker-label">ASC</span>
          </div>
          <div className="email-list">
            {messages.length === 0 ? (
              <div className="empty">
                <pre className="ascii">{`   ┌─────────────────────┐
   │                     │
   │      [ vazio ]      │
   │                     │
   │    ╱╱╱╱╱╱╱╱╱╱╱      │
   │    ╱╱    ▓▓   ╱     │
   │   ╱╱   ▓▓▓▓    ╱    │
   │    ╱╱╱╱╱╱╱╱╱╱       │
   │                     │
   └─────────────────────┘`}</pre>
                <span className="kicker-label">— aguardando mensagens —</span>
                <p>
                  Envie emails para o endereço acima. Novas mensagens aparecem aqui automaticamente
                  a cada 5 segundos.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const idx = String(messages.length - i).padStart(2, '0');
                const time = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const senderAddr = msg.from?.address || msg.from || '';
                const senderName = msg.from?.name || senderAddr;
                const isActive = selectedMessage?.id === msg.id;
                const isUnread = unread.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`email-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                    onClick={() => readMessage(msg.id)}
                  >
                    <div className="idx">#{idx}</div>
                    <div className="top-row">
                      <span className="sender">{senderName}</span>
                      <span className="time">{time}</span>
                    </div>
                    <div className="subject">{msg.subject || '(Sem assunto)'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="reader-col">
          {selectedMessage ? (
            selectedMessage.loading ? (
              <div className="empty">
                <Loader2 size={28} className="spin" />
                <span className="kicker-label">carregando mensagem...</span>
              </div>
            ) : (
              <>
                <div className="reader-head">
                  <div className="reader-subject">{selectedMessage.subject || '(Sem assunto)'}</div>
                  <div className="reader-meta">
                    <span className="k">De</span>
                    <span className="v">
                      {selectedMessage.from?.name || ''}{' '}
                      &lt;{selectedMessage.from?.address || selectedMessage.from}&gt;
                    </span>
                    <span className="k">Para</span>
                    <span className="v mono">{email}</span>
                    <span className="k">Data</span>
                    <span className="v mono">
                      {selectedMessage.createdAt
                        ? new Date(selectedMessage.createdAt).toLocaleString('pt-BR')
                        : ''}
                    </span>
                    <span className="k">ID</span>
                    <span className="v mono">{selectedMessage.id}</span>
                  </div>
                </div>
                <div className="reader-body">
                  {selectedMessage.html?.length > 0 ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedMessage.html.join('') }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{selectedMessage.text}</div>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="empty">
              <pre className="ascii">{`         ┌───────────┐
         │   ░ ░ ░   │
         │  ░     ░  │
       ══╡   MAIL    ╞══
         │  ░     ░  │
         │   ░ ░ ░   │
         └─────╥─────┘
              ╱ ╲
             ╱   ╲
            ╱     ╲
           └───────┘`}</pre>
              <span className="kicker-label">— selecione uma mensagem —</span>
              <p>Clique em qualquer item da caixa de entrada para ler seu conteúdo aqui.</p>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="left">
          <span>© TEMPMAIL / 2026</span>
          <span>FOSS</span>
        </div>
        <div className="right">
          <a href="#">Docs</a>
          <a href="#">API</a>
          <a href="#">GitHub</a>
          <span>SYS:OK</span>
        </div>
      </footer>

      {/* TWEAKS */}
      {!tweaksOpen && (
        <button className="tweaks-toggle" onClick={() => setTweaksOpen(true)} title="Tweaks">
          ⚙
        </button>
      )}
      {tweaksOpen && (
        <div className={`tweaks-panel ${shadows ? 'shadows-on' : ''}`}>
          <div className="tweaks-head">
            <span>// Tweaks</span>
            <button
              style={{
                background: 'transparent',
                border: 0,
                color: 'var(--paper)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
              }}
              onClick={() => setTweaksOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="tweaks-body">
            <div className="tweak-row">
              <span className="kicker-label">Tema</span>
              <div className="segmented">
                <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
                  Claro
                </button>
                <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
                  Escuro
                </button>
              </div>
            </div>
            <div className="tweak-row">
              <span className="kicker-label">Densidade</span>
              <div className="segmented">
                <button
                  className={density === 'compact' ? 'active' : ''}
                  onClick={() => setDensity('compact')}
                >
                  Compacto
                </button>
                <button
                  className={density === 'comfortable' ? 'active' : ''}
                  onClick={() => setDensity('comfortable')}
                >
                  Confortável
                </button>
              </div>
            </div>
            <div className="tweak-row">
              <span className="kicker-label">Offset Shadows</span>
              <div className="segmented">
                <button className={shadows ? 'active' : ''} onClick={() => setShadows(true)}>
                  On
                </button>
                <button className={!shadows ? 'active' : ''} onClick={() => setShadows(false)}>
                  Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
}

export default App;
