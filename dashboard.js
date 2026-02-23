// ========================================
// Messenger CRM - Full-Page Dashboard
// ========================================

// State
let allContacts = [];
let filteredContacts = [];
let selectedContacts = new Set();
let currentFilter = 'all';
let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let currentPageName = 'contacts';

// Labels State
let allLabels = [];
let editingLabelId = null;
let selectedLabelColor = '#10b981';
let selectedLabelIcon = '🏷️';

// Templates State
let customTemplates = [];
let editingTemplateId = null;
let editingBuiltinTemplate = false;
let builtinOverrides = {};

const BUILTIN_TEMPLATES = [
    { id: 'builtin_reminder', icon: '⏰', title: 'Reminder', body: 'Hi! Just a friendly reminder about our conversation. Please let me know if you have any questions or need further assistance. Looking forward to hearing from you!', builtin: true },
    { id: 'builtin_followup', icon: '🔄', title: 'Follow Up', body: 'Hey! Following up on our last chat. I wanted to check in and see if you had a chance to think things over. Feel free to reach out anytime — I\'m here to help!', builtin: true },
    { id: 'builtin_thankyou', icon: '🙏', title: 'Thank You', body: 'Thanks so much for your time and interest! I really appreciate it. If there\'s anything else I can do for you, don\'t hesitate to ask. Have a great day!', builtin: true },
    { id: 'builtin_intro', icon: '👋', title: 'Introduction', body: 'Hi there! I\'d love to introduce myself. I\'m reaching out because I think we could work really well together. Let me know if you\'d like to learn more!', builtin: true },
    { id: 'builtin_order', icon: '📦', title: 'Order Update', body: 'Hi! Here\'s an update on your order. Everything is on track and progressing smoothly. If you need any changes or have questions, just let me know!', builtin: true },
];

// DOM Elements
const contactsGrid = document.getElementById('contactsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const bulkActions = document.getElementById('bulkActions');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadContacts();
    loadLabels();
    loadTemplates();
    setupEventListeners();
    setupPageNavigation();
    setupLabelsPage();
    setupTemplatesPage();
    setupSettingsPage();
});

// Load Contacts from Storage
function loadContacts() {
    showLoading(true);

    chrome.storage.local.get(null, (items) => {
        allContacts = [];

        // Get profile data
        const profileData = items.crm_contacts || {};

        Object.entries(items).forEach(([key, value]) => {
            // Skip internal keys
            if (key.startsWith('crm_')) return;

            // Only process thread IDs (numeric keys)
            if (/^\d+$/.test(key)) {
                const profile = profileData[key] || {};
                allContacts.push({
                    threadId: key,
                    status: value,
                    name: profile.name || `Thread ${key.slice(-4)}`,
                    avatar: profile.avatar || null,
                    isOnline: profile.isOnline || false,
                    lastSeen: profile.lastSeen || null
                });
            }
        });

        // Sort by most recent (assuming higher IDs are newer)
        allContacts.sort((a, b) => b.threadId.localeCompare(a.threadId));

        updateStats();
        applyFilter();
        showLoading(false);
    });
}

// Update Stats
function updateStats() {
    const counts = {
        done: 0,
        pending: 0,
        not_interested: 0,
        none: 0
    };

    allContacts.forEach(contact => {
        if (counts.hasOwnProperty(contact.status)) {
            counts[contact.status]++;
        }
    });

    // Unlabeled count
    counts.none = allContacts.filter(c => !c.status || c.status === 'none').length;

    document.getElementById('totalCount').textContent = allContacts.length;
    document.getElementById('doneCount').textContent = counts.done;
    document.getElementById('pendingCount').textContent = counts.pending;
    document.getElementById('notInterestedCount').textContent = counts.not_interested;
    document.getElementById('unlabeledCount').textContent = counts.none;
}

// Apply Filter
function applyFilter() {
    const searchTerm = searchInput.value.toLowerCase();

    filteredContacts = allContacts.filter(contact => {
        // Status filter
        let matchesStatus = true;
        if (currentFilter === 'none') {
            matchesStatus = !contact.status || contact.status === 'none';
        } else if (currentFilter !== 'all') {
            matchesStatus = contact.status === currentFilter;
        }

        // Search filter
        const matchesSearch = !searchTerm ||
            contact.threadId.includes(searchTerm) ||
            contact.name.toLowerCase().includes(searchTerm);

        return matchesStatus && matchesSearch;
    });

    currentPage = 1;
    renderContacts();
    renderPagination();
}

// Render Contacts
function renderContacts() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageContacts = filteredContacts.slice(start, end);

    if (filteredContacts.length === 0) {
        contactsGrid.innerHTML = '';
        emptyState.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    pagination.style.display = 'flex';

    contactsGrid.innerHTML = pageContacts.map(contact => createContactCard(contact)).join('');

    // Add event listeners
    document.querySelectorAll('.contact-card').forEach(card => {
        const threadId = card.dataset.threadId;

        // Click to select
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.contact-action-btn')) {
                toggleSelection(threadId);
            }
        });

        // Right-click context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, threadId);
        });
    });

    // Action buttons
    document.querySelectorAll('.contact-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const threadId = btn.closest('.contact-card').dataset.threadId;
            const action = btn.dataset.action;

            if (action === 'chat') {
                // Open chat in new tab
                window.open(`https://www.messenger.com/t/${threadId}`, '_blank');
            } else {
                updateContactStatus(threadId, action);
            }
        });
    });
}

// Create Contact Card HTML
function createContactCard(contact) {
    const isSelected = selectedContacts.has(contact.threadId);
    const statusClass = contact.status ? `status-${contact.status}` : 'status-none';
    const statusLabel = getStatusLabel(contact.status);

    // Avatar: use profile image or fallback to emoji
    const avatarContent = contact.avatar
        ? `<img src="${contact.avatar}" alt="${contact.name}" class="avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span class="avatar-fallback" style="display:none;">👤</span>`
        : `<span class="avatar-fallback">👤</span>`;

    // Online indicator
    const onlineIndicator = contact.isOnline
        ? `<div class="online-indicator" title="Online"></div>`
        : '';

    return `
    <div class="contact-card ${isSelected ? 'selected' : ''}" data-thread-id="${contact.threadId}">
      <div class="contact-checkbox">${isSelected ? '✓' : ''}</div>
      <div class="contact-avatar-wrapper">
        <div class="contact-avatar">${avatarContent}</div>
        ${onlineIndicator}
      </div>
      <div class="contact-name" title="${contact.name}">${contact.name}</div>
      <div class="contact-id">ID: ${contact.threadId}</div>
      <div class="contact-status ${statusClass}">${statusLabel}</div>
      <div class="contact-actions">
        <button class="contact-action-btn btn-chat" data-action="chat" title="Open Chat">💬</button>
        <button class="contact-action-btn btn-done" data-action="done" title="Done">✓</button>
        <button class="contact-action-btn btn-pending" data-action="pending" title="Pending">⏳</button>
        <button class="contact-action-btn btn-not-interested" data-action="not_interested" title="Not Interested">✕</button>
      </div>
    </div>
  `;
}

// Get Status Label
function getStatusLabel(status) {
    const labels = {
        'done': 'Done',
        'pending': 'Pending',
        'not_interested': 'No Interest',
        'none': 'No Status'
    };
    return labels[status] || 'No Status';
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
    const pageNumbers = document.getElementById('pageNumbers');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    // Prev button
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;

    // Page numbers
    let pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    pageNumbers.innerHTML = pages.map(p => {
        if (p === '...') {
            return '<span class="page-dots">...</span>';
        }
        return `<button class="page-num ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }).join('');

    // Page click handlers
    pageNumbers.querySelectorAll('.page-num').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderContacts();
            renderPagination();
            window.scrollTo(0, 0);
        });
    });
}

// Toggle Selection
function toggleSelection(threadId) {
    if (selectedContacts.has(threadId)) {
        selectedContacts.delete(threadId);
    } else {
        selectedContacts.add(threadId);
    }

    updateBulkActions();
    renderContacts();
}

// Update Bulk Actions Bar
function updateBulkActions() {
    if (selectedContacts.size > 0) {
        bulkActions.style.display = 'flex';
        document.getElementById('selectedCount').textContent = selectedContacts.size;
    } else {
        bulkActions.style.display = 'none';
    }
}

// Update Contact Status
function updateContactStatus(threadId, status) {
    if (status === 'clear' || !status) {
        chrome.storage.local.remove([threadId], () => {
            const contact = allContacts.find(c => c.threadId === threadId);
            if (contact) contact.status = 'none';
            updateStats();
            renderContacts();
            logActivity(threadId, status);
        });
    } else {
        chrome.storage.local.set({ [threadId]: status }, () => {
            const contact = allContacts.find(c => c.threadId === threadId);
            if (contact) contact.status = status;
            updateStats();
            renderContacts();
            logActivity(threadId, status);
        });
    }
}

// Bulk Update Status
function bulkUpdateStatus(status) {
    const updates = {};
    const removes = [];

    selectedContacts.forEach(threadId => {
        if (status === 'clear') {
            removes.push(threadId);
        } else {
            updates[threadId] = status;
        }
    });

    const afterUpdate = () => {
        selectedContacts.forEach(threadId => {
            const contact = allContacts.find(c => c.threadId === threadId);
            if (contact) {
                contact.status = status === 'clear' ? 'none' : status;
            }
        });

        selectedContacts.clear();
        updateBulkActions();
        updateStats();
        renderContacts();
    };

    if (removes.length > 0) {
        chrome.storage.local.remove(removes, afterUpdate);
    } else if (Object.keys(updates).length > 0) {
        chrome.storage.local.set(updates, afterUpdate);
    }
}

// Log Activity
function logActivity(threadId, status) {
    chrome.storage.local.get(['crm_activity_log'], (result) => {
        const activities = result.crm_activity_log || [];
        activities.push({
            threadId,
            status,
            timestamp: Date.now()
        });
        chrome.storage.local.set({ crm_activity_log: activities.slice(-50) });
    });
}

// Context Menu
function showContextMenu(e, threadId) {
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.dataset.threadId = threadId;

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 0);
}

function closeContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    document.removeEventListener('click', closeContextMenu);
}

// Show/Hide Loading
function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        contactsGrid.innerHTML = '';
        emptyState.style.display = 'none';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Stat tabs
    document.querySelectorAll('.stat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.stat-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            applyFilter();
        });
    });

    // Search
    searchInput.addEventListener('input', debounce(applyFilter, 300));

    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', loadContacts);

    // Open Messenger
    document.getElementById('openMessengerBtn').addEventListener('click', () => {
        window.open('https://messenger.com', '_blank');
    });

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderContacts();
            renderPagination();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderContacts();
            renderPagination();
        }
    });

    // Bulk actions
    document.getElementById('bulkDone').addEventListener('click', () => bulkUpdateStatus('done'));
    document.getElementById('bulkPending').addEventListener('click', () => bulkUpdateStatus('pending'));
    document.getElementById('bulkNotInterested').addEventListener('click', () => bulkUpdateStatus('not_interested'));
    document.getElementById('bulkClear').addEventListener('click', () => bulkUpdateStatus('clear'));

    // Context menu actions
    document.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
            const menu = document.getElementById('contextMenu');
            const threadId = menu.dataset.threadId;
            const action = item.dataset.action;

            if (action === 'open') {
                window.open(`https://messenger.com/t/${threadId}`, '_blank');
            } else if (action === 'clear') {
                updateContactStatus(threadId, null);
            } else {
                updateContactStatus(threadId, action);
            }

            closeContextMenu();
        });
    });

    // Import/Export Modal
    document.getElementById('importExportBtn').addEventListener('click', () => {
        document.getElementById('importExportModal').style.display = 'flex';
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('importExportModal').style.display = 'none';
    });

    document.getElementById('importExportModal').addEventListener('click', (e) => {
        if (e.target.id === 'importExportModal') {
            document.getElementById('importExportModal').style.display = 'none';
        }
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            document.getElementById('fileName').textContent = e.target.files[0].name;
            importData(e.target.files[0]);
        }
    });
}

// Export Data
function exportData() {
    chrome.storage.local.get(null, (items) => {
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

        showModalMessage('success', `✓ Exported ${Object.keys(exportData).length} contacts!`);
    });
}

// Import Data
function importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('Invalid format');
            }

            const validStatuses = ['done', 'pending', 'not_interested'];
            const validData = {};

            for (const [key, value] of Object.entries(data)) {
                if (/^\d+$/.test(key) && validStatuses.includes(value)) {
                    validData[key] = value;
                }
            }

            chrome.storage.local.set(validData, () => {
                showModalMessage('success', `✓ Imported ${Object.keys(validData).length} contacts!`);
                loadContacts();
            });
        } catch (err) {
            showModalMessage('error', '✕ Invalid file format');
        }
    };
    reader.readAsText(file);
}

// Show Modal Message
function showModalMessage(type, message) {
    const msgEl = document.getElementById('modalMessage');
    msgEl.className = `modal-message ${type}`;
    msgEl.textContent = message;
}

// Debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ========================================
// Page Navigation
// ========================================

function setupPageNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(pageName) {
    currentPageName = pageName;

    // Update nav active state
    document.querySelectorAll('.nav-item[data-page]').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === pageName);
    });

    // Show/hide page sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.toggle('active', section.id === `page-${pageName}`);
    });

    // Update page title
    const titles = { contacts: 'Contacts', labels: 'Labels', templates: 'Templates', settings: 'Settings' };
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;

    // Show/hide header elements based on page
    const headerCenter = document.querySelector('.header-center');
    const headerRight = document.querySelector('.header-right');
    if (pageName === 'contacts') {
        headerCenter.style.display = '';
        headerRight.style.display = '';
    } else {
        headerCenter.style.display = 'none';
        headerRight.style.display = 'none';
    }
}

// ========================================
// Settings
// ========================================

function setupSettingsPage() {
    // Load saved setting
    chrome.storage.local.get(['crm_settings'], (result) => {
        const settings = result.crm_settings || {};
        const colorMode = settings.labelColorMode || 'symbol';

        // Set active toggle
        document.querySelectorAll('#colorModeToggle .settings-toggle-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === colorMode);
        });
    });

    // Toggle click handlers
    document.querySelectorAll('#colorModeToggle .settings-toggle-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('#colorModeToggle .settings-toggle-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            const mode = opt.dataset.value;
            chrome.storage.local.get(['crm_settings'], (result) => {
                const settings = result.crm_settings || {};
                settings.labelColorMode = mode;
                chrome.storage.local.set({ crm_settings: settings });
            });
        });
    });
}

// ========================================
// Labels Management
// ========================================

const DEFAULT_LABELS = [
    { id: 'label_done', name: 'Done (Bought)', color: '#10b981', statusKey: 'done', icon: '✓' },
    { id: 'label_pending', name: 'In Pending', color: '#f59e0b', statusKey: 'pending', icon: '⏳' },
    { id: 'label_not_interested', name: 'Not Interested', color: '#ef4444', statusKey: 'not_interested', icon: '✕' },
];

function loadLabels() {
    chrome.storage.local.get(['crm_labels'], (result) => {
        if (result.crm_labels && result.crm_labels.length > 0) {
            allLabels = result.crm_labels;
        } else {
            allLabels = [...DEFAULT_LABELS];
            saveLabels();
        }
        renderLabels();
    });
}

function saveLabels(callback) {
    chrome.storage.local.set({ crm_labels: allLabels }, () => {
        if (callback) callback();
    });
}

function renderLabels() {
    const container = document.getElementById('labelsList');
    if (!container) return;

    if (allLabels.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏷️</div>
                <h3>No labels yet</h3>
                <p>Click "Add Label" to create your first label.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allLabels.map(label => `
        <div class="label-item" data-label-id="${label.id}">
            <div class="label-info">
                <div class="label-color-dot" style="background: ${label.color}">${label.icon || '🏷️'}</div>
                <span class="label-name">${label.name}</span>
            </div>
            <div class="label-actions">
                <button class="label-action-btn label-edit-btn" data-label-id="${label.id}" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="label-action-btn label-delete-btn" data-label-id="${label.id}" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    container.querySelectorAll('.label-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditLabelModal(btn.dataset.labelId));
    });

    container.querySelectorAll('.label-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteLabel(btn.dataset.labelId));
    });
}

function setupLabelsPage() {
    // Add label button
    document.getElementById('addLabelBtn').addEventListener('click', () => openAddLabelModal());

    // Label modal close
    document.getElementById('closeLabelModal').addEventListener('click', closeLabelModal);
    document.getElementById('cancelLabelBtn').addEventListener('click', closeLabelModal);

    // Label modal overlay click to close
    document.getElementById('labelModal').addEventListener('click', (e) => {
        if (e.target.id === 'labelModal') closeLabelModal();
    });

    // Color swatch selection
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            selectedLabelColor = swatch.dataset.color;
        });
    });

    // Icon swatch selection
    document.querySelectorAll('.icon-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.icon-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            selectedLabelIcon = swatch.dataset.icon;
        });
    });

    // Save label
    document.getElementById('saveLabelBtn').addEventListener('click', saveLabel);

    // Enter key to save
    document.getElementById('labelNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveLabel();
    });
}

function openAddLabelModal() {
    editingLabelId = null;
    document.getElementById('labelModalTitle').textContent = 'Add Label';
    document.getElementById('labelNameInput').value = '';
    selectedLabelColor = '#10b981';
    selectedLabelIcon = '🏷️';

    // Reset color selection
    document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === '#10b981');
    });

    // Reset icon selection
    document.querySelectorAll('.icon-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.icon === '🏷️');
    });

    document.getElementById('labelModal').style.display = 'flex';
    document.getElementById('labelNameInput').focus();
}

function openEditLabelModal(labelId) {
    const label = allLabels.find(l => l.id === labelId);
    if (!label) return;

    editingLabelId = labelId;
    document.getElementById('labelModalTitle').textContent = 'Edit Label';
    document.getElementById('labelNameInput').value = label.name;
    selectedLabelColor = label.color;
    selectedLabelIcon = label.icon || '🏷️';

    // Set color selection
    document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === label.color);
    });

    // Set icon selection
    document.querySelectorAll('.icon-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.icon === (label.icon || '🏷️'));
    });

    document.getElementById('labelModal').style.display = 'flex';
    document.getElementById('labelNameInput').focus();
}

function closeLabelModal() {
    document.getElementById('labelModal').style.display = 'none';
    editingLabelId = null;
}

function saveLabel() {
    const name = document.getElementById('labelNameInput').value.trim();
    if (!name) {
        document.getElementById('labelNameInput').style.borderColor = '#ef4444';
        setTimeout(() => { document.getElementById('labelNameInput').style.borderColor = ''; }, 2000);
        return;
    }

    if (editingLabelId) {
        // Update existing label
        const label = allLabels.find(l => l.id === editingLabelId);
        if (label) {
            label.name = name;
            label.color = selectedLabelColor;
            label.icon = selectedLabelIcon;
        }
    } else {
        // Create new label
        const newLabel = {
            id: 'label_' + Date.now(),
            name: name,
            color: selectedLabelColor,
            icon: selectedLabelIcon
        };
        allLabels.push(newLabel);
    }

    saveLabels(() => {
        renderLabels();
        closeLabelModal();
    });
}

function deleteLabel(labelId) {
    const label = allLabels.find(l => l.id === labelId);
    if (!label) return;

    if (confirm(`Are you sure you want to delete the label "${label.name}"?`)) {
        allLabels = allLabels.filter(l => l.id !== labelId);
        saveLabels(() => renderLabels());
    }
}

// ========================================
// Templates Management
// ========================================

function loadTemplates() {
    chrome.storage.local.get(['crm_templates', 'crm_builtin_overrides'], (result) => {
        customTemplates = result.crm_templates || [];
        builtinOverrides = result.crm_builtin_overrides || {};
        renderTemplates();
    });
}

function saveTemplates(callback) {
    chrome.storage.local.set({ crm_templates: customTemplates, crm_builtin_overrides: builtinOverrides }, () => {
        if (callback) callback();
    });
}

function renderTemplates() {
    const builtinContainer = document.getElementById('builtinTemplates');
    const customContainer = document.getElementById('customTemplates');
    const customEmpty = document.getElementById('customTemplatesEmpty');

    if (!builtinContainer || !customContainer) return;

    // Render built-in templates (with overrides applied)
    const mergedBuiltins = BUILTIN_TEMPLATES.map(t => {
        const override = builtinOverrides[t.id];
        if (override) {
            return { ...t, title: override.title || t.title, body: override.body || t.body };
        }
        return t;
    });
    builtinContainer.innerHTML = mergedBuiltins.map(t => createTemplateCard(t, true)).join('');

    // Render custom templates
    if (customTemplates.length === 0) {
        customContainer.innerHTML = '';
        customEmpty.style.display = 'block';
    } else {
        customEmpty.style.display = 'none';
        customContainer.innerHTML = customTemplates.map(t => createTemplateCard(t, false)).join('');
    }

    // Attach event listeners
    document.querySelectorAll('.template-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyTemplateText(btn.dataset.templateId);
        });
    });

    document.querySelectorAll('.template-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTemplateModal(btn.dataset.templateId);
        });
    });

    document.querySelectorAll('.template-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTemplate(btn.dataset.templateId);
        });
    });

    document.querySelectorAll('.template-reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetBuiltinTemplate(btn.dataset.templateId);
        });
    });
}

function createTemplateCard(template, isBuiltin) {
    const preview = template.body.length > 100 ? template.body.substring(0, 100) + '...' : template.body;
    const icon = template.icon || '📝';

    return `
        <div class="template-card ${isBuiltin ? 'builtin' : 'custom'}">
            <div class="template-header">
                <div class="template-icon">${icon}</div>
                <div class="template-title">${template.title}</div>
                ${isBuiltin ? '<span class="template-badge">Built-in</span>' : ''}
            </div>
            <div class="template-body">${preview}</div>
            <div class="template-footer">
                <button class="template-action-btn template-copy-btn" data-template-id="${template.id}" title="Copy to clipboard">
                    📋 Copy
                </button>
                <button class="template-action-btn template-edit-btn" data-template-id="${template.id}" title="Edit">
                    ✏️ Edit
                </button>
                ${!isBuiltin ? `
                    <button class="template-action-btn template-delete-btn" data-template-id="${template.id}" title="Delete">
                        🗑️ Delete
                    </button>
                ` : ''}
                ${isBuiltin && builtinOverrides[template.id] ? `
                    <button class="template-action-btn template-reset-btn" data-template-id="${template.id}" title="Reset to default">
                        ↩️ Reset
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function setupTemplatesPage() {
    // Add template button
    document.getElementById('addTemplateBtn').addEventListener('click', () => openAddTemplateModal());

    // Template modal close
    document.getElementById('closeTemplateModal').addEventListener('click', closeTemplateModal);
    document.getElementById('cancelTemplateBtn').addEventListener('click', closeTemplateModal);

    // Template modal overlay click to close
    document.getElementById('templateModal').addEventListener('click', (e) => {
        if (e.target.id === 'templateModal') closeTemplateModal();
    });

    // Save template
    document.getElementById('saveTemplateBtn').addEventListener('click', saveTemplate);
}

function openAddTemplateModal() {
    editingTemplateId = null;
    document.getElementById('templateModalTitle').textContent = 'Add Template';
    document.getElementById('templateTitleInput').value = '';
    document.getElementById('templateBodyInput').value = '';
    document.getElementById('templateModal').style.display = 'flex';
    document.getElementById('templateTitleInput').focus();
}

function openEditTemplateModal(templateId) {
    // Check if it's a built-in template
    const builtin = BUILTIN_TEMPLATES.find(t => t.id === templateId);
    if (builtin) {
        const override = builtinOverrides[templateId];
        editingTemplateId = templateId;
        editingBuiltinTemplate = true;
        document.getElementById('templateModalTitle').textContent = 'Edit Built-in Template';
        document.getElementById('templateTitleInput').value = override ? override.title : builtin.title;
        document.getElementById('templateBodyInput').value = override ? override.body : builtin.body;
        document.getElementById('templateModal').style.display = 'flex';
        document.getElementById('templateTitleInput').focus();
        return;
    }

    const template = customTemplates.find(t => t.id === templateId);
    if (!template) return;

    editingTemplateId = templateId;
    editingBuiltinTemplate = false;
    document.getElementById('templateModalTitle').textContent = 'Edit Template';
    document.getElementById('templateTitleInput').value = template.title;
    document.getElementById('templateBodyInput').value = template.body;
    document.getElementById('templateModal').style.display = 'flex';
    document.getElementById('templateTitleInput').focus();
}

function closeTemplateModal() {
    document.getElementById('templateModal').style.display = 'none';
    editingTemplateId = null;
}

function saveTemplate() {
    const title = document.getElementById('templateTitleInput').value.trim();
    const body = document.getElementById('templateBodyInput').value.trim();

    if (!title || !body) {
        if (!title) {
            document.getElementById('templateTitleInput').style.borderColor = '#ef4444';
            setTimeout(() => { document.getElementById('templateTitleInput').style.borderColor = ''; }, 2000);
        }
        if (!body) {
            document.getElementById('templateBodyInput').style.borderColor = '#ef4444';
            setTimeout(() => { document.getElementById('templateBodyInput').style.borderColor = ''; }, 2000);
        }
        return;
    }

    if (editingTemplateId) {
        if (editingBuiltinTemplate) {
            // Save as built-in override
            builtinOverrides[editingTemplateId] = { title, body };
        } else {
            // Update existing custom template
            const template = customTemplates.find(t => t.id === editingTemplateId);
            if (template) {
                template.title = title;
                template.body = body;
            }
        }
    } else {
        // Create new template
        const newTemplate = {
            id: 'template_' + Date.now(),
            icon: '📝',
            title: title,
            body: body
        };
        customTemplates.push(newTemplate);
    }

    saveTemplates(() => {
        renderTemplates();
        closeTemplateModal();
    });
}

function resetBuiltinTemplate(templateId) {
    if (confirm('Reset this template to its original default?')) {
        delete builtinOverrides[templateId];
        saveTemplates(() => renderTemplates());
    }
}

function deleteTemplate(templateId) {
    const template = customTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (confirm(`Are you sure you want to delete the template "${template.title}"?`)) {
        customTemplates = customTemplates.filter(t => t.id !== templateId);
        saveTemplates(() => renderTemplates());
    }
}

function copyTemplateText(templateId) {
    // Search in both built-in and custom templates
    const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates];
    const template = allTemplates.find(t => t.id === templateId);
    if (!template) return;

    navigator.clipboard.writeText(template.body).then(() => {
        // Visual feedback
        const btn = document.querySelector(`.template-copy-btn[data-template-id="${templateId}"]`);
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            btn.style.color = '#10b981';
            setTimeout(() => {
                btn.innerHTML = original;
                btn.style.color = '';
            }, 2000);
        }
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = template.body;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const btn = document.querySelector(`.template-copy-btn[data-template-id="${templateId}"]`);
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
    });
}
