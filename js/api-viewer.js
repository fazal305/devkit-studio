const apiSpecInput = document.getElementById("apiSpecInput");
const apiEndpointSearchInput = document.getElementById("apiEndpointSearchInput");
const apiEndpointList = document.getElementById("apiEndpointList");
const apiEndpointDetails = document.getElementById("apiEndpointDetails");
const apiViewerStats = document.getElementById("apiViewerStats");

let apiViewerEndpointsState = [];
let apiViewerDocsState = "";

/**
 * Parses the OpenAPI-style JSON spec input.
 */
function parseApiViewerSpec() {
    const parsed = parseJson(apiSpecInput.value);

    if (!parsed.ok) {
        showStatus("API spec must be valid JSON.", "error");
        return;
    }

    apiViewerEndpointsState = extractApiViewerEndpoints(parsed.value);
    apiViewerDocsState = generateApiViewerDocs(apiViewerEndpointsState);
    apiViewerStats.innerHTML = createStatPill("Endpoints", apiViewerEndpointsState.length);
    renderApiViewerEndpoints(apiViewerEndpointsState);
    showStatus(`Parsed ${apiViewerEndpointsState.length} endpoints.`, "success");
}

/**
 * Extracts endpoint rows from an OpenAPI-style spec object.
 */
function extractApiViewerEndpoints(spec) {
    const endpoints = [];
    const paths = spec.paths || {};
    const methods = ["get", "post", "put", "patch", "delete"];

    Object.entries(paths).forEach(([path, operations]) => {
        methods.forEach((method) => {
            if (!operations[method]) {
                return;
            }

            const operation = operations[method];
            endpoints.push({
                id: crypto.randomUUID(),
                method: method.toUpperCase(),
                path,
                summary: operation.summary || operation.description || "No summary",
                parameters: operation.parameters || [],
                responses: operation.responses || {}
            });
        });
    });

    return endpoints;
}

/**
 * Renders endpoint cards.
 */
function renderApiViewerEndpoints(endpoints) {
    if (!endpoints.length) {
        apiEndpointList.innerHTML = renderEmptyState("No endpoints found.");
        return;
    }

    apiEndpointList.innerHTML = endpoints.map((endpoint) => `
    <article class="endpoint-card">
      <span class="method-badge ${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
      <h4 class="mt-2">${escapeHtml(endpoint.path)}</h4>
      <p class="item-description">${escapeHtml(endpoint.summary)}</p>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" type="button" data-endpoint-id="${escapeHtml(endpoint.id)}">View Details</button>
      </div>
    </article>
  `).join("");
}

/**
 * Renders details for one endpoint.
 */
function renderApiViewerEndpointDetails(endpoint) {
    apiEndpointDetails.innerHTML = `
    <h3 class="panel-title">${escapeHtml(endpoint.method)} ${escapeHtml(endpoint.path)}</h3>
    <p class="item-description">${escapeHtml(endpoint.summary)}</p>
    <h4 class="panel-title mt-3">Parameters</h4>
    <pre class="code-output">${escapeHtml(formatJson(endpoint.parameters))}</pre>
    <h4 class="panel-title mt-3">Responses</h4>
    <pre class="code-output">${escapeHtml(formatJson(endpoint.responses))}</pre>
  `;
}

/**
 * Filters endpoints by method, path, or summary.
 */
function filterApiViewerEndpoints(term) {
    const normalized = term.toLowerCase().trim();

    if (!normalized) {
        renderApiViewerEndpoints(apiViewerEndpointsState);
        return;
    }

    const filtered = apiViewerEndpointsState.filter((endpoint) => {
        return `${endpoint.method} ${endpoint.path} ${endpoint.summary}`.toLowerCase().includes(normalized);
    });

    renderApiViewerEndpoints(filtered);
    showStatus(`Showing ${filtered.length} matching endpoints.`, "success");
}

/**
 * Generates markdown-style API documentation from endpoints.
 */
function generateApiViewerDocs(endpoints) {
    if (!endpoints.length) {
        return "# API Documentation\n\nNo endpoints found.\n";
    }

    return endpoints.map((endpoint) => {
        return [
            `## ${endpoint.method} ${endpoint.path}`,
            "",
            endpoint.summary,
            "",
            "### Parameters",
            "```json",
            formatJson(endpoint.parameters),
            "```",
            "",
            "### Responses",
            "```json",
            formatJson(endpoint.responses),
            "```"
        ].join("\n");
    }).join("\n\n");
}

/**
 * Loads a realistic OpenAPI-style sample spec.
 */
function loadApiViewerSample() {
    apiSpecInput.value = formatJson({
        openapi: "3.0.0",
        info: {
            title: "DevKit Commerce API",
            version: "1.0.0"
        },
        paths: {
            "/products": {
                get: {
                    summary: "List products",
                    parameters: [
                        { name: "limit", in: "query", schema: { type: "integer" } },
                        { name: "search", in: "query", schema: { type: "string" } }
                    ],
                    responses: {
                        200: { description: "Product list returned" }
                    }
                },
                post: {
                    summary: "Create product",
                    parameters: [],
                    responses: {
                        201: { description: "Product created" },
                        400: { description: "Invalid product payload" }
                    }
                }
            },
            "/orders/{orderId}": {
                get: {
                    summary: "Get order details",
                    parameters: [
                        { name: "orderId", in: "path", required: true, schema: { type: "string" } }
                    ],
                    responses: {
                        200: { description: "Order returned" },
                        404: { description: "Order not found" }
                    }
                },
                delete: {
                    summary: "Cancel order",
                    parameters: [
                        { name: "orderId", in: "path", required: true, schema: { type: "string" } }
                    ],
                    responses: {
                        204: { description: "Order cancelled" }
                    }
                }
            }
        }
    });

    parseApiViewerSpec();
}

/**
 * Copies generated API documentation.
 */
function copyApiViewerDocs() {
    copyText(apiViewerDocsState, "API documentation copied.");
}

/**
 * Downloads generated API documentation.
 */
function downloadApiViewerDocs() {
    downloadText("devkit-api-docs.md", apiViewerDocsState, "text/markdown");
}

/**
 * Binds API Viewer UI events.
 */
function bindApiViewerEvents() {
    document.getElementById("parseApiSpecBtn").addEventListener("click", parseApiViewerSpec);
    document.getElementById("loadApiSpecSampleBtn").addEventListener("click", loadApiViewerSample);
    document.getElementById("copyApiDocsBtn").addEventListener("click", copyApiViewerDocs);
    document.getElementById("downloadApiDocsBtn").addEventListener("click", downloadApiViewerDocs);
    apiEndpointSearchInput.addEventListener("input", () => filterApiViewerEndpoints(apiEndpointSearchInput.value));

    apiEndpointList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-endpoint-id]");

        if (!button) {
            return;
        }

        const endpoint = apiViewerEndpointsState.find((item) => item.id === button.dataset.endpointId);

        if (endpoint) {
            renderApiViewerEndpointDetails(endpoint);
        }
    });
}

/**
 * Initializes the API Viewer page.
 */
function initializeApiViewer() {
    bindApiViewerEvents();
}

document.addEventListener("DOMContentLoaded", initializeApiViewer);