/**
 * TrustChecker v9.5 — Offline Queue for QR Scans
 * 
 * Queues scan operations when offline, auto-syncs on reconnect.
 * Uses IndexedDB for persistence across page reloads.
 * Integrates with Background Sync API for reliable delivery.
 */

import { API } from './api.js';

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const DB_NAME = 'tc_offline_queue';
const STORE_NAME = 'pending_scans';
const DB_VERSION = 1;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff
const HEALTH_PING_INTERVAL = 10_000; // 10s

// ═══════════════════════════════════════════════════════════════════
// NETWORK STATUS
// ═══════════════════════════════════════════════════════════════════

let _isOnline = navigator.onLine;
let _healthPingTimer = null;
let _syncInProgress = false;
const _statusListeners = new Set();

/**
 * Get current online status (more reliable than navigator.onLine alone).
 */
export function isOnline() {
    return _isOnline;
}

/**
 * Subscribe to online/offline status changes.
 * @param {Function} listener — (isOnline: boolean) => void
 * @returns {Function} unsubscribe
 */
export function onStatusChange(listener) {
    _statusListeners.add(listener);
    return () => _statusListeners.delete(listener);
}

function setOnlineStatus(status) {
    if (_isOnline === status) return;
    _isOnline = status;
    console.log(`[OfflineQueue] Network status: ${status ? '🟢 Online' : '🔴 Offline'}`);
    for (const listener of _statusListeners) {
        try { listener(status); } catch (e) { console.error('[OfflineQueue] Status listener error:', e); }
    }
    if (status) flushQueue();
}

async function healthPing() {
    try {
        const res = await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        setOnlineStatus(res.ok);
    } catch {
        setOnlineStatus(false);
    }
}

// ═══════════════════════════════════════════════════════════════════
// INDEXEDDB STORAGE
// ═══════════════════════════════════════════════════════════════════

let _db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (_db) return resolve(_db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };

        request.onsuccess = (e) => {
            _db = e.target.result;
            resolve(_db);
        };

        request.onerror = () => reject(request.error);
    });
}

async function addToDB(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function updateInDB(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllPending() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('status');
        const request = index.getAll('pending');
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function getQueueSize() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ═══════════════════════════════════════════════════════════════════
// QUEUE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Enqueue a scan for later sync.
 * Call this instead of API.post('/qr/scan', data) when offline.
 * 
 * @param {Object} scanData — { qr_code, location, device, ... }
 * @returns {string} queue entry ID
 */
export async function enqueue(scanData) {
    const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hash = await generateScanHash(scanData);

    const entry = {
        id,
        hash,
        type: 'qr_scan',
        data: scanData,
        status: 'pending',
        retries: 0,
        createdAt: new Date().toISOString(),
        lastAttempt: null,
        error: null,
    };

    try {
        await addToDB(entry);
    } catch (e) {
        // IndexedDB fallback to localStorage
        const queue = JSON.parse(localStorage.getItem('tc_offline_queue') || '[]');
        queue.push(entry);
        localStorage.setItem('tc_offline_queue', JSON.stringify(queue));
    }

    console.log(`[OfflineQueue] Queued scan ${id} (${_isOnline ? 'will sync shortly' : 'waiting for network'})`);

    // Notify UI
    window.dispatchEvent(new CustomEvent('tc:queue-updated', {
        detail: { action: 'enqueue', id, size: await getPendingCount() }
    }));

    // If online, try to flush immediately
    if (_isOnline) {
        setTimeout(() => flushQueue(), 100);
    }

    // Register Background Sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register('tc-scan-sync');
        } catch (e) {
            // Background Sync not available — will rely on online event
        }
    }

    return id;
}

/**
 * Flush all pending scans — called on reconnect.
 */
export async function flushQueue() {
    if (_syncInProgress || !_isOnline) return;
    _syncInProgress = true;

    try {
        // Get from IndexedDB
        let pending = await getAllPending();

        // Also check localStorage fallback
        const lsQueue = JSON.parse(localStorage.getItem('tc_offline_queue') || '[]');
        if (lsQueue.length > 0) {
            pending = [...pending, ...lsQueue.filter(e => e.status === 'pending')];
            localStorage.removeItem('tc_offline_queue');
            // Migrate to IndexedDB
            for (const item of lsQueue) {
                try { await addToDB(item); } catch { /* may already exist */ }
            }
        }

        if (pending.length === 0) {
            _syncInProgress = false;
            return;
        }

        console.log(`[OfflineQueue] Flushing ${pending.length} pending scans...`);

        let synced = 0;
        let failed = 0;

        for (const entry of pending) {
            try {
                // Check for duplicates before sending
                const isDuplicate = await checkDuplicate(entry.hash);
                if (isDuplicate) {
                    await deleteFromDB(entry.id);
                    synced++;
                    continue;
                }

                // Attempt to sync
                await API.post('/qr/scan', entry.data);
                await deleteFromDB(entry.id);
                synced++;

            } catch (error) {
                entry.retries++;
                entry.lastAttempt = new Date().toISOString();
                entry.error = error.message;

                if (entry.retries >= MAX_RETRIES) {
                    entry.status = 'failed';
                    console.error(`[OfflineQueue] Scan ${entry.id} failed after ${MAX_RETRIES} retries`);
                } else {
                    // Wait before next retry
                    await new Promise(r => setTimeout(r, RETRY_DELAYS[entry.retries - 1] || 5000));
                }

                await updateInDB(entry);
                failed++;
            }
        }

        console.log(`[OfflineQueue] Flush complete: ${synced} synced, ${failed} failed`);

        // Notify UI
        window.dispatchEvent(new CustomEvent('tc:queue-updated', {
            detail: { action: 'flush', synced, failed, size: await getPendingCount() }
        }));

    } catch (e) {
        console.error('[OfflineQueue] Flush error:', e);
    } finally {
        _syncInProgress = false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════════

async function generateScanHash(scanData) {
    const str = JSON.stringify({
        qr: scanData.qr_code || scanData.code,
        ts: scanData.timestamp || scanData.scanned_at,
        device: scanData.device_id || scanData.device,
    });

    if (crypto.subtle) {
        const buffer = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }

    // Fallback: simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
}

async function checkDuplicate(hash) {
    try {
        // Quick check against recent scans
        const recent = await API.get('/qr/scan-history?limit=10');
        const scans = recent.scans || [];
        return scans.some(s => s.hash === hash || s.qr_hash === hash);
    } catch {
        return false; // Can't verify, assume not duplicate
    }
}

// ═══════════════════════════════════════════════════════════════════
// QUEUE STATUS
// ═══════════════════════════════════════════════════════════════════

export async function getPendingCount() {
    try {
        const pending = await getAllPending();
        const lsQueue = JSON.parse(localStorage.getItem('tc_offline_queue') || '[]');
        return pending.length + lsQueue.filter(e => e.status === 'pending').length;
    } catch {
        return 0;
    }
}

export async function getQueueStats() {
    try {
        const size = await getQueueSize();
        const pending = await getAllPending();
        return {
            total: size,
            pending: pending.length,
            isOnline: _isOnline,
            syncInProgress: _syncInProgress,
        };
    } catch {
        return { total: 0, pending: 0, isOnline: _isOnline, syncInProgress: false };
    }
}

// ═══════════════════════════════════════════════════════════════════
// UI BADGE RENDER
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns HTML for the offline sync badge in the header.
 * Shows pending count and online/offline indicator.
 */
export function renderSyncBadge(pendingCount) {
    if (pendingCount === 0 && _isOnline) return '';

    const statusDot = _isOnline
        ? '<span class="sync-dot sync-dot-online" title="Online"></span>'
        : '<span class="sync-dot sync-dot-offline" title="Offline"></span>';

    const countBadge = pendingCount > 0
        ? `<span class="sync-badge" title="${pendingCount} scans pending sync">${pendingCount}</span>`
        : '';

    return `
        <div class="sync-indicator" role="status" aria-label="${_isOnline ? 'Online' : 'Offline'}${pendingCount > 0 ? `, ${pendingCount} scans pending` : ''}">
            ${statusDot}${countBadge}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize offline queue system.
 * Sets up network listeners and health ping.
 */
export function initOfflineQueue() {
    // Browser online/offline events
    window.addEventListener('online', () => setOnlineStatus(true));
    window.addEventListener('offline', () => setOnlineStatus(false));

    // Periodic health ping for more reliable detection
    _healthPingTimer = setInterval(healthPing, HEALTH_PING_INTERVAL);

    // Initial ping
    healthPing();

    // Open IndexedDB early
    openDB().catch(e => console.warn('[OfflineQueue] IndexedDB not available:', e.message));

    console.log('[OfflineQueue] Initialized');
}

/**
 * Cleanup — stop health ping timer.
 */
export function destroyOfflineQueue() {
    if (_healthPingTimer) {
        clearInterval(_healthPingTimer);
        _healthPingTimer = null;
    }
}

// ═══════════════════════════════════════════════════════════════════
// CSS (injected once)
// ═══════════════════════════════════════════════════════════════════

const syncCSS = `
.sync-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--card-bg, #1a1a2e);
    border: 1px solid var(--border, #333);
    font-size: 12px;
}
.sync-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
.sync-dot-online { background: #00d2d3; }
.sync-dot-offline { background: #ff6b6b; animation: pulse-offline 1.5s infinite; }
.sync-badge {
    background: var(--warning, #ffa502);
    color: #000;
    border-radius: 10px;
    padding: 1px 7px;
    font-size: 11px;
    font-weight: 600;
}
@keyframes pulse-offline {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}
`;

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = syncCSS;
    document.head.appendChild(style);
}
