// Basic configuration
const SELECTORS = {
    conversationRow: 'div[role="row"], div[role="listitem"] a[role="link"]',
};

const STATUS_ICONS = {
    'done': '✓',
    'pending': '⏳',
    'not_interested': '✕',
    'none': '+'
};

let activePopup = null;
let currentFilter = 'all';
let profileExtractionCache = {};
const EXTRACTION_COOLDOWN = 3000;

// Queue for batching profile saves
let pendingProfileSaves = {};
let saveProfileTimeout = null;

// Dynamic labels from storage
let cachedLabels = [];
let labelColorMode = 'symbol'; // 'icon', 'background', or 'symbol'
const DEFAULT_LABELS = [
    { id: 'label_done', name: 'Done (Bought)', color: '#10b981', statusKey: 'done', icon: '✓' },
    { id: 'label_pending', name: 'In Pending', color: '#f59e0b', statusKey: 'pending', icon: '⏳' },
    { id: 'label_not_interested', name: 'Not Interested', color: '#ef4444', statusKey: 'not_interested', icon: '✕' },
];

// Built-in templates (same as dashboard)
const BUILTIN_TEMPLATES = [
    { id: 'builtin_reminder', icon: '⏰', title: 'Reminder', body: 'Hi! Just a friendly reminder about our conversation. Please let me know if you have any questions or need further assistance. Looking forward to hearing from you!' },
    { id: 'builtin_followup', icon: '🔄', title: 'Follow Up', body: 'Hey! Following up on our last chat. I wanted to check in and see if you had a chance to think things over. Feel free to reach out anytime — I\'m here to help!' },
    { id: 'builtin_thankyou', icon: '🙏', title: 'Thank You', body: 'Thanks so much for your time and interest! I really appreciate it. If there\'s anything else I can do for you, don\'t hesitate to ask. Have a great day!' },
    { id: 'builtin_intro', icon: '👋', title: 'Introduction', body: 'Hi there! I\'d love to introduce myself. I\'m reaching out because I think we could work really well together. Let me know if you\'d like to learn more!' },
    { id: 'builtin_order', icon: '📦', title: 'Order Update', body: 'Hi! Here\'s an update on your order. Everything is on track and progressing smoothly. If you need any changes or have questions, just let me know!' },
];

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Load labels from storage, then initialize
function init() {
    console.log('Messenger CRM Extension Loaded');
    loadLabelsFromStorage(() => {
        createFilterBar();
        observeDOM();
        processConversations();
        updateFilterCounts();
        observeChatComposer();
    });

    // Listen for label changes from dashboard
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.crm_labels) {
            cachedLabels = migrateLabels(changes.crm_labels.newValue || [...DEFAULT_LABELS]);
            rebuildFilterBar();
            refreshAllIcons(); // Re-render existing icons with new label colors/names
            updateFilterCounts();
        }
        if (changes.crm_settings) {
            const newSettings = changes.crm_settings.newValue || {};
            labelColorMode = newSettings.labelColorMode || 'symbol';
            refreshAllIcons();
        }
    });
}

function loadLabelsFromStorage(callback) {
    chrome.storage.local.get(['crm_labels', 'crm_settings'], (result) => {
        if (result.crm_labels && result.crm_labels.length > 0) {
            cachedLabels = migrateLabels(result.crm_labels);
        } else {
            cachedLabels = [...DEFAULT_LABELS];
        }
        // Load color mode setting
        const settings = result.crm_settings || {};
        labelColorMode = settings.labelColorMode || 'symbol';
        if (callback) callback();
    });
}

// Known ID -> statusKey mapping for backward compat
const KNOWN_STATUS_KEYS = {
    'label_done': 'done',
    'label_pending': 'pending',
    'label_not_interested': 'not_interested',
};

// Ensure all labels have a statusKey (migrates labels saved before statusKey was added)
function migrateLabels(labels) {
    return labels.map(label => {
        if (!label.statusKey && KNOWN_STATUS_KEYS[label.id]) {
            return { ...label, statusKey: KNOWN_STATUS_KEYS[label.id] };
        }
        return label;
    });
}

// Map a label to a status key for backward compat
function getLabelStatusKey(label, index) {
    if (label.statusKey) return label.statusKey;
    if (KNOWN_STATUS_KEYS[label.id]) return KNOWN_STATUS_KEYS[label.id];
    return label.id;
}

function getLabelByStatus(statusKey) {
    // Try statusKey match first (for default labels)
    let label = cachedLabels.find(l => l.statusKey === statusKey);
    if (label) return label;
    // Try known mapping (label_done -> done)
    label = cachedLabels.find(l => KNOWN_STATUS_KEYS[l.id] === statusKey);
    if (label) return label;
    // Try id match
    label = cachedLabels.find(l => l.id === statusKey);
    return label || null;
}

function rebuildFilterBar() {
    const existing = document.querySelector('.crm-filter-bar');
    if (existing) existing.remove();
    currentFilter = 'all';
    createFilterBar();
    updateFilterCounts();
}

// Re-render all existing status icons with current label colors
function refreshAllIcons() {
    const icons = document.querySelectorAll('.crm-status-icon');
    if (icons.length === 0) return;

    // Gather all threadIds
    const threadIds = [];
    icons.forEach(icon => {
        if (icon.dataset.threadId) threadIds.push(icon.dataset.threadId);
    });

    if (threadIds.length === 0) return;

    // Load all statuses and re-render
    chrome.storage.local.get(threadIds, (result) => {
        icons.forEach(icon => {
            const tid = icon.dataset.threadId;
            if (tid) {
                const status = result[tid] || null;
                updateIconVisuals(icon, status);
            }
        });
    });
}

function createFilterBar() {
    if (document.querySelector('.crm-filter-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'crm-filter-bar';

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'crm-filter-btn active';
    const allLabel = document.createElement('span');
    allLabel.textContent = 'All';
    allBtn.appendChild(allLabel);
    allBtn.addEventListener('click', () => {
        document.querySelectorAll('.crm-filter-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        currentFilter = 'all';
        applyFilters();
    });
    bar.appendChild(allBtn);

    // Dynamic label buttons from storage
    cachedLabels.forEach((label, index) => {
        const statusKey = getLabelStatusKey(label, index);
        const btn = document.createElement('button');
        btn.className = 'crm-filter-btn';
        btn.style.borderBottom = `3px solid ${label.color}`;

        const dot = document.createElement('span');
        dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${label.color};margin-right:6px;`;
        btn.appendChild(dot);

        const spanLabel = document.createElement('span');
        spanLabel.textContent = label.name;
        btn.appendChild(spanLabel);

        const spanCount = document.createElement('span');
        spanCount.className = 'crm-filter-count';
        spanCount.textContent = ' (0)';
        spanCount.style.marginLeft = '4px';
        spanCount.style.opacity = '0.8';
        spanCount.style.fontSize = '0.9em';
        btn.appendChild(spanCount);
        btn.dataset.filterType = statusKey;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.crm-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = statusKey;
            applyFilters();
        });

        bar.appendChild(btn);
    });

    // Import/Export button
    const importExportBtn = document.createElement('button');
    importExportBtn.className = 'crm-filter-btn crm-import-export-btn';
    importExportBtn.innerHTML = '⚙️';
    importExportBtn.title = 'Import/Export Data';
    importExportBtn.addEventListener('click', () => openImportExportModal());
    bar.appendChild(importExportBtn);

    document.body.appendChild(bar);
}

function updateFilterCounts() {
    chrome.storage.local.get(null, (items) => {
        const counts = {};

        // Build counts for all known status keys
        cachedLabels.forEach((label, index) => {
            counts[getLabelStatusKey(label, index)] = 0;
        });

        Object.values(items).forEach(status => {
            if (typeof status === 'string' && counts.hasOwnProperty(status)) {
                counts[status]++;
            }
        });

        document.querySelectorAll('.crm-filter-btn[data-filter-type]').forEach(btn => {
            const type = btn.dataset.filterType;
            const countSpan = btn.querySelector('.crm-filter-count');
            if (countSpan && counts[type] !== undefined) {
                countSpan.textContent = ` (${counts[type]})`;
            }
        });
    });
}

function observeDOM() {
    const observer = new MutationObserver(debounce(() => {
        processConversations();
    }, 500));

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function processConversations() {
    // Improved selector strategy
    let candidates = document.querySelectorAll('div[data-testid="mwthreadlist-item"]');
    if (candidates.length === 0) {
        candidates = document.querySelectorAll('div[role="row"]');
    }

    // Fallback: finding conversation links and going to parent
    if (candidates.length === 0) {
        const links = document.querySelectorAll('a[role="link"]');
        const list = [];
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.includes('/t/') || href.match(/\/messages\/t\/\d+/))) {
                // Try to use parent div if possible, else link itself
                list.push(link.closest('div[role="row"]') || link.parentElement || link);
            }
        });
        candidates = list;
    }

    if (candidates.length === 0) return;

    candidates.forEach(row => {
        injectStatusIcon(row);
    });

    applyFilters();
}

function getThreadId(row) {
    let href = row.getAttribute('href');
    if (!href) {
        const link = row.querySelector('a[role="link"]');
        if (link) href = link.getAttribute('href');
    }

    if (href) {
        const match = href.match(/\/t\/(\d+)/);
        if (match && match[1]) return match[1];
    }
    return null;
}

// Extract profile data from conversation row (OPTIMIZED for performance)
function extractProfileData(row) {
    const profileData = {
        name: null,
        avatar: null,
        isOnline: false
    };

    try {
        // ===== AVATAR EXTRACTION (Fast methods only) =====
        // Method 1: Look for img tags with fbcdn src
        const firstImg = row.querySelector('img[src*="fbcdn"]');
        if (firstImg) {
            profileData.avatar = firstImg.src;
            if (firstImg.alt && firstImg.alt.length > 0 && firstImg.alt.length < 100) {
                profileData.name = firstImg.alt;
            }
        }

        // Method 2: SVG image with xlink:href
        if (!profileData.avatar) {
            const svgImg = row.querySelector('image[*|href*="fbcdn"]');
            if (svgImg) {
                profileData.avatar = svgImg.getAttribute('xlink:href') || svgImg.getAttribute('href');
            }
        }

        // ===== NAME EXTRACTION (Fast methods only) =====
        // Method 1: aria-label (fastest)
        if (!profileData.name) {
            const ariaLabel = row.getAttribute('aria-label') ||
                row.querySelector('a[aria-label]')?.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.length > 0 && ariaLabel.length < 100) {
                const nameMatch = ariaLabel.match(/(?:Conversation with |Chat with )?(.+)/i);
                if (nameMatch && nameMatch[1]) {
                    profileData.name = nameMatch[1].split(',')[0].trim();
                }
            }
        }

        // Method 2: Find first span with valid name-like text (no getComputedStyle)
        if (!profileData.name) {
            const spans = row.querySelectorAll('span');
            const skipPatterns = /·|Sent|Active|ago|You:|min|hour|day|week|Typing|Online|Offline|Delivered|Seen|Message|yesterday|today|now/i;

            for (let i = 0; i < Math.min(spans.length, 10); i++) { // Limit to first 10 spans
                const text = spans[i].textContent?.trim();
                if (!text || text.length < 2 || text.length > 50) continue;
                if (skipPatterns.test(text)) continue;

                // Name criteria: starts with capital letter
                if (/^[A-Z\u0600-\u06FF\u0980-\u09FF]/.test(text)) {
                    profileData.name = text;
                    break;
                }
            }
        }

        // ===== ONLINE STATUS (Fast methods only) =====
        // Check for green fill in SVG circles only (no getComputedStyle)
        const circles = row.querySelectorAll('circle[fill]');
        for (const circle of circles) {
            const fill = circle.getAttribute('fill');
            if (fill && (fill === '#31a74b' || fill === '#42b72a' || fill.toLowerCase().includes('31a74b'))) {
                profileData.isOnline = true;
                break;
            }
        }

        // Check inline styles for green background (no getComputedStyle)
        if (!profileData.isOnline) {
            const styledEl = row.querySelector('[style*="#31a74b"], [style*="#42b72a"], [style*="rgb(49, 167, 75)"]');
            if (styledEl) {
                profileData.isOnline = true;
            }
        }

    } catch (err) {
        // Silently fail
    }

    return profileData;
}

// Save profile data to storage (batched to prevent race conditions)
function saveProfileData(threadId, profileData) {
    // Add to pending saves queue
    pendingProfileSaves[threadId] = profileData;

    // Debounce the actual save - wait 500ms for more updates before writing
    if (saveProfileTimeout) {
        clearTimeout(saveProfileTimeout);
    }

    saveProfileTimeout = setTimeout(() => {
        flushProfileSaves();
    }, 500);
}

// Flush all pending profile saves to storage at once
function flushProfileSaves() {
    const toSave = { ...pendingProfileSaves };
    pendingProfileSaves = {};

    if (Object.keys(toSave).length === 0) return;

    chrome.storage.local.get(['crm_contacts'], (result) => {
        const contacts = result.crm_contacts || {};

        // Merge all pending saves
        for (const [threadId, profileData] of Object.entries(toSave)) {
            const existing = contacts[threadId] || {};
            contacts[threadId] = {
                name: profileData.name || existing.name || null,
                avatar: profileData.avatar || existing.avatar || null,
                isOnline: profileData.isOnline,
                lastSeen: Date.now()
            };
        }

        chrome.storage.local.set({ crm_contacts: contacts }, () => {
            console.log(`💾 CRM: Saved ${Object.keys(toSave).length} profiles to storage`);
        });
    });
}


function injectStatusIcon(row) {
    const threadId = getThreadId(row);
    if (!threadId) return;

    // Extract profile data with light throttling
    try {
        const now = Date.now();
        const lastExtraction = profileExtractionCache[threadId] || 0;

        // Only extract if cooldown has passed (3 seconds per thread)
        if (now - lastExtraction > EXTRACTION_COOLDOWN) {
            profileExtractionCache[threadId] = now;
            const profileData = extractProfileData(row);
            if (profileData.name || profileData.avatar) {
                console.log(`📋 CRM Profile Extracted: ${profileData.name || 'Unknown'} | Avatar: ${profileData.avatar ? '✓' : '✗'} | Online: ${profileData.isOnline ? '🟢' : '⚪'} | ID: ${threadId}`);
                saveProfileData(threadId, profileData);
            }
        }
    } catch (e) {
        // Silently fail - don't interfere with Messenger
    }

    // Check if we already injected into this row
    let icon = row.querySelector('.crm-status-icon');

    // REACT RECYCLING HANDLING
    if (icon && icon.dataset.threadId === threadId) {
        return;
    }

    if (icon) {
        icon.dataset.threadId = threadId;
        updateIconVisuals(icon, 'loading');
        row.dataset.crmStatus = 'none';
    } else {
        icon = document.createElement('div');
        icon.className = 'crm-status-icon crm-status-none';
        icon.title = 'Set CRM Status';
        icon.dataset.threadId = threadId;

        if (getComputedStyle(row).position === 'static') {
            row.style.position = 'relative';
        }
        icon.style.position = 'absolute';
        icon.style.right = '65px';
        icon.style.top = '50%';
        icon.style.transform = 'translateY(-50%)';

        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentId = icon.dataset.threadId;
            toggleMenu(e, currentId, icon, row);
        });

        row.appendChild(icon);
        row.dataset.crmInjected = 'true';
    }

    // Load status
    chrome.storage.local.get([threadId], (result) => {
        if (icon.dataset.threadId !== threadId) return;

        const status = result[threadId];
        updateIconVisuals(icon, status);
        row.dataset.crmStatus = status || 'none';

        if (currentFilter !== 'all') {
            if ((status || 'none') === currentFilter) {
                row.style.removeProperty('display');
            } else {
                row.style.setProperty('display', 'none', 'important');
            }
        } else {
            row.style.removeProperty('display');
        }
    });
}

function updateIconVisuals(icon, status) {
    icon.classList.remove('crm-status-done', 'crm-status-pending', 'crm-status-not-interested', 'crm-status-none');
    icon.style.removeProperty('background');
    icon.style.removeProperty('color');
    icon.style.removeProperty('border-color');

    // Clear any row background from previous mode
    const row = icon.closest('div[role="row"], div[role="listitem"], a[role="link"]');
    if (row) {
        row.style.removeProperty('background');
    }

    if (!status || status === 'loading') {
        icon.classList.add('crm-status-none');
        icon.textContent = STATUS_ICONS.none;
        return;
    }

    // Try to find label by status key
    const label = getLabelByStatus(status);
    if (label) {
        if (labelColorMode === 'background') {
            // BACKGROUND MODE: icon stays white, row gets label color
            icon.textContent = label.icon || '●';
            icon.style.background = '#fff';
            icon.style.color = '#333';
            icon.style.borderColor = '#ddd';
            icon.classList.add('crm-status-done');

            if (row) {
                row.style.background = `${label.color}30`;
            }
        } else if (labelColorMode === 'symbol') {
            // SYMBOL MODE: white background, label color on just the symbol
            icon.textContent = label.icon || '●';
            icon.style.background = '#fff';
            icon.style.color = label.color;
            icon.style.borderColor = '#ddd';
            icon.classList.add('crm-status-done');
        } else {
            // ICON MODE (default): colored icon with white symbol
            icon.textContent = label.icon || '●';
            icon.style.background = label.color;
            icon.style.color = '#fff';
            icon.style.borderColor = label.color;
            icon.classList.add('crm-status-done');
        }
    } else {
        // Fallback for legacy statuses
        switch (status) {
            case 'done':
                icon.classList.add('crm-status-done');
                icon.textContent = STATUS_ICONS.done;
                break;
            case 'pending':
                icon.classList.add('crm-status-pending');
                icon.textContent = STATUS_ICONS.pending;
                break;
            case 'not_interested':
                icon.classList.add('crm-status-not-interested');
                icon.textContent = STATUS_ICONS.not_interested;
                break;
            default:
                icon.classList.add('crm-status-none');
                icon.textContent = STATUS_ICONS.none;
        }
    }
}

function toggleMenu(e, threadId, icon, row) {
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }

    const menu = document.createElement('div');
    menu.className = 'crm-popup-menu';
    menu.dataset.triggerId = threadId;

    // Build options dynamically from cached labels
    cachedLabels.forEach((label, index) => {
        const statusKey = getLabelStatusKey(label, index);
        const item = document.createElement('div');
        item.className = 'crm-menu-item';

        const dot = document.createElement('div');
        dot.className = 'crm-color-dot';
        dot.style.background = label.color;

        const text = document.createTextNode(label.name);

        item.appendChild(dot);
        item.appendChild(text);

        item.addEventListener('click', (evt) => {
            evt.stopPropagation();
            saveStatus(threadId, statusKey, icon, row);
            menu.remove();
            activePopup = null;
        });

        menu.appendChild(item);
    });

    // Clear Status option
    const clearItem = document.createElement('div');
    clearItem.className = 'crm-menu-item';
    const clearDot = document.createElement('div');
    clearDot.className = 'crm-color-dot crm-dot-clear';
    clearItem.appendChild(clearDot);
    clearItem.appendChild(document.createTextNode('Clear Status'));
    clearItem.addEventListener('click', (evt) => {
        evt.stopPropagation();
        saveStatus(threadId, null, icon, row);
        menu.remove();
        activePopup = null;
    });
    menu.appendChild(clearItem);

    document.body.appendChild(menu);
    activePopup = menu;

    const rect = icon.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;

    const closeListener = (evt) => {
        if (!menu.contains(evt.target) && evt.target !== icon) {
            menu.remove();
            activePopup = null;
            document.removeEventListener('click', closeListener);
        }
    };
    setTimeout(() => {
        document.addEventListener('click', closeListener);
    }, 0);
}

function saveStatus(threadId, status, icon, row) {
    if (status) {
        chrome.storage.local.set({ [threadId]: status }, () => {
            updateIconVisuals(icon, status);
            row.dataset.crmStatus = status;
            applyFilters(); // Re-check visibility
            updateFilterCounts(); // Update counts
            logActivity(threadId, status); // Log for dashboard
        });
    } else {
        chrome.storage.local.remove([threadId], () => {
            updateIconVisuals(icon, null);
            row.dataset.crmStatus = 'none';
            applyFilters();
            updateFilterCounts(); // Update counts
        });
    }
}

// Activity Logging for Dashboard
function logActivity(threadId, status) {
    chrome.storage.local.get(['crm_activity_log'], (result) => {
        const activities = result.crm_activity_log || [];

        // Add new activity
        activities.push({
            threadId: threadId,
            status: status,
            timestamp: Date.now()
        });

        // Keep only last 50 activities
        const trimmedActivities = activities.slice(-50);

        chrome.storage.local.set({ crm_activity_log: trimmedActivities });
    });
}

function applyFilters() {
    const rows = document.querySelectorAll('div[data-crm-injected="true"]');
    rows.forEach(row => {
        if (currentFilter === 'all') {
            row.style.removeProperty('display');
        } else {
            const status = row.dataset.crmStatus || 'none';
            if (status === currentFilter) {
                row.style.removeProperty('display');
            } else {
                row.style.setProperty('display', 'none', 'important');
            }
        }
    });
}

// Import/Export Modal
function openImportExportModal() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.crm-modal-overlay');
    if (existingModal) existingModal.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'crm-modal-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'crm-modal';

    modal.innerHTML = `
        <div class="crm-modal-header">
            <h3>Import/Export Data</h3>
            <button class="crm-modal-close">&times;</button>
        </div>
        <div class="crm-modal-body">
            <div class="crm-modal-section">
                <h4>📤 Export Data</h4>
                <p>Download all your CRM status data as a JSON file.</p>
                <button class="crm-btn crm-btn-export">Export Data</button>
            </div>
            <div class="crm-modal-divider"></div>
            <div class="crm-modal-section">
                <h4>📥 Import Data</h4>
                <p>Upload a previously exported JSON file to restore your data.</p>
                <input type="file" class="crm-file-input" accept=".json" id="crm-import-file" />
                <label for="crm-import-file" class="crm-btn crm-btn-import">Choose File</label>
                <span class="crm-file-name">No file chosen</span>
                <button class="crm-btn crm-btn-confirm-import" disabled>Import Data</button>
            </div>
            <div class="crm-modal-message"></div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close modal handlers
    const closeModal = () => overlay.remove();
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    modal.querySelector('.crm-modal-close').addEventListener('click', closeModal);

    // Export handler
    modal.querySelector('.crm-btn-export').addEventListener('click', () => {
        exportData(modal);
    });

    // File input handler
    const fileInput = modal.querySelector('.crm-file-input');
    const fileNameSpan = modal.querySelector('.crm-file-name');
    const confirmImportBtn = modal.querySelector('.crm-btn-confirm-import');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameSpan.textContent = e.target.files[0].name;
            confirmImportBtn.disabled = false;
        } else {
            fileNameSpan.textContent = 'No file chosen';
            confirmImportBtn.disabled = true;
        }
    });

    // Import handler
    confirmImportBtn.addEventListener('click', () => {
        if (fileInput.files.length > 0) {
            importData(fileInput.files[0], modal);
        }
    });
}

function exportData(modal) {
    const messageEl = modal.querySelector('.crm-modal-message');

    chrome.storage.local.get(null, (items) => {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `messenger-crm-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const count = Object.keys(items).length;
        messageEl.innerHTML = `<span class="crm-msg-success">✓ Exported ${count} record(s) successfully!</span>`;
    });
}

function importData(file, modal) {
    const messageEl = modal.querySelector('.crm-modal-message');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validate data structure
            if (typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Invalid data format');
            }

            // Validate each entry
            const validStatuses = ['done', 'pending', 'not_interested'];
            const validData = {};
            let skipped = 0;

            for (const [key, value] of Object.entries(data)) {
                if (/^\d+$/.test(key) && validStatuses.includes(value)) {
                    validData[key] = value;
                } else {
                    skipped++;
                }
            }

            chrome.storage.local.set(validData, () => {
                const count = Object.keys(validData).length;
                let msg = `<span class="crm-msg-success">✓ Imported ${count} record(s) successfully!</span>`;
                if (skipped > 0) {
                    msg += `<br><span class="crm-msg-warning">⚠ Skipped ${skipped} invalid record(s).</span>`;
                }
                messageEl.innerHTML = msg;

                // Refresh the UI
                updateFilterCounts();
                processConversations();
            });
        } catch (err) {
            messageEl.innerHTML = `<span class="crm-msg-error">✕ Error: ${err.message}. Please upload a valid JSON file.</span>`;
        }
    };
    reader.onerror = () => {
        messageEl.innerHTML = `<span class="crm-msg-error">✕ Error reading file. Please try again.</span>`;
    };
    reader.readAsText(file);
}

// ==================== TEMPLATE BUTTON IN MESSENGER ====================

let templatePickerOpen = false;
let templateButton = null;

function observeChatComposer() {
    // Watch for chat composer area to appear (when user opens a conversation)
    const composerObserver = new MutationObserver(debounce(() => {
        injectTemplateButton();
    }, 1000));

    composerObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also try immediately
    setTimeout(injectTemplateButton, 2000);
}

function injectTemplateButton() {
    // Don't inject if already present
    if (document.querySelector('.crm-template-btn')) return;

    // Find the emoji/smiley button in the message bar
    const emojiBtn = document.querySelector('[aria-label="Choose an emoji"]')
        || document.querySelector('[aria-label="Choose an Emoji"]')
        || document.querySelector('[aria-label="Emoji"]');

    if (emojiBtn) {
        // Insert inline next to the emoji button
        const btn = document.createElement('div');
        btn.className = 'crm-template-btn crm-template-btn-inline';
        btn.innerHTML = '📝';
        btn.title = 'Use Template';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (templatePickerOpen) {
                closeTemplatePicker();
            } else {
                openTemplatePicker(btn);
            }
        });

        // Insert after the emoji button's container
        const emojiContainer = emojiBtn.closest('[class]') || emojiBtn.parentElement;
        if (emojiContainer && emojiContainer.parentElement) {
            emojiContainer.parentElement.insertBefore(btn, emojiContainer);
        } else {
            emojiBtn.parentElement.appendChild(btn);
        }
        templateButton = btn;
        return;
    }

    // Fallback: look for the composer area and place the button nearby
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    if (!composer) return;

    const btn = document.createElement('div');
    btn.className = 'crm-template-btn';
    btn.innerHTML = '📝';
    btn.title = 'Use Template';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (templatePickerOpen) {
            closeTemplatePicker();
        } else {
            openTemplatePicker(btn);
        }
    });

    // Position near the composer
    const rect = composer.getBoundingClientRect();
    btn.style.position = 'fixed';
    btn.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    btn.style.right = '80px';
    btn.style.zIndex = '10001';

    document.body.appendChild(btn);
    templateButton = btn;
}

function openTemplatePicker(anchorBtn) {
    closeTemplatePicker(); // Remove existing picker

    templatePickerOpen = true;
    const picker = document.createElement('div');
    picker.className = 'crm-template-picker';

    const header = document.createElement('div');
    header.className = 'crm-template-picker-header';
    header.innerHTML = '<span>📝 Templates</span><button class="crm-template-picker-close">&times;</button>';
    picker.appendChild(header);

    header.querySelector('.crm-template-picker-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTemplatePicker();
    });

    const body = document.createElement('div');
    body.className = 'crm-template-picker-body';
    body.innerHTML = '<div class="crm-template-picker-loading">Loading templates...</div>';
    picker.appendChild(body);

    document.body.appendChild(picker);

    // Position above the composer, inside the chat area
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    if (composer) {
        const composerRect = composer.getBoundingClientRect();
        const chatMain = composer.closest('[role="main"]');
        const chatRect = chatMain ? chatMain.getBoundingClientRect() : composerRect;

        picker.style.position = 'fixed';
        picker.style.bottom = `${window.innerHeight - composerRect.top + 8}px`;
        // Center within the chat column
        const pickerWidth = 320;
        const chatCenter = chatRect.left + (chatRect.width / 2);
        picker.style.left = `${chatCenter - (pickerWidth / 2)}px`;
        picker.style.right = 'auto';
    } else {
        // Fallback: position relative to the button
        const rect = anchorBtn.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.bottom = `${window.innerHeight - rect.top + 8}px`;
        picker.style.left = `${rect.left}px`;
        picker.style.right = 'auto';
    }
    picker.style.zIndex = '10002';

    // Load templates
    loadAllTemplates((allTemplates) => {
        body.innerHTML = '';

        if (allTemplates.length === 0) {
            body.innerHTML = '<div class="crm-template-picker-empty">No templates available</div>';
            return;
        }

        allTemplates.forEach(template => {
            const card = document.createElement('div');
            card.className = 'crm-template-picker-card';

            const titleRow = document.createElement('div');
            titleRow.className = 'crm-template-picker-title';
            titleRow.textContent = `${template.icon || '📄'} ${template.title}`;
            card.appendChild(titleRow);

            const preview = document.createElement('div');
            preview.className = 'crm-template-picker-preview';
            preview.textContent = template.body.substring(0, 80) + (template.body.length > 80 ? '...' : '');
            card.appendChild(preview);

            const useBtn = document.createElement('button');
            useBtn.className = 'crm-template-use-btn';
            useBtn.textContent = 'Use';
            useBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                insertTemplateIntoComposer(template.body);
                closeTemplatePicker();
            });
            card.appendChild(useBtn);

            body.appendChild(card);
        });
    });

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', templatePickerOutsideClick);
    }, 0);
}

function templatePickerOutsideClick(e) {
    const picker = document.querySelector('.crm-template-picker');
    const btn = document.querySelector('.crm-template-btn');
    if (picker && !picker.contains(e.target) && btn && !btn.contains(e.target)) {
        closeTemplatePicker();
    }
}

function closeTemplatePicker() {
    templatePickerOpen = false;
    const existing = document.querySelector('.crm-template-picker');
    if (existing) existing.remove();
    document.removeEventListener('click', templatePickerOutsideClick);
}

function loadAllTemplates(callback) {
    chrome.storage.local.get(['crm_templates', 'crm_builtin_overrides'], (result) => {
        const customTemplates = result.crm_templates || [];
        const overrides = result.crm_builtin_overrides || {};

        // Merge overrides into built-in templates
        const mergedBuiltins = BUILTIN_TEMPLATES.map(t => {
            const override = overrides[t.id];
            if (override) {
                return { ...t, title: override.title || t.title, body: override.body || t.body };
            }
            return t;
        });

        const all = [...mergedBuiltins, ...customTemplates];
        callback(all);
    });
}

function insertTemplateIntoComposer(text) {
    const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
    if (!composer) {
        console.warn('CRM: Chat composer not found');
        return;
    }

    // Focus the composer
    composer.focus();

    // Clear any existing content placeholder
    const placeholder = composer.querySelector('[data-text]');
    if (placeholder) {
        placeholder.textContent = '';
    }

    // Use execCommand for compatibility with React-managed contenteditable
    document.execCommand('insertText', false, text);

    // Dispatch input event so Messenger recognizes the text
    composer.dispatchEvent(new Event('input', { bubbles: true }));

    // Show feedback
    showTemplateToast('✅ Template inserted!');
}

function showTemplateToast(message) {
    const existing = document.querySelector('.crm-template-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'crm-template-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
