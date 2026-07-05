const historySearchInput = document.getElementById("historySearchInput");
const historyListOutput = document.getElementById("historyListOutput");
const historyStats = document.getElementById("historyStats");

const historyKey = "devkitStudio.history";
const requestDraftKey = "devkitStudio.requestDraft";

/**
 * Adds a request record to history storage.
 */
function addRequestToHistory(requestRecord) {
    const history = loadStorageData(historyKey, []);
    history.unshift(requestRecord);
    saveStorageData(historyKey, history.slice(0, 50));
}

/**
 * Renders request history records.
 */
function renderRequestHistory(records = loadStorageData(historyKey, [])) {
    historyStats.innerHTML = createStatPill("Requests", records.length);

    if (!records.length) {
        historyListOutput.innerHTML = renderEmptyState("No request history yet.");
        return;
    }

    historyListOutput.innerHTML = records.map((record) => `
    <article class="history-item">
      <span class="method-badge ${escapeHtml(record.method.toLowerCase())}">${escapeHtml(record.method)}</span>
      <h4 class="mt-2">${escapeHtml(record.url)}</h4>
      <p class="item-meta">status ${escapeHtml(record.status)} | ${escapeHtml(record.time)}ms | ${escapeHtml(new Date(record.createdAt).toLocaleString())}</p>
      <p class="item-description">${escapeHtml(record.resolvedUrl || record.url)}</p>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" type="button" data-load-history="${escapeHtml(record.id)}">Load Request</button>
      </div>
    </article>
  `).join("");
}

/**
 * Filters request history by search term.
 */
function filterRequestHistory(term) {
    const normalized = term.toLowerCase().trim();
    const history = loadStorageData(historyKey, []);

    if (!normalized) {
        renderRequestHistory(history);
        return;
    }

    const filtered = history.filter((record) => {
        return `${record.method} ${record.url} ${record.resolvedUrl} ${record.status} ${record.createdAt}`.toLowerCase().includes(normalized);
    });

    renderRequestHistory(filtered);
    showStatus(`Showing ${filtered.length} matching history records.`, "success");
}

/**
 * Loads a previous request into a draft for the API Client.
 */
function loadHistoryRequest(id) {
    const history = loadStorageData(historyKey, []);
    const request = history.find((record) => record.id === id);

    if (!request) {
        showStatus("Request record was not found.", "error");
        return;
    }

    saveStorageData(requestDraftKey, {
        method: request.method,
        url: request.url,
        headers: request.headers || [],
        queryParams: request.queryParams || [],
        body: request.body || ""
    });

    showStatus("Request loaded as API Client draft. Open API Client to use it.", "success");
}

/**
 * Clears stored request history.
 */
function clearRequestHistory() {
    saveStorageData(historyKey, []);
    renderRequestHistory([]);
    showStatus("Request history cleared.", "success");
}

/**
 * Exports request history as JSON.
 */
function exportRequestHistory() {
    const history = loadStorageData(historyKey, []);
    downloadText("devkit-request-history.json", formatJson(history), "application/json");
}

/**
 * Binds Request History UI events.
 */
function bindRequestHistoryEvents() {
    historySearchInput.addEventListener("input", () => filterRequestHistory(historySearchInput.value));
    document.getElementById("clearHistoryBtn").addEventListener("click", clearRequestHistory);
    document.getElementById("exportHistoryBtn").addEventListener("click", exportRequestHistory);

    historyListOutput.addEventListener("click", (event) => {
        const button = event.target.closest("[data-load-history]");

        if (button) {
            loadHistoryRequest(button.dataset.loadHistory);
        }
    });
}

/**
 * Initializes the Request History page.
 */
function initializeRequestHistory() {
    bindRequestHistoryEvents();
    renderRequestHistory();
}

document.addEventListener("DOMContentLoaded", initializeRequestHistory);