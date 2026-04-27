// locusIntegration.js - Complete Locus CheckoutWithLocus API Integration

const axios = require('axios');
require('dotenv').config();

class LocusPaymentGateway {
  constructor() {
    this.baseURL = process.env.LOCUS_API_URL || 'https://api.paywith.locus.io/v1';
    this.apiKey = process.env.LOCUS_API_KEY;
    this.secretKey = process.env.LOCUS_SECRET_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a CheckoutWithLocus session
   * Returns a checkout URL for the customer
   */
  async createCheckoutSession(options) {
    try {
      const payload = {
        amount: options.amount,
        currency: options.currency || 'USD',
        description: options.description,
        customer: {
          email: options.customerEmail,
          name: options.customerName,
          phone: options.customerPhone
        },
        metadata: {
          transactionId: options.transactionId,
          source: 'payment-agent',
          agentVersion: '1.0'
        },
        successUrl: options.successUrl || `${process.env.APP_URL}/success`,
        cancelUrl: options.cancelUrl || `${process.env.APP_URL}/cancel`,
        notificationUrl: options.notificationUrl || `${process.env.APP_URL}/webhooks/locus`
      };

      const response = await this.client.post('/checkout/sessions', payload);
      
      return {
        sessionId: response.data.id,
        checkoutUrl: response.data.url,
        expiresAt: response.data.expiresAt,
        status: 'created'
      };
    } catch (error) {
      console.error('Locus checkout session error:', error.response?.data || error.message);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Process direct payment
   * For card, UPI, wallet, and bank transfers
   */
  async processPayment(options) {
    try {
      const payload = {
        amount: options.amount,
        currency: options.currency || 'USD',
        paymentMethod: options.paymentMethod, // 'card', 'upi', 'wallet', 'bank_transfer'
        description: options.description,
        customer: {
          email: options.customerEmail,
          name: options.customerName
        },
        metadata: {
          transactionId: options.transactionId,
          riskScore: options.riskScore || 0,
          agentDecision: options.agentDecision
        },
        // For card payments
        ...(options.paymentMethod === 'card' && {
          card: {
            token: options.cardToken // Tokenized card from frontend
          }
        }),
        // For UPI
        ...(options.paymentMethod === 'upi' && {
          upi: {
            vpa: options.upiId
          }
        }),
        // For Bank Transfer
        ...(options.paymentMethod === 'bank_transfer' && {
          bankTransfer: {
            accountNumber: options.accountNumber,
            ifscCode: options.ifscCode,
            accountHolder: options.accountHolder
          }
        })
      };

      const response = await this.client.post('/payments', payload);

      return {
        transactionId: response.data.id,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency,
        method: response.data.paymentMethod,
        timestamp: response.data.createdAt,
        receiptUrl: response.data.receiptUrl
      };
    } catch (error) {
      console.error('Locus payment error:', error.response?.data || error.message);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const response = await this.client.get(`/payments/${transactionId}`);

      return {
        transactionId: response.data.id,
        status: response.data.status, // 'pending', 'success', 'failed', 'refunded'
        amount: response.data.amount,
        currency: response.data.currency,
        method: response.data.paymentMethod,
        timestamp: response.data.createdAt,
        failureReason: response.data.failureReason
      };
    } catch (error) {
      console.error('Locus status error:', error.response?.data || error.message);
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  /**
   * Process refund
   */
  async processRefund(transactionId, amount) {
    try {
      const payload = {
        amount: amount, // Partial or full amount
        reason: 'customer_request'
      };

      const response = await this.client.post(
        `/payments/${transactionId}/refunds`,
        payload
      );

      return {
        refundId: response.data.id,
        transactionId: transactionId,
        amount: response.data.amount,
        status: response.data.status,
        processedAt: response.data.createdAt
      };
    } catch (error) {
      console.error('Locus refund error:', error.response?.data || error.message);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  /**
   * Create recurring/subscription payment
   */
  async createSubscription(options) {
    try {
      const payload = {
        amount: options.amount,
        currency: options.currency || 'USD',
        interval: options.interval, // 'daily', 'weekly', 'monthly', 'yearly'
        intervalCount: options.intervalCount || 1,
        description: options.description,
        customer: {
          email: options.customerEmail,
          name: options.customerName
        },
        paymentMethod: options.paymentMethod,
        metadata: {
          subscriptionType: options.subscriptionType,
          agentHandled: true
        }
      };

      const response = await this.client.post('/subscriptions', payload);

      return {
        subscriptionId: response.data.id,
        status: response.data.status,
        nextBillingDate: response.data.nextBillingDate,
        amount: response.data.amount,
        interval: response.data.interval
      };
    } catch (error) {
      console.error('Locus subscription error:', error.response?.data || error.message);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(options = {}) {
    try {
      const params = {
        limit: options.limit || 50,
        offset: options.offset || 0,
        ...(options.status && { status: options.status }),
        ...(options.method && { paymentMethod: options.method })
      };

      const response = await this.client.get('/payments', { params });

      return {
        transactions: response.data.data.map(txn => ({
          id: txn.id,
          amount: txn.amount,
          currency: txn.currency,
          status: txn.status,
          method: txn.paymentMethod,
          timestamp: txn.createdAt
        })),
        total: response.data.total,
        limit: params.limit,
        offset: params.offset
      };
    } catch (error) {
      console.error('Locus history error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(method, details) {
    try {
      const payload = {
        paymentMethod: method,
        details: details
      };

      const response = await this.client.post('/validate/payment-method', payload);

      return {
        valid: response.data.valid,
        message: response.data.message,
        supportedCurrencies: response.data.supportedCurrencies
      };
    } catch (error) {
      console.error('Locus validation error:', error.response?.data || error.message);
      return {
        valid: false,
        message: 'Validation failed',
        error: error.message
      };
    }
  }

  /**
   * Get supported payment methods
   */
  async getSupportedMethods() {
    try {
      const response = await this.client.get('/payment-methods');

      return {
        methods: response.data.methods,
        regions: response.data.regions,
        currencies: response.data.currencies
      };
    } catch (error) {
      console.error('Locus methods error:', error.response?.data || error.message);
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  /**
   * Currency conversion
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      const response = await this.client.get('/convert', {
        params: {
          amount: amount,
          from: fromCurrency,
          to: toCurrency
        }
      });

      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: response.data.convertedAmount,
        targetCurrency: toCurrency,
        rate: response.data.exchangeRate,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Locus conversion error:', error.response?.data || error.message);
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * Use this to verify that webhooks are actually from Locus
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardStats(period = 'week') {
    try {
      const response = await this.client.get('/analytics/dashboard', {
        params: { period }
      });

      return {
        totalRevenue: response.data.totalRevenue,
        transactionCount: response.data.transactionCount,
        successRate: response.data.successRate,
        averageTransactionValue: response.data.averageTransactionValue,
        topPaymentMethods: response.data.topPaymentMethods,
        period: response.data.period
      };
    } catch (error) {
      console.error('Locus analytics error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }
}

// Export for use in other modules
module.exports = LocusPaymentGateway;

// Example usage:
/*
const gateway = new LocusPaymentGateway();

// Create checkout session
const session = await gateway.createCheckoutSession({
  amount: 5000,
  currency: 'INR',
  customerEmail: 'user@example.com',
  customerName: 'John Doe',
  description: 'Payment for services',
  transactionId: 'TXN123456'
});

// Process direct payment
const payment = await gateway.processPayment({
  amount: 5000,
  currency: 'INR',
  paymentMethod: 'upi',
  upiId: 'user@upi',
  customerEmail: 'user@example.com',
  transactionId: 'TXN123456'
});

// Get payment status
const status = await gateway.getPaymentStatus('PAY_123456');

// Create subscription
const subscription = await gateway.createSubscription({
  amount: 999,
  currency: 'INR',
  interval: 'monthly',
  customerEmail: 'user@example.com',
  paymentMethod: 'card'
});
*/
