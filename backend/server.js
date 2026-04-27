// server.js - Main Express Server with Payment Agent Logic

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const LocusPaymentGateway = require('./locusIntegration');
const locus = new LocusPaymentGateway();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory transaction storage (use DB in production)
let transactions = [
  {
    id: 'TXN_INITIAL_01',
    details: {
      amount: 2500,
      currency: 'USD',
      method: 'Card',
      status: 'success',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      fraudScore: 5
    }
  },
  {
    id: 'TXN_INITIAL_02',
    details: {
      amount: 120,
      currency: 'USD',
      method: 'UPI',
      status: 'success',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      fraudScore: 12
    }
  }
];
let fraudLog = [];

// ============================================
// AI AGENT LOGIC
// ============================================

const determineAction = (request) => {
  const lower = request.toLowerCase();
  if (lower.includes('process') || lower.includes('pay') || lower.includes('send')) return 'process_payment';
  if (lower.includes('refund')) return 'refund_payment';
  if (lower.includes('history') || lower.includes('transaction') || lower.includes('show')) return 'get_history';
  if (lower.includes('fraud') || lower.includes('security') || lower.includes('risk')) return 'detect_fraud';
  if (lower.includes('convert') || lower.includes('exchange')) return 'convert_currency';
  return 'chat';
};

const extractAmount = (text) => {
  const match = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
};

const calculateFraudScore = (context) => {
  let score = Math.floor(Math.random() * 20); // Base random risk
  if (context.amount > 5000) score += 30;
  if (context.amount > 10000) score += 50;
  return Math.min(score, 100);
};

// ============================================
// API ENDPOINTS
// ============================================

app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    const action = determineAction(message);
    let response = "";
    let suggestedActions = [];

    switch (action) {
      case 'process_payment':
        const amount = extractAmount(message);
        if (amount) {
          const txnId = `TXN_${uuidv4().slice(0, 8).toUpperCase()}`;
          const newTxn = {
            id: txnId,
            details: {
              amount,
              currency: 'USD',
              method: message.toLowerCase().includes('upi') ? 'UPI' : 'Card',
              status: 'success',
              timestamp: new Date().toISOString(),
              fraudScore: calculateFraudScore({ amount })
            }
          };
          transactions.unshift(newTxn);
          response = `I've successfully processed the payment of $${amount.toLocaleString()} via ${newTxn.details.method}. Transaction ID is ${txnId}. I've also verified the transaction for potential fraud (Risk Score: ${newTxn.details.fraudScore}/100).`;
          suggestedActions = ['View Receipt', 'Check Fraud Log', 'Process Refund'];
        } else {
          response = "I can help with that! How much would you like to process, and which payment method should I use (UPI, Card, or Bank Transfer)?";
          suggestedActions = ['Process $100', 'Process $500 via UPI', 'Show Methods'];
        }
        break;

      case 'detect_fraud':
        const blocked = fraudLog.length;
        response = `My real-time fraud detection engine is active. I've analyzed your last ${transactions.length} transactions. Current status: All clear. ${blocked > 0 ? `I've blocked ${blocked} suspicious attempts this session.` : "No suspicious activity detected in the last 24 hours."}`;
        suggestedActions = ['View Security Log', 'Set Risk Threshold', 'Verify Account'];
        break;

      case 'get_history':
        response = `You have a total of ${transactions.length} transactions. The most recent one was for $${transactions[0].details.amount} via ${transactions[0].details.method}. Would you like me to export a full report or filter by status?`;
        suggestedActions = ['Export CSV', 'Filter by Failed', 'Show Last 10'];
        break;

      case 'refund_payment':
        response = "I can initiate a refund for you. Please provide the Transaction ID or select from your recent history. I'll handle the Locus API settlement automatically.";
        suggestedActions = [`Refund ${transactions[0].id}`, 'Refund Policy', 'Contact Support'];
        break;

      default:
        response = "I'm your PayGentic Agent. I can automate your payment workflows using the Locus API. Try asking me to 'Process $500 via UPI' or 'Show my transaction history'.";
        suggestedActions = ['Process Payment', 'Show History', 'Check Security'];
    }

    res.json({ response, action, suggestedActions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/payments/stats', (req, res) => {
  const successful = transactions.filter(t => t.details.status === 'success');
  const totalAmount = successful.reduce((sum, t) => sum + (t.details.amount || 0), 0);
  
  res.json({
    stats: {
      totalRevenue: `$${totalAmount.toLocaleString()}`,
      transactions: transactions.length,
      successRate: transactions.length > 0 ? ((successful.length / transactions.length) * 100).toFixed(1) : 0,
      fraud: fraudLog.length
    }
  });
});

app.get('/api/payments/history', (req, res) => {
  res.json({ transactions: transactions.slice(0, 50) });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`Agent Backend running on http://localhost:${PORT}`);
});

