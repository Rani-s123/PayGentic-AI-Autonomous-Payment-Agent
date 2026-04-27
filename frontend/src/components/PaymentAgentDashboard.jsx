import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Zap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Shield: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Activity: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Wallet: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>,
};

export default function PaymentAgentDashboard() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'agent', text: "Systems online. I am PayGentic AI v2.0. How can I assist with your Locus payment workflows today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalRevenue: '$0', transactions: 0, successRate: 0, fraud: 0 });
  const [transactions, setTransactions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [nodeStatus, setNodeStatus] = useState('Disconnected');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [automations, setAutomations] = useState([
    { id: 1, name: 'AI Fraud Shield', desc: 'Auto-blocks suspicious high-velocity IPs.', status: 'Active' },
    { id: 2, name: 'Smart Liquidity', desc: 'Auto-settle Locus funds every 4 hours.', status: 'Active' },
    { id: 3, name: 'Rate Optimizer', desc: 'Automatically switch routing between UPI/Card.', status: 'Standby' },
    { id: 4, name: 'Webhook Relay', desc: 'Forward payment events to your main server.', status: 'Active' }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const fetchData = async () => {
    try {
      const [s, h] = await Promise.all([
        axios.get(`${API_URL}/payments/stats`),
        axios.get(`${API_URL}/payments/history`)
      ]);
      setStats(s.data.stats);
      setTransactions(h.data.transactions);
    } catch (e) { console.error("Sync Error"); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const savedInput = input;
    setInput('');
    setLoading(true);

    try {
      const r = await axios.post(`${API_URL}/agent/chat`, { message: savedInput });
      
      if (r.data.action === 'process_payment') {
        setShowScanner(true);
        setTimeout(() => {
          setShowScanner(false);
          setMessages(prev => [...prev, { id: Date.now() + 1, type: 'agent', text: r.data.response, suggestedActions: r.data.suggestedActions }]);
          fetchData();
        }, 2500);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, type: 'agent', text: r.data.response, suggestedActions: r.data.suggestedActions }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'agent', text: "Terminal Error: Connection to Locus Node failed." }]);
    } finally { setLoading(false); }
  };

  const connectNode = () => {
    if (nodeStatus === 'Connected') {
      console.log("Disconnecting Node...");
      setNodeStatus('Disconnected');
      setMessages(prev => [...prev, { id: Date.now(), type: 'agent', text: "🔌 Locus Node disconnected. Systems offline." }]);
      return;
    }
    
    console.log("Connecting Node...");
    setNodeStatus('Connecting...');
    setTimeout(() => {
      setNodeStatus('Connected');
      setMessages(prev => [...prev, { id: Date.now(), type: 'agent', text: "📡 Locus Node successfully synchronized. Secure tunnel established." }]);
    }, 2000);
  };

  const exportCSV = () => {
    if (transactions.length === 0) return alert('No ledger entries to export!');
    const headers = 'Transaction ID,Amount,Currency,Method,Status,Timestamp\n';
    const rows = transactions.map(t => `${t.id},${t.details?.amount},USD,${t.details?.method},SUCCESS,${t.details?.timestamp}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paygentic_ledger_${Date.now()}.csv`;
    a.click();
  };

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => 
      a.id === id ? { ...a, status: a.status === 'Active' ? 'Standby' : 'Active' } : a
    ));
  };

  return (
    <div className="app-container">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className={`nav-icon ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Icons.Dashboard /></div>
        <div className={`nav-icon ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}><Icons.Wallet /></div>
        <div className={`nav-icon ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><Icons.Shield /></div>
        <div className={`nav-icon ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}><Icons.Activity /></div>
        <div style={{ marginTop: 'auto' }} className={`nav-icon ${activeTab === 'automations' ? 'active' : ''}`} onClick={() => setActiveTab('automations')}><Icons.Zap /></div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main-viewport">
        {activeTab === 'dashboard' ? (
          <>
            <header className="dashboard-header">
              <div className="welcome-text">
                <h1>PayGentic <span style={{ color: '#38bdf8' }}>Command Center</span></h1>
                <p>Welcome back. All systems are operational.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowDocs(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>API DOCS</button>
                <button onClick={connectNode} style={{ background: nodeStatus === 'Connected' ? 'rgba(239, 68, 68, 0.15)' : nodeStatus === 'Connecting...' ? 'rgba(245, 158, 11, 0.15)' : '#38bdf8', border: nodeStatus === 'Connected' ? '1px solid #ef4444' : 'none', color: nodeStatus === 'Connected' ? '#ef4444' : nodeStatus === 'Connecting...' ? '#f59e0b' : '#030712', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.3s' }}>
                  {nodeStatus === 'Connected' ? 'DISCONNECT' : nodeStatus === 'Disconnected' ? 'CONNECT NODE' : 'CONNECTING...'}
                </button>
              </div>
            </header>

            {/* STATS GRID */}
            <div className="grid-stats">
              {[
                { label: 'Revenue', value: stats.totalRevenue, color: '#6366f1', icon: <Icons.Wallet /> },
                { label: 'Success', value: `${stats.successRate}%`, color: '#10b981', icon: <Icons.Zap /> },
                { label: 'Node Status', value: nodeStatus, color: '#38bdf8', icon: <Icons.Shield /> },
                { label: 'Threats', value: stats.fraud, color: '#ec4899', icon: <Icons.Activity /> }
              ].map((item, i) => (
                <div key={i} className="glass-card">
                  <div className="card-icon" style={{ background: `${item.color}15`, color: item.color }}>{item.icon}</div>
                  <div className="card-label">{item.label}</div>
                  <div className="card-value">{item.value}</div>
                  <div className="card-trend trend-up">
                    <span>↑ 12%</span>
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>vs last week</span>
                  </div>
                </div>
              ))}
            </div>

            {/* CHAT WINDOW */}
            <div className="chat-window">
              <div className="chat-head">
                <div className="agent-status">
                  <div className="avatar-ring">
                    <div className="placeholder" style={{ position: 'relative' }}>
                      🤖
                      <div className="status-indicator"></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>PayGentic Neural Agent</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Locus API v3.4.1 Connected</div>
                  </div>
                </div>
              </div>

              <div className="messages-area">
                {messages.map(m => (
                  <div key={m.id} className={`bubble ${m.type}`}>
                    {m.text}
                    {m.suggestedActions && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {m.suggestedActions.map((a, i) => (
                          <button key={i} onClick={() => setInput(a)} style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>{a}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && <div className="bubble agent">Terminal typing...</div>}
                <div ref={messagesEndRef} />
              </div>

              <form className="input-bar" onSubmit={handleSend}>
                <input 
                  className="futuristic-input" 
                  placeholder="Enter command (e.g. 'Process $100 via UPI')..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                />
                <button className="btn-send" type="submit" disabled={loading || !input.trim()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>
          </>
        ) : activeTab === 'wallet' ? (
          <div className="glass-card" style={{ height: '100%', padding: '40px' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '32px' }}>Financial <span style={{ color: '#38bdf8' }}>Vault</span></h2>
            <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '40px' }}>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="card-label">Primary Balance</div>
                <div className="card-value" style={{ color: '#38bdf8' }}>{stats.totalRevenue}</div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>● Secured by Locus</div>
              </div>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="card-label">Pending Settlements</div>
                <div className="card-value">$420.00</div>
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>⏱ 24h ETA</div>
              </div>
              <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="card-label">Active Nodes</div>
                <div className="card-value">12</div>
                <div style={{ fontSize: '12px', color: '#6366f1' }}>Global Coverage</div>
              </div>
            </div>
            <h3 style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>Connected Methods</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              {['UPI (Standard)', 'Visa/Mastercard', 'Locus Direct'].map((m, i) => (
                <div key={i} style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                  <div style={{ fontWeight: '800' }}>{m}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Active • Secure</div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'security' ? (
          <div className="glass-card" style={{ height: '100%', padding: '40px' }}>
             <h2 style={{ fontSize: '28px', marginBottom: '32px' }}>Security <span style={{ color: '#ef4444' }}>Protocol</span></h2>
             <div style={{ display: 'flex', gap: '32px' }}>
                <div className="glass-card" style={{ flex: 1, textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }}>98%</div>
                  <div className="card-label">Safety Score</div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>Your Locus account is highly secure.</p>
                </div>
                <div style={{ flex: 2 }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '14px', color: '#94a3b8' }}>Live Threat Mitigation</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { type: 'Velocity Attack', status: 'BLOCKED', time: '2m ago' },
                      { type: 'Proxy Injection', status: 'BLOCKED', time: '14m ago' },
                      { type: 'Unauthorized Node', status: 'MITIGATED', time: '1h ago' }
                    ].map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '13px' }}>{t.type}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.time}</div>
                        </div>
                        <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '10px' }}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        ) : activeTab === 'activity' ? (
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '24px' }}>Global <span style={{ color: '#38bdf8' }}>Activity Ledger</span></h2>
              <button onClick={exportCSV} style={{ background: '#38bdf8', border: 'none', color: '#030712', padding: '8px 16px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>EXPORT LEDGER</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0f172a', borderBottom: '1px solid var(--glass-border)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '16px 32px', color: '#94a3b8' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '16px', color: '#94a3b8' }}>METHOD</th>
                    <th style={{ textAlign: 'left', padding: '16px', color: '#94a3b8' }}>STATUS</th>
                    <th style={{ textAlign: 'right', padding: '16px 32px', color: '#94a3b8' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px 32px', fontFamily: 'monospace', color: '#94a3b8' }}>{t.id}</td>
                      <td style={{ padding: '16px', fontWeight: '700' }}>{t.details?.method}</td>
                      <td style={{ padding: '16px' }}><span style={{ color: '#10b981', fontWeight: '800', fontSize: '11px' }}>SUCCESS</span></td>
                      <td style={{ padding: '16px 32px', textAlign: 'right', fontWeight: '900', fontSize: '16px' }}>${t.details?.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>No ledger data synchronized.</div>}
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ height: '100%', padding: '40px' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '32px' }}>Neural <span style={{ color: '#38bdf8' }}>Automations</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              {automations.map((rule) => (
                <div key={rule.id} className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ fontWeight: '800', marginBottom: '4px' }}>{rule.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{rule.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div 
                      onClick={() => toggleAutomation(rule.id)}
                      style={{ width: '40px', height: '20px', background: rule.status === 'Active' ? '#10b981' : '#334155', borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}
                    >
                       <div style={{ position: 'absolute', top: '2px', left: rule.status === 'Active' ? '22px' : '2px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }}></div>
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: rule.status === 'Active' ? '#10b981' : '#94a3b8', marginTop: '6px' }}>{rule.status.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(56, 189, 248, 0.05)', border: '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '20px', textAlign: 'center' }}>
               <p style={{ fontSize: '14px', color: '#38bdf8', fontWeight: '600' }}>Need custom logic? You can ask the AI Agent to write new automation rules for you.</p>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL */}
      <aside className="activity-panel">
        <div className="activity-title">
          <Icons.Activity />
          Real-time Ledger
        </div>
        <div className="activity-list">
          {transactions.map((t, i) => (
            <div key={t.id || i} className="txn-item">
              <div className="txn-header">
                <span className="txn-id">{t.id}</span>
                <span className={`txn-badge success`}>SUCCESS</span>
              </div>
              <div className="txn-amount">${t.details?.amount}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Via {t.details?.method} • 0.002s latency</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '14px' }}>No ledger entries found.</div>
          )}
        </div>
        <button onClick={exportCSV} style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: '#94a3b8', padding: '12px', borderRadius: '16px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>DOWNLOAD CSV REPORT</button>
      </aside>

      {/* OVERLAYS AT THE END FOR BETTER STACKING */}
      {showScanner && (
        <div className="checkout-overlay" style={{ zIndex: 9999 }}>
          <div className="locus-scanner">
            <div className="scanner-circle"></div>
            <div className="locus-logo-glow">L</div>
            <p style={{ marginTop: '40px', fontWeight: '800', color: '#38bdf8', letterSpacing: '2px' }}>ENCRYPTING TRANSACTION</p>
          </div>
        </div>
      )}

      {showDocs && (
        <div className="checkout-overlay" style={{ zIndex: 9999 }} onClick={() => setShowDocs(false)}>
          <div className="glass-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', background: '#0f172a' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px', color: '#38bdf8' }}>Locus PayGentic API Documentation</h2>
            <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.8' }}>
              <p><strong>POST /api/agent/chat</strong><br/>Processes natural language payment intents.</p>
              <p style={{ marginTop: '12px' }}><strong>GET /api/payments/stats</strong><br/>Returns real-time revenue and transaction metrics.</p>
              <p style={{ marginTop: '12px' }}><strong>GET /api/payments/history</strong><br/>Retrieves the full transaction ledger.</p>
              <button onClick={() => setShowDocs(false)} style={{ marginTop: '30px', width: '100%', background: '#38bdf8', border: 'none', color: '#030712', padding: '12px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>CLOSE DOCUMENTATION</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
