/**
 * AI Assistant Engine — Rule-based FAQ + Context-aware responses
 * No external LLM needed — uses knowledge base + pattern matching
 */

class AIAssistant {
    constructor() {
        this.knowledgeBase = {
            // Product & QR
            'how to scan': { answer: 'Go to the QR Scanner page, point your camera at the QR code on the product, and the system will validate it in real-time. You\'ll see authenticity status, trust score, and fraud risk.', category: 'scanning' },
            'qr code': { answer: 'QR codes are generated automatically when you register a product. Each code contains a unique identifier linked to your product\'s blockchain record.', category: 'scanning' },
            'fake product': { answer: 'If a scan detects a counterfeit, our system flags it with a fraud alert and records it on the blockchain. You can view fraud alerts in the Fraud Center dashboard.', category: 'fraud' },
            'trust score': { answer: 'Trust Score is calculated using multiple factors: scan history, blockchain seals, fraud reports, and supply chain integrity. Scores range from 0-100.', category: 'trust' },

            // Fraud & Security
            'fraud': { answer: 'Our 3-layer fraud detection uses Rule-based analysis, Statistical anomaly detection, and Pattern recognition. Fraud scores range from 0 (safe) to 1 (high risk).', category: 'fraud' },
            'blockchain': { answer: 'We use a simulated blockchain with Merkle trees and Proof of Work. Every scan, product registration, and critical event is sealed and immutable.', category: 'blockchain' },
            'anomaly': { answer: 'Our anomaly detection engine monitors scan velocity, fraud spikes, trust drops, and geographic dispersion to detect unusual patterns automatically.', category: 'security' },

            // Account & Billing
            'billing': { answer: 'We offer 4 plans: Free (100 scans/mo), Starter ($49/mo, 1000 scans), Professional ($149/mo, 10K scans), and Enterprise ($499/mo, unlimited). Visit Billing to manage.', category: 'billing' },
            'plan': { answer: 'To change your plan, go to Billing > Upgrade or Downgrade. Changes take effect immediately. Pro-rated credits apply for downgrades.', category: 'billing' },
            'api key': { answer: 'Generate API keys in Billing > SDK section. Keys can be used for REST API integration. Revoke keys anytime from the same page.', category: 'developer' },
            'mfa': { answer: 'Enable Multi-Factor Authentication in Settings > Security. We support TOTP (Time-based One-Time Password) with apps like Google Authenticator.', category: 'security' },
            'password': { answer: 'To reset your password: click "Forgot Password" on login, enter your email, and follow the reset link. For security, use a strong unique password.', category: 'account' },

            // Supply Chain
            'supply chain': { answer: 'Track products through the entire supply chain using EPCIS events. Monitor partners, batches, shipments, and detect leaks with our SCM module.', category: 'scm' },
            'partner': { answer: 'Manage supply chain partners via SCM > Partners. Add partners, track trust scores, monitor SLA compliance, and detect toxic suppliers.', category: 'scm' },
            'batch': { answer: 'Batches track groups of products through the supply chain. You can trace origins, monitor shipments, and initiate recalls if needed.', category: 'scm' },
            'recall': { answer: 'To initiate a batch recall: go to SCM > Batches > select batch > Recall. This creates blockchain-sealed return events and notifies downstream partners.', category: 'scm' },
            'sustainability': { answer: 'Our sustainability module assesses products on 6 factors: carbon footprint, water usage, recyclability, ethical sourcing, packaging, and transport. Products scoring 60+ can receive green certification.', category: 'sustainability' },

            // Evidence & Compliance
            'evidence': { answer: 'The Evidence Vault stores tamper-proof documents with SHA-256 hashing and blockchain anchoring. Upload, tag, and batch-verify evidence items.', category: 'evidence' },
            'gdpr': { answer: 'We are GDPR compliant. You can export your data (Article 15), request deletion (Article 17), and manage consent preferences in Settings > Compliance.', category: 'compliance' },
            'kyc': { answer: 'KYC verification includes document upload, sanctions screening, and risk assessment. Multi-step verification ensures business compliance.', category: 'kyc' },
            'nft': { answer: 'NFT Certificates are blockchain-sealed digital certificates of authenticity. You can mint, verify, transfer, and revoke certificates for any product.', category: 'nft' },

            // General
            'help': { answer: 'I can help with: product scanning, fraud detection, billing, supply chain, evidence vault, compliance, and technical support. Just ask me anything!', category: 'general' },
            'support': { answer: 'Create a support ticket from Help > Support Tickets. You\'ll get a ticket ID for tracking. Our team responds within 24 hours for standard tickets.', category: 'support' },
            'offline': { answer: 'TrustChecker supports offline mode. When offline, cached data is available and write operations are queued for sync when you reconnect.', category: 'general' },
        };

        this.greetings = ['hello', 'hi', 'hey', 'xin chào', 'chào', 'good morning', 'good afternoon'];
        this.thanks = ['thank', 'thanks', 'cảm ơn', 'grateful'];
    }

    /**
     * Process a user message and return a response
     */
    respond(message, context = {}) {
        const lower = message.toLowerCase().trim();

        // Greeting
        if (this.greetings.some(g => lower.startsWith(g))) {
            return {
                response: `Hello! 👋 I'm TrustBot, your AI assistant. I can help with product scanning, fraud detection, billing, supply chain management, and more. What would you like to know?`,
                category: 'greeting',
                confidence: 1.0,
                suggestions: ['How to scan a QR code?', 'What is a trust score?', 'Tell me about billing plans']
            };
        }

        // Thanks
        if (this.thanks.some(t => lower.includes(t))) {
            return {
                response: 'You\'re welcome! Let me know if you need anything else. 😊',
                category: 'thanks',
                confidence: 1.0,
                suggestions: []
            };
        }

        // Knowledge base matching
        let bestMatch = null;
        let bestScore = 0;

        Object.entries(this.knowledgeBase).forEach(([key, value]) => {
            const keywords = key.split(' ');
            let score = 0;
            keywords.forEach(kw => {
                if (lower.includes(kw)) score += 1 / keywords.length;
            });

            // Boost for exact phrase match
            if (lower.includes(key)) score += 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = { key, ...value };
            }
        });

        if (bestMatch && bestScore >= 0.3) {
            // Find related topics
            const related = Object.entries(this.knowledgeBase)
                .filter(([k, v]) => v.category === bestMatch.category && k !== bestMatch.key)
                .slice(0, 3)
                .map(([k]) => k);

            return {
                response: bestMatch.answer,
                category: bestMatch.category,
                confidence: Math.min(1, bestScore),
                matched_topic: bestMatch.key,
                suggestions: related.length > 0 ? related.map(r => `Tell me about ${r}`) : ['Create a support ticket', 'Show billing plans']
            };
        }

        // Context-aware fallback
        if (context.current_page) {
            const pageHints = {
                'dashboard': 'I see you\'re on the Dashboard. You can view scan statistics, recent alerts, and trust scores here.',
                'qr-scanner': 'You\'re on the QR Scanner. Point your camera at a product QR code to validate it.',
                'fraud-center': 'You\'re in the Fraud Center. Here you can review fraud alerts and manage investigations.',
                'billing': 'You\'re on the Billing page. You can manage your plan, view invoices, and generate API keys.',
                'scm': 'You\'re in Supply Chain Management. Track products, manage partners, and monitor logistics.'
            };
            const pageHelp = Object.entries(pageHints).find(([k]) => (context.current_page || '').includes(k));
            if (pageHelp) {
                return {
                    response: `${pageHelp[1]} Is there something specific you'd like help with?`,
                    category: 'contextual',
                    confidence: 0.6,
                    suggestions: ['How does this work?', 'Create a support ticket']
                };
            }
        }

        // Default fallback
        return {
            response: `I'm not sure I understand your question about "${message}". Here are some things I can help with:\n• Product scanning & QR codes\n• Fraud detection & trust scores\n• Billing & plans\n• Supply chain management\n• Evidence vault & compliance\n• Support & tickets\n\nCould you rephrase or choose a topic?`,
            category: 'unknown',
            confidence: 0,
            suggestions: ['How to scan a QR code?', 'Tell me about billing', 'What is trust score?', 'Create a support ticket']
        };
    }

    /**
     * Get quick-action suggestions
     */
    getSuggestions(context = {}) {
        const base = [
            { label: 'Scan a QR code', action: 'navigate', target: '/qr-scanner' },
            { label: 'View fraud alerts', action: 'navigate', target: '/fraud-center' },
            { label: 'Check billing', action: 'navigate', target: '/billing' },
            { label: 'Create support ticket', action: 'navigate', target: '/support' },
        ];

        if (context.role === 'admin') {
            base.push(
                { label: 'Run anomaly scan', action: 'api', target: '/api/anomaly/scan' },
                { label: 'GDPR compliance report', action: 'api', target: '/api/compliance/report' }
            );
        }
        return base;
    }
}

module.exports = new AIAssistant();
