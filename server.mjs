import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const BASE = 'https://api.mail.tm';

app.use(cors());
app.use(express.json());

// Transporter do Nodemailer usando o Gmail do usuário
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'lucassps.civil@gmail.com',
    pass: 'cuce azxd lrgw bguh'
  }
});

// Endpoint para disparar o email de teste
app.post('/api/test-email', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Destinatário ausente' });

  try {
    const info = await transporter.sendMail({
      from: '"TempMail Tester" <lucassps.civil@gmail.com>',
      to: to,
      subject: 'Teste de Recebimento TempMail Pro 🚀',
      text: 'Olá!\n\nSe você está lendo isso, o sistema de email temporário e a comunicação com a API estão funcionando perfeitamente.\n\nContinue o ótimo trabalho!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Teste de Recebimento TempMail Pro 🚀</h2>
          <p>Olá!</p>
          <p>Se você está lendo isso, o sistema de email temporário e a comunicação com a API estão <strong>funcionando perfeitamente</strong>.</p>
          <p>Continue o ótimo trabalho!</p>
          <br/>
          <small style="color: #888;">Mensagem automatizada gerada pelo seu app.</small>
        </div>
      `
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    res.status(500).json({ error: 'Falha ao enviar o email' });
  }
});

// Serve os arquivos estáticos do React (build de produção)
app.use(express.static(path.join(__dirname, 'dist')));

// Gera um endereço de email temporário
app.get('/api/generate', async (req, res) => {
  try {
    // 1. Busca domínios disponíveis
    const domainsRes = await fetch(`${BASE}/domains?page=1`, {
      headers: { 'Accept': 'application/json' }
    });
    const domainsData = await domainsRes.json();

    // API retorna array direto ou objeto com hydra:member
    const domainList = Array.isArray(domainsData) ? domainsData : (domainsData['hydra:member'] || []);
    if (domainList.length === 0) throw new Error('Nenhum domínio disponível');
    const domain = domainList[0].domain;

    // 2. Cria uma conta com senha aleatória
    const login = 'user' + Math.random().toString(36).substring(2, 10);
    const password = 'Pass' + Math.random().toString(36).substring(2, 12) + '!';
    const email = `${login}@${domain}`;

    const createRes = await fetch(`${BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ address: email, password }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData['hydra:description'] || 'Erro ao criar conta');

    // 3. Faz login e pega o token JWT
    const tokenRes = await fetch(`${BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ address: email, password }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.token) throw new Error('Erro ao obter token');

    res.json({ email, token: tokenData.token });
  } catch (err) {
    console.error('Erro ao gerar email:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Busca mensagens da caixa de entrada
app.get('/api/messages', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token ausente' });

  try {
    const response = await fetch(`${BASE}/messages?page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    // API retorna array direto ou objeto com hydra:member
    const list = Array.isArray(data) ? data : (data['hydra:member'] || []);
    res.json(list);
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lê uma mensagem específica
app.get('/api/message/:id', async (req, res) => {
  const { token } = req.query;
  const { id } = req.params;
  if (!token) return res.status(400).json({ error: 'Token ausente' });

  try {
    const response = await fetch(`${BASE}/messages/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Erro ao ler mensagem:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all: qualquer rota não-API retorna o index.html do React
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`);
});
