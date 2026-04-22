import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, Copy, Check, Inbox, Loader2 } from 'lucide-react';
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

  const pollingInterval = useRef(null);
  const currentToken = useRef('');

  const generateEmail = async () => {
    setLoading(true);
    setMessages([]);
    setSelectedMessage(null);
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    try {
      const res = await fetch(`${API}/generate`);
      if (!res.ok) throw new Error('Falha ao gerar email');
      const data = await res.json();
      setEmail(data.email);
      setToken(data.token);
      currentToken.current = data.token;
    } catch (err) {
      console.error('Erro ao gerar email:', err);
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
      setMessages(data);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      if (!isBackground) setRefreshing(false);
    }
  };

  const readMessage = async (id) => {
    if (selectedMessage?.id === id && !selectedMessage?.loading) return;
    setSelectedMessage({ id, loading: true });
    try {
      const res = await fetch(`${API}/message/${id}?token=${currentToken.current}`);
      if (!res.ok) throw new Error('Falha ao ler mensagem');
      const data = await res.json();
      setSelectedMessage(data);
    } catch (err) {
      console.error('Erro ao ler mensagem:', err);
    }
  };

  const copyToClipboard = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendTestEmail = async () => {
    if (!email) return;
    try {
      const res = await fetch(`${API}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email })
      });
      if (!res.ok) throw new Error('Falha ao enviar email de teste');
      alert('Email de teste enviado com sucesso! Aguarde alguns segundos na Caixa de Entrada.');
    } catch (err) {
      console.error('Erro ao enviar email de teste:', err);
      alert('Erro ao enviar email de teste. Verifique o console.');
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

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      <div className="glass-container header-section">
        <div className="logo-area">
          <Mail size={28} color="var(--accent-color)" />
          <span>TempMail Pro</span>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Seu endereço de email temporário e seguro
        </p>
        <div className="email-display">
          <input
            type="text"
            className="email-input"
            value={email}
            readOnly
            placeholder={loading ? 'Gerando...' : 'Aguardando...'}
          />
          <button className="btn-icon" onClick={copyToClipboard} title="Copiar" disabled={!email}>
            {copied ? <Check size={20} color="green" /> : <Copy size={20} />}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={generateEmail} disabled={loading}>
            <RefreshCw size={18} />
            Novo Email
          </button>
          <button 
            className="btn-primary" 
            onClick={sendTestEmail} 
            disabled={!email || loading}
            style={{ background: 'var(--text-primary)', color: 'white' }}
            title="Envia um email de teste real para esta caixa"
          >
            <Mail size={18} />
            Enviar Teste
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="glass-container inbox-section">
          <div className="inbox-header">
            <div className="inbox-title">
              <Inbox size={20} />
              Caixa de Entrada
            </div>
            <div className="refresh-indicator">
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              <span>Auto atualiza...</span>
            </div>
          </div>

          <div className="email-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <Inbox size={48} opacity={0.2} />
                <p>Nenhum email recebido ainda.<br />Aguardando mensagens...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`email-item ${selectedMessage?.id === msg.id ? 'active' : ''}`}
                  onClick={() => readMessage(msg.id)}
                >
                  <div className="email-item-header">
                    <span className="email-sender">{msg.from?.address || msg.from}</span>
                    <span className="email-time">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                  <div className="email-subject">{msg.subject || '(Sem assunto)'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="reader-section">
          {selectedMessage ? (
            selectedMessage.loading ? (
              <div className="empty-state">
                <Loader2 size={32} className="spin" color="var(--accent-color)" />
                <p>Carregando mensagem...</p>
              </div>
            ) : (
              <>
                <div className="reader-header">
                  <div className="reader-subject">{selectedMessage.subject || '(Sem assunto)'}</div>
                  <div className="reader-meta">
                    <span><strong>De:</strong> {selectedMessage.from?.address || selectedMessage.from}</span>
                    <span>
                      {selectedMessage.createdAt
                        ? new Date(selectedMessage.createdAt).toLocaleString()
                        : ''}
                    </span>
                  </div>
                </div>
                <div className="reader-body">
                  {selectedMessage.html?.length > 0
                    ? <div dangerouslySetInnerHTML={{ __html: selectedMessage.html.join('') }} />
                    : <div style={{ whiteSpace: 'pre-wrap' }}>{selectedMessage.text}</div>}
                </div>
              </>
            )
          ) : (
            <div className="empty-state">
              <Mail size={64} opacity={0.1} />
              <p>Selecione uma mensagem<br />para ler.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
