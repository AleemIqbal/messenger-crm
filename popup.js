// ========================================
// Messenger CRM Dashboard - Popup Script
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadStats();
    loadActivity();
    setupEventListeners();
});

// Theme Management
function initTheme() {
    chrome.storage.local.get(['crm_dark_mode'], (result) => {
        const isDark = result.crm_dark_mode || false;
        applyTheme(isDark);
        updateThemeIcon(isDark);
    });
}

function applyTheme(isDark) {
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function updateThemeIcon(isDark) {
    const themeIcon = document.querySelector('.theme-icon');
    themeIcon.textContent = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
    chrome.storage.local.get(['crm_dark_mode'], (result) => {
        const newValue = !result.crm_dark_mode;
        chrome.storage.local.set({ crm_dark_mode: newValue }, () => {
            applyTheme(newValue);
            updateThemeIcon(newValue);
        });
    });
}

// Load Stats
function loadStats() {
    chrome.storage.local.get(null, (items) => {
        const counts = {
            done: 0,
            pending: 0,
            not_interested: 0
        };

        // Count statuses (exclude our internal keys)
        Object.entries(items).forEach(([key, value]) => {
            if (key.startsWith('crm_')) return; // Skip internal keys
            if (counts.hasOwnProperty(value)) {
                counts[value]++;
            }
        });

        const total = counts.done + counts.pending + counts.not_interested;

        // Update stat cards with animation
        animateNumber('statDone', counts.done);
        animateNumber('statPending', counts.pending);
        animateNumber('statNotInterested', counts.not_interested);
        animateNumber('statTotal', total);

        // Update conversion rate
        updateConversionRate(counts.done, total);
    });
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateConversionRate(done, total) {
    const percentElement = document.getElementById('conversionPercent');
    const ringElement = document.getElementById('conversionRing');

    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    // Animate percentage text
    const startPercent = parseInt(percentElement.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();

    function updatePercent(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentPercent = Math.round(startPercent + (percentage - startPercent) * easeOutQuart);

        percentElement.textContent = currentPercent + '%';
        ringElement.style.strokeDasharray = `${currentPercent}, 100`;

        if (progress < 1) {
            requestAnimationFrame(updatePercent);
        }
    }

    requestAnimationFrame(updatePercent);
}

// Load Activity
function loadActivity() {
    chrome.storage.local.get(['crm_activity_log'], (result) => {
        const activityList = document.getElementById('activityList');
        const activities = result.crm_activity_log || [];

        if (activities.length === 0) {
            // Keep the empty state
            return;
        }

        // Clear the empty state
        activityList.innerHTML = '';

        // Show last 10 activities (most recent first)
        const recentActivities = activities.slice(-10).reverse();

        recentActivities.forEach(activity => {
            const item = createActivityItem(activity);
            activityList.appendChild(item);
        });
    });
}

function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';

    const dot = document.createElement('div');
    dot.className = `activity-dot ${activity.status}`;

    const text = document.createElement('span');
    text.className = 'activity-text';
    text.textContent = `Thread → ${formatStatus(activity.status)}`;

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = formatTimeAgo(activity.timestamp);

    item.appendChild(dot);
    item.appendChild(text);
    item.appendChild(time);

    return item;
}

function formatStatus(status) {
    const labels = {
        'done': 'Done',
        'pending': 'Pending',
        'not_interested': 'No Interest'
    };
    return labels[status] || status;
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Open Full Dashboard
    document.getElementById('openDashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    });

    // Open Messenger
    document.getElementById('openMessenger').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.messenger.com/' });
    });

    // Export Data
    document.getElementById('exportData').addEventListener('click', exportData);
}

function exportData() {
    chrome.storage.local.get(null, (items) => {
        // Filter out internal keys for cleaner export
        const exportData = {};
        Object.entries(items).forEach(([key, value]) => {
            if (!key.startsWith('crm_')) {
                exportData[key] = value;
            }
        });

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `messenger-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Data exported successfully!', 'success');
    });
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
