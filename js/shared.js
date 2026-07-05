/**
 * Escapes HTML-sensitive characters before generated markup is inserted.
 */
function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Shows a global status message when the current page has a status element.
 */
function showStatus(message, type = "info") {
    const globalStatus = document.getElementById("globalStatus");

    if (!globalStatus) {
        return;
    }

    globalStatus.textContent = message;
    globalStatus.className = `status-message ${type}`;
}

/**
 * Copies text to the clipboard and reports the result.
 */
async function copyText(text, successMessage = "Copied to clipboard.") {
    if (!text) {
        showStatus("Nothing to copy yet.", "warning");
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showStatus(successMessage, "success");
    } catch (error) {
        showStatus("Clipboard access failed. Select and copy manually.", "error");
    }
}

/**
 * Downloads text content using a Blob object URL.
 */
function downloadText(filename, content, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus(`${filename} downloaded.`, "success");
}

/**
 * Formats a byte count into a readable unit.
 */
function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Formats a JavaScript value as indented JSON.
 */
function formatJson(value) {
    return JSON.stringify(value, null, 2);
}

/**
 * Parses JSON text and returns a success wrapper.
 */
function parseJson(text) {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (error) {
        return { ok: false, error };
    }
}

/**
 * Parses XML text and detects parser errors.
 */
function parseXml(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");
    const parserError = doc.querySelector("parsererror");

    if (parserError) {
        return { ok: false, error: new Error(parserError.textContent.trim()) };
    }

    return { ok: true, value: doc };
}

/**
 * Serializes an XML document or node to text.
 */
function serializeXml(xmlDoc) {
    return new XMLSerializer().serializeToString(xmlDoc);
}

/**
 * Gets a JSON-friendly type label for a value.
 */
function getValueType(value) {
    if (Array.isArray(value)) {
        return "array";
    }

    if (value === null) {
        return "null";
    }

    return typeof value;
}

/**
 * Clones JSON-compatible data safely.
 */
function safeClone(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * Loads persisted data from localStorage.
 */
function loadStorageData(key, fallback) {
    const saved = localStorage.getItem(key);

    if (!saved) {
        return fallback;
    }

    const parsed = parseJson(saved);

    if (!parsed.ok) {
        showStatus(`Saved data for ${key} could not be loaded.`, "warning");
        return fallback;
    }

    return parsed.value;
}

/**
 * Saves persistent data to localStorage.
 */
function saveStorageData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Highlights the active sidebar navigation link based on body data-page.
 */
function setActiveNav() {
    const currentPage = document.body.dataset.page;
    const links = document.querySelectorAll("[data-page-link]");

    links.forEach((link) => {
        link.classList.toggle("active", link.dataset.pageLink === currentPage);
    });
}

/**
 * Returns consistent empty-state markup.
 */
function renderEmptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

/**
 * Creates a small stats pill.
 */
function createStatPill(label, value) {
    return `<span class="stat-pill">${escapeHtml(label)}: ${escapeHtml(value)}</span>`;
}

/**
 * Returns the shared DevKit navigation markup for reference when building pages.
 */
function getDevKitSidebar() {
    return `
    <aside class="sidebar">
      <a class="brand" href="index.html" aria-label="DevKit Studio dashboard">
        <div class="brand-mark">DS</div>
        <div>
          <h1 class="brand-title">DevKit Studio</h1>
          <p class="brand-subtitle">VS Code meets Postman in the browser</p>
        </div>
      </a>
      <p class="sidebar-label">Workspace Modules</p>
      <nav class="module-nav" aria-label="DevKit modules">
        <a class="module-link" href="index.html" data-page-link="index"><span>Dashboard</span><span class="module-index">00</span></a>
        <a class="module-link" href="json-explorer.html" data-page-link="json-explorer"><span>JSON Explorer</span><span class="module-index">01</span></a>
        <a class="module-link" href="xml-explorer.html" data-page-link="xml-explorer"><span>XML Explorer</span><span class="module-index">02</span></a>
        <a class="module-link" href="rss-reader.html" data-page-link="rss-reader"><span>RSS Reader</span><span class="module-index">03</span></a>
        <a class="module-link" href="api-client.html" data-page-link="api-client"><span>API Client</span><span class="module-index">04</span></a>
        <a class="module-link" href="response-comparator.html" data-page-link="response-comparator"><span>Response Comparator</span><span class="module-index">05</span></a>
        <a class="module-link" href="schema-builder.html" data-page-link="schema-builder"><span>Schema Builder</span><span class="module-index">06</span></a>
        <a class="module-link" href="json-xml-converter.html" data-page-link="json-xml-converter"><span>JSON ↔ XML Converter</span><span class="module-index">07</span></a>
        <a class="module-link" href="api-viewer.html" data-page-link="api-viewer"><span>API Viewer</span><span class="module-index">08</span></a>
        <a class="module-link" href="request-history.html" data-page-link="request-history"><span>Request History</span><span class="module-index">09</span></a>
        <a class="module-link" href="collections.html" data-page-link="collections"><span>Collections</span><span class="module-index">10</span></a>
        <a class="module-link" href="environment-variables.html" data-page-link="environment-variables"><span>Environment Variables</span><span class="module-index">11</span></a>
        <a class="module-link" href="mock-response-generator.html" data-page-link="mock-response-generator"><span>Mock Response Generator</span><span class="module-index">12</span></a>
      </nav>
      <p class="footer-note">Local-first developer tooling workspace</p>
    </aside>
  `;
}

/**
 * Initializes shared page behavior.
 */
function initializeSharedPage() {
    setActiveNav();
}

document.addEventListener("DOMContentLoaded", initializeSharedPage);