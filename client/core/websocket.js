/**
 * TrustChecker – WebSocket Module
 * Real-time event streaming from backend.
 */
import { State, render } from './state.js';
import { showToast } from '../components/toast.js';

export function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    State.ws = new WebSocket(`${proto}//${location.host}/ws`);
    State.ws.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            State.events.unshift(msg);
            if (State.events.length > 200) State.events.length = 200;

            // Push notification
            const notif = {
                id: Date.now(),
                title: msg.type || 'Event',
                message: msg.message || msg.data?.message || JSON.stringify(msg.data || {}).slice(0, 100),
                time: new Date().toISOString(),
                read: false,
                type: msg.type,
            };
            State.notifications.unshift(notif);
            if (State.notifications.length > 100) State.notifications.length = 100;
            localStorage.setItem('tc_notifications', JSON.stringify(State.notifications));

            if (State.page === 'events' || State.page === 'dashboard') render();

            // Badge update
            const badge = document.getElementById('notif-badge');
            if (badge) {
                const unread = State.notifications.filter(n => !n.read).length;
                badge.textContent = unread > 9 ? '9+' : unread;
                badge.style.display = unread > 0 ? 'flex' : 'none';
            }
        } catch (err) { /* ignore parse errors */ }
    };
    State.ws.onclose = () => setTimeout(connectWS, 5000);
}

window.connectWS = connectWS;
