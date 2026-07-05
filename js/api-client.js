const apiMethod = document.getElementById("apiMethod");
const apiUrl = document.getElementById("apiUrl");
const apiBody = document.getElementById("apiBody");
const headersEditor = document.getElementById("headersEditor");
const queryEditor = document.getElementById("queryEditor");
const responseStats = document.getElementById("responseStats");
const responsePretty = document.getElementById("responsePretty");
const responseRaw = document.getElementById("responseRaw");

const historyKey = "devkitStudio.history";
const collectionsKey = "devkitStudio.collections";
const environmentsKey = "devkitStudio.environments";
const activeEnvironmentKey = "devkitStudio.activeEnvironmentId";

let lastApiResponse = null;

/**
 * Replaces {{variable}} tokens using the active environment.
 */
function resolveEnvironmentVariables(text) {
    const environments = loadStorageData(environmentsKey, []);
    const activeEnvironmentId = loadStorageData(activeEnvironmentKey, null);
    const activeEnvironment = environments.find((environment) => environment.id === activeEnvironmentId);

    if (!activeEnvironment || !text) {
        return text || "";
    }

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const variable = activeEnvironment.variables.find((item) => item.key === key.trim());
        return variable ? variable.value : match;
    });
}

/**
 * Reads editor rows from a container.
 */
function readRows(container, keySelector, valueSelector) {
    return Array.from(container.querySelectorAll(".row-editor")).map((row) => ({
        key: row.querySelector(keySelector).value,
        value: row.querySelector(valueSelector).value
    }));
}

/**
 * Builds a request URL with query parameters.
 */
function buildRequestUrl(baseUrl, queryParams) {
    const resolvedUrl = resolveEnvironmentVariables(baseUrl);
    const url = new URL(resolvedUrl);

    queryParams.forEach((param) => {
        const key = resolveEnvironmentVariables(param.key).trim();
        const value = resolveEnvironmentVariables(param.value).trim();

        if (key) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}

/**
 * Builds request headers from header rows.
 */
function buildHeaders(headers) {
    const result = new Headers();

    headers.forEach((header) => {
        const key = resolveEnvironmentVariables(header.key).trim();
        const value = resolveEnvironmentVariables(header.value).trim();

        if (key) {
            result.set(key, value);
        }
    });

    return result;
}

/**
 * Parses an API response into readable body data.
 */
async function parseApiResponse(response) {
    const contentType = response.headers.get("content-type") || "unknown";
    const rawText = await response.text();
    const parsed = contentType.includes("application/json") ? parseJson(rawText) : { ok: false };

    return {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        rawText,
        parsedBody: parsed.ok ? parsed.value : null,
        size: new Blob([rawText]).size
    };
}

/**
 * Sends the current API request.
 */
async function sendApiRequest() {
    const startedAt = performance.now();
    const method = apiMethod.value;
    const headers = readRows(headersEditor, "[data-header-key]", "[data-header-value]");
    const queryParams = readRows(queryEditor, "[data-query-key]", "[data-query-value]");

    try {
        const requestUrl = buildRequestUrl(apiUrl.value, queryParams);
        const requestHeaders = buildHeaders(headers);
        const options = { method, headers: requestHeaders };

        if (["POST", "PUT", "DELETE"].includes(method) && apiBody.value.trim()) {
            const parsedBody = parseJson(apiBody.value);

            if (!parsedBody.ok) {
                showStatus("Request body must be valid JSON.", "error");
                return;
            }

            if (!requestHeaders.has("Content-Type")) {
                requestHeaders.set("Content-Type", "application/json");
            }

            options.body = JSON.stringify(parsedBody.value);
        }

        showStatus("Sending API request...", "warning");
        const response = await fetch(requestUrl, options);
        const responseData = await parseApiResponse(response);
        responseData.time = Math.round(performance.now() - startedAt);
        lastApiResponse = responseData;

        renderApiResponse(responseData);
        addRequestToHistory({
            id: crypto.randomUUID(),
            method,
            url: apiUrl.value,
            resolvedUrl: requestUrl,
            status: response.status,
            time: responseData.time,
            createdAt: new Date().toISOString(),
            headers,
            queryParams,
            body: apiBody.value
        });

        showStatus(`Request completed with status ${response.status}.`, response.ok ? "success" : "warning");
    } catch (error) {
        responsePretty.textContent = error.message;
        responseRaw.textContent = error.stack || error.message;
        showStatus(`Request failed: ${error.message}`, "error");
    }
}

/**
 * Renders response stats and body panels.
 */
function renderApiResponse(responseData) {
    responseStats.innerHTML = [
        createStatPill("Status", `${responseData.status} ${responseData.statusText}`),
        createStatPill("Time", `${responseData.time}ms`),
        createStatPill("Size", formatBytes(responseData.size)),
        createStatPill("Type", responseData.contentType)
    ].join("");

    responseRaw.textContent = responseData.rawText || "";
    responsePretty.textContent = responseData.parsedBody ? formatJson(responseData.parsedBody) : responseData.rawText || "No response body.";
}

/**
 * Adds a header editor row.
 */
function addHeaderRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "row-editor";
    row.innerHTML = `
    <input class="form-control" data-header-key type="text" placeholder="Header" value="${escapeHtml(key)}">
    <input class="form-control" data-header-value type="text" placeholder="Value" value="${escapeHtml(value)}">
    <button class="btn btn-sm btn-ghost" type="button" data-remove-row>Remove</button>
  `;
    headersEditor.appendChild(row);
}

/**
 * Adds a query parameter editor row.
 */
function addQueryParamRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "row-editor";
    row.innerHTML = `
    <input class="form-control" data-query-key type="text" placeholder="Parameter" value="${escapeHtml(key)}">
    <input class="form-control" data-query-value type="text" placeholder="Value" value="${escapeHtml(value)}">
    <button class="btn btn-sm btn-ghost" type="button" data-remove-row>Remove</button>
  `;
    queryEditor.appendChild(row);
}

/**
 * Adds a sent request to localStorage history.
 */
function addRequestToHistory(requestRecord) {
    const history = loadStorageData(historyKey, []);
    history.unshift(requestRecord);
    saveStorageData(historyKey, history.slice(0, 50));
}

/**
 * Saves the current request into saved requests and the first collection when present.
 */
function saveCurrentRequest() {
    const request = {
        id: crypto.randomUUID(),
        method: apiMethod.value,
        url: apiUrl.value,
        headers: readRows(headersEditor, "[data-header-key]", "[data-header-value]"),
        queryParams: readRows(queryEditor, "[data-query-key]", "[data-query-value]"),
        body: apiBody.value,
        createdAt: new Date().toISOString()
    };

    const collections = loadStorageData(collectionsKey, []);

    if (!collections.length) {
        collections.push({ id: crypto.randomUUID(), name: "Default Collection", requests: [] });
    }

    collections[0].requests.unshift(request);
    saveStorageData(collectionsKey, collections);
    showStatus(`Request saved to ${collections[0].name}.`, "success");
}

/**
 * Loads a realistic sample API request.
 */
function loadSampleRequest() {
    apiMethod.value = "GET";
    apiUrl.value = "https://jsonplaceholder.typicode.com/posts";
    apiBody.value = "";
    headersEditor.innerHTML = "";
    queryEditor.innerHTML = "";
    addHeaderRow("Accept", "application/json");
    addQueryParamRow("_limit", "5");
    showStatus("Sample request loaded.", "success");
}

/**
 * Copies the current API response.
 */
function copyApiResponse() {
    copyText(responsePretty.textContent, "API response copied.");
}

/**
 * Downloads the current API response.
 */
function downloadApiResponse() {
    const content = lastApiResponse?.parsedBody ? formatJson(lastApiResponse.parsedBody) : responseRaw.textContent;
    downloadText("devkit-api-response.json", content, "application/json");
}

/**
 * Switches between pretty and raw response tabs.
 */
function switchResponseTab(tabName) {
    const showPretty = tabName === "pretty";
    responsePretty.classList.toggle("d-none", !showPretty);
    responseRaw.classList.toggle("d-none", showPretty);

    document.querySelectorAll("[data-response-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.responseTab === tabName);
    });
}

/**
 * Binds API Client UI events.
 */
function bindApiClientEvents() {
    document.getElementById("sendApiBtn").addEventListener("click", sendApiRequest);
    document.getElementById("loadSampleRequestBtn").addEventListener("click", loadSampleRequest);
    document.getElementById("saveRequestBtn").addEventListener("click", saveCurrentRequest);
    document.getElementById("copyResponseBtn").addEventListener("click", copyApiResponse);
    document.getElementById("downloadResponseBtn").addEventListener("click", downloadApiResponse);
    document.getElementById("addHeaderBtn").addEventListener("click", () => addHeaderRow());
    document.getElementById("addQueryBtn").addEventListener("click", () => addQueryParamRow());

    document.addEventListener("click", (event) => {
        if (event.target.matches("[data-remove-row]")) {
            event.target.closest(".row-editor").remove();
        }

        if (event.target.matches("[data-response-tab]")) {
            switchResponseTab(event.target.dataset.responseTab);
        }
    });
}
/**
 * Loads a saved request draft from another page.
 */
function loadRequestDraft() {
    const draft = loadStorageData("devkitStudio.requestDraft", null);

    if (!draft) {
        return;
    }

    apiMethod.value = draft.method || "GET";
    apiUrl.value = draft.url || "";
    apiBody.value = draft.body || "";
    headersEditor.innerHTML = "";
    queryEditor.innerHTML = "";

    (draft.headers || []).forEach((header) => addHeaderRow(header.key, header.value));
    (draft.queryParams || []).forEach((param) => addQueryParamRow(param.key, param.value));

    if (!headersEditor.children.length) {
        addHeaderRow();
    }

    if (!queryEditor.children.length) {
        addQueryParamRow();
    }

    localStorage.removeItem("devkitStudio.requestDraft");
    showStatus("Loaded request draft from history.", "success");
}
/**
 * Initializes the API Client page.
 */
function initializeApiClient() {
    bindApiClientEvents();
    loadRequestDraft();

    if (!headersEditor.children.length) {
        addHeaderRow();
    }

    if (!queryEditor.children.length) {
        addQueryParamRow();
    }
}

document.addEventListener("DOMContentLoaded", initializeApiClient);