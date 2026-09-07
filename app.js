// Password for login
const PASSWORD = 'hyunjinjakob';

// State
let currentUser = null;
let currentDate = new Date();
let allEntries = {};
let currentTags = [];
let currentMonth = new Date();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    setDefaultDate();

    document.getElementById('entry-text').addEventListener('input', updateMarkdownPreview);
    updateMarkdownPreview();
});

const ENTRY_TEMPLATE = `## Symptoms
-

## Activity
- Exercise:
- Intensity:

## Notes
-`;

function loadTemplate() {
    const textarea = document.getElementById('entry-text');
    if (textarea.value.trim() && !confirm('Replace current notes with the template?')) {
        return;
    }
    textarea.value = ENTRY_TEMPLATE;
    updateMarkdownPreview();
}

// ============================================================================
// LOGIN / LOGOUT
// ============================================================================

function login() {
    const input = document.getElementById('password-input');
    const password = input.value;
    
    if (password === PASSWORD) {
        localStorage.setItem('journal_auth', 'true');
        currentUser = true;
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        input.value = '';
        loadAllEntries();
    } else {
        alert('Wrong password');
        input.value = '';
    }
}

function logout() {
    if (confirm('Logout?')) {
        localStorage.removeItem('journal_auth');
        currentUser = null;
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('password-input').focus();
    }
}

function checkLogin() {
    if (localStorage.getItem('journal_auth')) {
        currentUser = true;
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('app-screen').classList.add('active');
        loadAllEntries();
    } else {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('password-input').focus();
    }
}



// ============================================================================
// MARKDOWN RENDERING
// ============================================================================

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function parseInline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function renderMarkdown(text) {
    if (!text || !text.trim()) return '';

    const lines = text.split('\n');
    const html = [];
    let listType = null; // 'ul' | 'ol' | null
    let paragraph = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            html.push(`<p>${paragraph.join('<br>')}</p>`);
            paragraph = [];
        }
    };

    const closeList = () => {
        if (listType) {
            html.push(`</${listType}>`);
            listType = null;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        const checkbox = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        const bullet = line.match(/^[-*]\s+(.*)$/);
        const numbered = line.match(/^\d+\.\s+(.*)$/);
        const quote = line.match(/^>\s?(.*)$/);

        if (heading) {
            flushParagraph();
            closeList();
            const level = heading[1].length;
            html.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
        } else if (checkbox) {
            flushParagraph();
            if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
            const checked = checkbox[1].toLowerCase() === 'x';
            const checkedClass = checked ? ' class="checked"' : '';
            html.push(`<li${checkedClass}><input type="checkbox" disabled ${checked ? 'checked' : ''} /> ${parseInline(checkbox[2])}</li>`);
        } else if (bullet) {
            flushParagraph();
            if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
            html.push(`<li>${parseInline(bullet[1])}</li>`);
        } else if (numbered) {
            flushParagraph();
            if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
            html.push(`<li>${parseInline(numbered[1])}</li>`);
        } else if (quote) {
            flushParagraph();
            closeList();
            html.push(`<blockquote>${parseInline(quote[1])}</blockquote>`);
        } else if (line === '') {
            flushParagraph();
            closeList();
        } else {
            closeList();
            paragraph.push(parseInline(line));
        }
    }
    flushParagraph();
    closeList();

    return html.join('');
}

function updateMarkdownPreview() {
    const text = document.getElementById('entry-text').value;
    const preview = document.getElementById('markdown-preview');
    preview.innerHTML = text.trim()
        ? renderMarkdown(text)
        : '<p class="preview-empty">Preview appears here as you write.</p>';
}

// ============================================================================
// ENTRIES MANAGEMENT
// ============================================================================

async function loadAllEntries() {
    try {
        const entriesRef = window.firebase.ref(window.firebase.database, 'entries');
        const snapshot = await window.firebase.get(entriesRef);
        
        if (snapshot.exists()) {
            allEntries = snapshot.val();
            updateTagSuggestions();
            renderCalendar();
            updateSummary();
        }
    } catch (error) {
        console.error('Error loading entries:', error);
    }
}

async function saveEntry() {
    const date = document.getElementById('entry-date').value;
    const text = document.getElementById('entry-text').value;
    
    // Commit any pending tag
    commitPendingTag();
    
    if (!date) {
        alert('Please select a date');
        return;
    }

    const supplements = {
        folate: document.getElementById('supplement-folate').checked,
        inderal5: document.getElementById('supplement-inderal5').checked,
        inderal10: document.getElementById('supplement-inderal10').checked
    };

    const entry = {
        date,
        tags: currentTags,
        text,
        supplements,
        period: document.getElementById('period').checked,
        tryingToConceive: document.getElementById('trying-to-conceive').checked,
        updatedAt: new Date().toISOString()
    };

    try {
        const entryRef = window.firebase.ref(window.firebase.database, `entries/${date}`);
        await window.firebase.set(entryRef, entry);
        alert('Entry saved!');
        await loadAllEntries();
        clearForm();
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('Error saving entry');
    }
}

async function deleteEntry() {
    const date = document.getElementById('entry-date').value;
    
    if (!date) {
        alert('Select a date first');
        return;
    }

    if (!confirm('Delete this entry?')) {
        return;
    }

    try {
        const entryRef = window.firebase.ref(window.firebase.database, `entries/${date}`);
        await window.firebase.remove(entryRef);
        alert('Entry deleted!');
        await loadAllEntries();
        clearForm();
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry');
    }
}

async function loadEntry(date) {
    if (allEntries[date]) {
        const entry = allEntries[date];
        document.getElementById('entry-date').value = date;
        document.getElementById('entry-text').value = entry.text || '';
        currentTags = entry.tags || [];
        renderTags();
        
        const supplements = entry.supplements || {};
        document.getElementById('supplement-folate').checked = supplements.folate || false;
        document.getElementById('supplement-inderal5').checked = supplements.inderal5 || false;
        document.getElementById('supplement-inderal10').checked = supplements.inderal10 || false;
        document.getElementById('period').checked = entry.period || false;
        document.getElementById('trying-to-conceive').checked = entry.tryingToConceive || false;
    } else {
        document.getElementById('entry-date').value = date;
        document.getElementById('entry-text').value = '';
        currentTags = [];
        renderTags();
        
        document.getElementById('supplement-folate').checked = false;
        document.getElementById('supplement-inderal5').checked = false;
        document.getElementById('supplement-inderal10').checked = false;
        document.getElementById('period').checked = false;
        document.getElementById('trying-to-conceive').checked = false;
    }
    updateMarkdownPreview();
}

function loadEntryForEdit(date) {
    loadEntry(date);
    showView('write');
}

function clearForm() {
    setDefaultDate();
    document.getElementById('entry-text').value = '';
    currentTags = [];
    renderTags();
    document.getElementById('supplement-folate').checked = false;
    document.getElementById('supplement-inderal5').checked = false;
    document.getElementById('supplement-inderal10').checked = false;
    document.getElementById('period').checked = false;
    document.getElementById('trying-to-conceive').checked = false;
    updateMarkdownPreview();
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entry-date').value = today;
}

// ============================================================================
// TAG MANAGEMENT
// ============================================================================

function handleTagInput(event) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        addTag();
    }
}

function addTag() {
    const input = document.getElementById('tag-input');
    const tag = input.value.trim().replace(/,/g, '').toLowerCase();
    
    if (tag && !currentTags.includes(tag)) {
        currentTags.push(tag);
        renderTags();
    }
    
    input.value = '';
    hideSuggestions();
}

function commitPendingTag() {
    const input = document.getElementById('tag-input');
    if (input.value.trim()) {
        addTag();
    }
}

function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('current-tags');
    container.innerHTML = currentTags
        .map(tag => `<span class="tag">${tag} <button onclick="removeTag('${tag}')" class="tag-remove">×</button></span>`)
        .join('');
}

function updateTagSuggestions() {
    const tagFreq = {};
    Object.values(allEntries).forEach(entry => {
        (entry.tags || []).forEach(tag => {
            tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
    });
    
    window.allTagSuggestions = Object.keys(tagFreq)
        .sort((a, b) => tagFreq[b] - tagFreq[a]);
}

function showTagSuggestions() {
    const input = document.getElementById('tag-input').value.toLowerCase();
    if (!input) return;
    
    const suggestions = window.allTagSuggestions
        .filter(tag => tag.includes(input) && !currentTags.includes(tag))
        .slice(0, 5);
    
    const container = document.getElementById('tag-suggestions');
    container.innerHTML = suggestions
        .map(tag => `<div class="suggestion" onmousedown="event.preventDefault(); currentTags.push('${tag}'); document.getElementById('tag-input').value = ''; renderTags(); hideSuggestions();">${tag}</div>`)
        .join('');
}

function hideSuggestions() {
    document.getElementById('tag-suggestions').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
        tagInput.addEventListener('input', showTagSuggestions);
    }
});

// ============================================================================
// CYCLE PREDICTION (fertile window / next expected period)
// ============================================================================

const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_PHASE_LENGTH = 14; // days between ovulation and next period, fairly constant

function parseDateOnly(dateStr) {
    return new Date(`${dateStr}T00:00:00`);
}

function formatDateOnly(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

// Group consecutive logged period days into { start, length } runs, so a
// multi-day period only counts once when averaging cycle length.
function getPeriodGroups() {
    const periodDates = Object.keys(allEntries).filter(d => allEntries[d].period).sort();
    const dateSet = new Set(periodDates);
    const groups = [];

    for (const d of periodDates) {
        const prevStr = formatDateOnly(addDays(parseDateOnly(d), -1));
        if (dateSet.has(prevStr)) continue; // not a run start

        let length = 1;
        let cursor = d;
        while (dateSet.has(formatDateOnly(addDays(parseDateOnly(cursor), 1)))) {
            cursor = formatDateOnly(addDays(parseDateOnly(cursor), 1));
            length++;
        }
        groups.push({ start: d, length });
    }
    return groups;
}

// Predicts the next period's days and the fertile window leading up to it,
// based on past logged period entries. Returns null if nothing is logged yet.
function getCyclePrediction() {
    const groups = getPeriodGroups();
    if (groups.length === 0) return null;

    let cycleLength = DEFAULT_CYCLE_LENGTH;
    if (groups.length >= 2) {
        const diffs = [];
        for (let i = 1; i < groups.length; i++) {
            const days = Math.round((parseDateOnly(groups[i].start) - parseDateOnly(groups[i - 1].start)) / 86400000);
            diffs.push(days);
        }
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        cycleLength = Math.min(45, Math.max(18, Math.round(avg)));
    }

    const avgDuration = Math.round(groups.reduce((a, g) => a + g.length, 0) / groups.length) || DEFAULT_PERIOD_LENGTH;

    const lastStart = parseDateOnly(groups[groups.length - 1].start);
    const nextPeriodStart = addDays(lastStart, cycleLength);

    const periodDays = new Set();
    for (let i = 0; i < avgDuration; i++) periodDays.add(formatDateOnly(addDays(nextPeriodStart, i)));

    const ovulationDay = addDays(nextPeriodStart, -LUTEAL_PHASE_LENGTH);
    const fertileDays = new Set();
    for (let i = -5; i <= 1; i++) fertileDays.add(formatDateOnly(addDays(ovulationDay, i)));

    return { periodDays, fertileDays };
}

// ============================================================================
// CALENDAR VIEW
// ============================================================================

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('calendar-month').textContent = monthName;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = '';

    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    const prediction = getCyclePrediction();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = allEntries[dateStr];
        const tags = entry ? entry.tags || [] : [];
        const tagsHtml = tags.slice(0, 2).map(t => `<span class="calendar-tag">${t}</span>`).join('');
        const moreCount = tags.length > 2 ? `<span class="calendar-more">+${tags.length - 2}</span>` : '';
        const periodTag = (entry && entry.period) ? '<span class="calendar-tag calendar-tag-period">Period</span>' : '';
        const hasEntry = entry ? 'has-entry' : '';
        const folateCheckmark = (entry && entry.supplements && entry.supplements.folate) ? '<span class="calendar-checkmark">✓</span>' : '';
        const tryingHeart = (entry && entry.tryingToConceive) ? '<span class="calendar-heart">♡</span>' : '';

        // Cycle shading applies regardless of whether the day already has a
        // logged entry, so a fertile/period day you also wrote in shows
        // both the "has data" outline and the shade. An actual logged
        // period day is shaded the same red as a predicted one.
        let cycleClass = '';
        if ((entry && entry.period) || (prediction && prediction.periodDays.has(dateStr))) {
            cycleClass = 'period-day';
        } else if (prediction && prediction.fertileDays.has(dateStr)) {
            cycleClass = 'fertile-day';
        }

        html += `
            <div class="calendar-day ${hasEntry} ${cycleClass}" onclick="loadEntry('${dateStr}'); showView('write')">
                <div class="calendar-day-header">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-indicators">${folateCheckmark}${tryingHeart}</div>
                </div>
                <div class="calendar-tags">${periodTag}${tagsHtml}${moreCount}</div>
            </div>
        `;
    }

    document.getElementById('calendar-grid').innerHTML = html;
}

function previousMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
}

// ============================================================================
// SUMMARY VIEW
// ============================================================================

function updateSummary() {
    const dates = Object.keys(allEntries).sort().reverse();
    
    if (dates.length === 0) {
        document.getElementById('entries-list').innerHTML = '<p class="empty-state">No entries yet</p>';
        return;
    }
    
    const html = dates.map(date => {
        const entry = allEntries[date];
        const tags = (entry.tags || []).map(tag => `<span class="entry-tag">${tag}</span>`).join('');
        const rendered = renderMarkdown(entry.text || '');
        const supplements = entry.supplements || {};

        return `
            <div class="entry-item entry-item-clickable" data-date="${date}">
                <div class="entry-header">
                    <div class="entry-date">${date}</div>
                    <div class="entry-badges">
                        ${tags}
                        ${supplements.folate ? '<span class="supplement-taken">✓ Folate</span>' : ''}
                        ${supplements.inderal5 ? '<span class="supplement-taken">✓ Inderal 5mg</span>' : ''}
                        ${supplements.inderal10 ? '<span class="supplement-taken">✓ Inderal 10mg</span>' : ''}
                        ${entry.period ? '<span class="period-badge">Period</span>' : ''}
                        ${entry.tryingToConceive ? '<span class="trying-badge">Sexual Activity</span>' : ''}
                    </div>
                </div>
                <div class="entry-text markdown-body">${rendered}</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('entries-list').innerHTML = html;
    
    // Attach click handlers to all entry items
    document.querySelectorAll('.entry-item-clickable').forEach(item => {
        item.addEventListener('click', () => {
            const date = item.getAttribute('data-date');
            loadEntryForEdit(date);
        });
    });
}

function calculateStreak() {
    const dates = Object.keys(allEntries).sort().reverse();
    if (!dates.length) return 0;
    
    let streak = 1;
    let currentDate = new Date(dates[0]);
    
    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i]);
        const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
            streak++;
            currentDate = prevDate;
        } else {
            break;
        }
    }
    
    return streak;
}

// ============================================================================
// VIEW NAVIGATION
// ============================================================================

function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    // Show selected view
    document.getElementById(`${viewName}-view`).classList.add('active');
    event.target.classList.add('active');
    
    // Update calendar when shown
    if (viewName === 'calendar') {
        renderCalendar();
    } else if (viewName === 'summary') {
        updateSummary();
    }
}

