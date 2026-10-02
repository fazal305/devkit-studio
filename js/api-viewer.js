const apiSpecInput = document.getElementById("apiSpecInput");
const apiSpecTypeSelect = document.getElementById("apiSpecTypeSelect");
const apiSpecFileInput = document.getElementById("apiSpecFileInput");
const apiEndpointSearchInput = document.getElementById(
  "apiEndpointSearchInput",
);
const apiMethodFilter = document.getElementById("apiMethodFilter");
const apiTagFilter = document.getElementById("apiTagFilter");
const apiEndpointList = document.getElementById("apiEndpointList");
const apiEndpointDetails = document.getElementById("apiEndpointDetails");
const apiViewerStats = document.getElementById("apiViewerStats");
const apiViewerBaseUrl = document.getElementById("apiViewerBaseUrl");
const apiViewerTryStatus = document.getElementById("apiViewerTryStatus");
const apiViewerTryResponse = document.getElementById("apiViewerTryResponse");

let apiViewerEndpointsState = [];
let apiViewerFilteredEndpointsState = [];
let apiViewerSelectedEndpoint = null;
let apiViewerDocsState = "";
let apiViewerParsedSpecState = null;

/**
 * Detects whether pasted spec text looks like JSON or YAML
 * (ported from fazal305/specforge-api-explorer).
 */
function detectApiSpecType(text) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "unknown";
  }

  try {
    JSON.parse(trimmed);
    return "json";
  } catch (error) {
    if (
      /^\s*openapi\s*:/m.test(trimmed) ||
      /^\s*swagger\s*:/m.test(trimmed) ||
      /^\s*info\s*:/m.test(trimmed)
    ) {
      return "yaml";
    }
  }

  return "unknown";
}

/**
 * Parses JSON or YAML spec text into an object
 * (YAML support ported from fazal305/specforge-api-explorer).
 */
function parseApiSpecText(text, preferredType) {
  const trimmed = text.trim();
  const detectedType =
    preferredType === "auto" ? detectApiSpecType(trimmed) : preferredType;

  if (!trimmed) {
    return { ok: false, error: "Paste or import an API specification first." };
  }

  if (detectedType === "json") {
    const parsed = parseJson(trimmed);
    return parsed.ok
      ? { ok: true, value: parsed.value }
      : { ok: false, error: `Invalid JSON: ${parsed.error.message}` };
  }

  if (detectedType === "yaml") {
    if (!window.jsyaml) {
      return {
        ok: false,
        error: "YAML parser did not load. Check your connection and reload.",
      };
    }

    try {
      return { ok: true, value: window.jsyaml.load(trimmed) };
    } catch (error) {
      return { ok: false, error: `Invalid YAML: ${error.message}` };
    }
  }

  return {
    ok: false,
    error: "Could not detect JSON or YAML. Choose a spec type and try again.",
  };
}

/**
 * Resolves a local JSON Pointer ($ref) against the parsed spec
 * (ported from fazal305/specforge-api-explorer).
 */
function resolveApiViewerRef(ref, spec) {
  if (!ref || typeof ref !== "string" || !ref.startsWith("#/")) {
    return null;
  }

  const parts = ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current = spec;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return null;
    }

    current = current[part];
  }

  return current;
}

/**
 * Recursively renders a schema node, resolving $ref pointers
 * (ported from fazal305/specforge-api-explorer).
 */
function renderApiViewerSchema(schema, depth = 0) {
  if (!schema || typeof schema !== "object") {
    return `<span class="item-meta">No schema</span>`;
  }

  if (schema.$ref) {
    const resolved = resolveApiViewerRef(schema.$ref, apiViewerParsedSpecState);
    const name = schema.$ref.split("/").pop();

    if (!resolved || depth > 6) {
      return `<span class="tree-key">$ref</span>: <span class="tree-type">${escapeHtml(schema.$ref)}</span>`;
    }

    return `
      <div class="ms-3">
        <span class="tree-key">${escapeHtml(name)}</span>
        <span class="item-meta">ref ${escapeHtml(schema.$ref)}</span>
        <div class="ms-3">${renderApiViewerSchema(resolved, depth + 1)}</div>
      </div>
    `;
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  const pieces = [];

  if (schema.type) {
    pieces.push(`<span class="tree-type">${escapeHtml(schema.type)}</span>`);
  }

  if (schema.format) {
    pieces.push(
      `<span class="item-meta">format: ${escapeHtml(schema.format)}</span>`,
    );
  }

  if (Array.isArray(schema.enum)) {
    pieces.push(
      `<span class="item-meta">enum: ${escapeHtml(schema.enum.join(", "))}</span>`,
    );
  }

  if (schema.items) {
    pieces.push(
      `<div class="ms-3"><span class="tree-key">items</span>: ${renderApiViewerSchema(schema.items, depth + 1)}</div>`,
    );
  }

  if (schema.properties && typeof schema.properties === "object") {
    const properties = Object.entries(schema.properties)
      .map(([key, value]) => {
        const requiredMark = required.includes(key)
          ? ` <span class="badge badge-required">required</span>`
          : "";

        return `<div class="ms-3"><span class="tree-key">${escapeHtml(key)}</span>${requiredMark}: ${renderApiViewerSchema(value, depth + 1)}</div>`;
      })
      .join("");

    pieces.push(properties);
  }

  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const groupName = schema.oneOf ? "oneOf" : schema.anyOf ? "anyOf" : "allOf";
    const groupItems = schema[groupName]
      .map(
        (item) =>
          `<div class="ms-3">${renderApiViewerSchema(item, depth + 1)}</div>`,
      )
      .join("");
    pieces.push(
      `<div><span class="tree-key">${groupName}</span>${groupItems}</div>`,
    );
  }

  return pieces.length
    ? pieces.join(" ")
    : `<span class="item-meta">object</span>`;
}

/**
 * Renders all media-type schemas in a content object.
 */
function renderApiViewerContentSchemas(content) {
  const entries = Object.entries(content || {});

  if (!entries.length) {
    return `<p class="item-meta">No schema documented.</p>`;
  }

  return entries
    .map(
      ([mediaType, media]) => `
    <div class="mb-2">
      <span class="stat-pill">${escapeHtml(mediaType)}</span>
      <div class="mt-1">${renderApiViewerSchema(media.schema || {}, 0)}</div>
    </div>
  `,
    )
    .join("");
}

/**
 * Parses the OpenAPI-style JSON or YAML spec input.
 */
function parseApiViewerSpec() {
  const result = parseApiSpecText(
    apiSpecInput.value,
    apiSpecTypeSelect.value,
  );

  if (!result.ok) {
    showStatus(result.error, "error");
    return;
  }

  apiViewerParsedSpecState = result.value;
  apiViewerEndpointsState = extractApiViewerEndpoints(result.value);
  apiViewerFilteredEndpointsState = [...apiViewerEndpointsState];
  apiViewerSelectedEndpoint = apiViewerEndpointsState[0] || null;
  apiViewerDocsState = generateApiViewerDocs(result.value, apiViewerEndpointsState);

  apiViewerStats.innerHTML = createStatPill(
    "Endpoints",
    apiViewerEndpointsState.length,
  );

  const server = Array.isArray(result.value.servers) && result.value.servers[0];
  if (server?.url) {
    apiViewerBaseUrl.value = server.url;
  }

  populateApiMethodFilter(apiViewerEndpointsState);
  populateApiTagFilter(apiViewerEndpointsState);
  renderApiViewerEndpoints(apiViewerFilteredEndpointsState);
  renderApiViewerEndpointDetails(apiViewerSelectedEndpoint);
  showStatus(`Parsed ${apiViewerEndpointsState.length} endpoints.`, "success");
}

/**
 * Extracts endpoint rows from an OpenAPI-style spec object.
 */
function extractApiViewerEndpoints(spec) {
  const endpoints = [];
  const paths = spec.paths || {};
  const methods = ["get", "post", "put", "patch", "delete"];

  Object.entries(paths).forEach(([path, pathItem]) => {
    methods.forEach((method) => {
      if (!pathItem[method]) {
        return;
      }

      const operation = pathItem[method];
      const pathParameters = Array.isArray(pathItem.parameters)
        ? pathItem.parameters
        : [];
      const operationParameters = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];

      endpoints.push({
        id: crypto.randomUUID(),
        method: method.toUpperCase(),
        path,
        summary: operation.summary || operation.description || "No summary",
        tags: Array.isArray(operation.tags) ? operation.tags : [],
        parameters: [...pathParameters, ...operationParameters],
        requestBody: operation.requestBody || null,
        responses: operation.responses || {},
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

  apiEndpointList.innerHTML = endpoints
    .map(
      (endpoint) => `
    <article class="endpoint-card${apiViewerSelectedEndpoint && endpoint.id === apiViewerSelectedEndpoint.id ? " active" : ""}">
      <span class="method-badge ${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
      <h4 class="mt-2">${escapeHtml(endpoint.path)}</h4>
      <p class="item-description">${escapeHtml(endpoint.summary)}</p>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" type="button" data-endpoint-id="${escapeHtml(endpoint.id)}">View Details</button>
      </div>
    </article>
  `,
    )
    .join("");
}

/**
 * Renders details for one endpoint, including resolved parameter, request
 * body, and response schemas (schema rendering ported from
 * fazal305/specforge-api-explorer).
 */
function renderApiViewerEndpointDetails(endpoint) {
  if (!endpoint) {
    apiEndpointDetails.innerHTML = renderEmptyState(
      "Select an endpoint to view details.",
    );
    return;
  }

  const parametersHtml = endpoint.parameters.length
    ? `
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr><th>Name</th><th>In</th><th>Required</th><th>Schema</th></tr>
          </thead>
          <tbody>
            ${endpoint.parameters
              .map(
                (parameter) => `
              <tr>
                <td><code>${escapeHtml(parameter.name || "")}</code></td>
                <td>${escapeHtml(parameter.in || "")}</td>
                <td>${parameter.required ? "Yes" : "No"}</td>
                <td>${renderApiViewerSchema(parameter.schema || {}, 0)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `<p class="item-meta">No parameters documented.</p>`;

  const requestBodyHtml = endpoint.requestBody
    ? renderApiViewerContentSchemas(endpoint.requestBody.content || {})
    : `<p class="item-meta">No request body documented.</p>`;

  const responsesHtml = Object.keys(endpoint.responses).length
    ? Object.entries(endpoint.responses)
        .map(
          ([status, response]) => `
      <div class="mb-3">
        <h4 class="panel-title">Response ${escapeHtml(status)}</h4>
        <p class="item-meta">${escapeHtml(response.description || "No response description.")}</p>
        ${renderApiViewerContentSchemas(response.content || {})}
      </div>
    `,
        )
        .join("")
    : `<p class="item-meta">No responses documented.</p>`;

  apiEndpointDetails.innerHTML = `
    <h3 class="panel-title">${escapeHtml(endpoint.method)} ${escapeHtml(endpoint.path)}</h3>
    <p class="item-description">${escapeHtml(endpoint.summary)}</p>
    <div class="pill-row mb-3">
      ${endpoint.tags.length ? endpoint.tags.map((tag) => `<span class="stat-pill">${escapeHtml(tag)}</span>`).join("") : `<span class="stat-pill">No tags</span>`}
    </div>
    <h4 class="panel-title mt-3">Parameters</h4>
    ${parametersHtml}
    <h4 class="panel-title mt-3">Request Body Schema</h4>
    ${requestBodyHtml}
    <h4 class="panel-title mt-3">Response Schemas</h4>
    ${responsesHtml}
  `;
}

/**
 * Populates the method filter dropdown from loaded endpoints
 * (ported from fazal305/specforge-api-explorer).
 */
function populateApiMethodFilter(endpoints) {
  const methods = [...new Set(endpoints.map((endpoint) => endpoint.method))].sort();

  apiMethodFilter.innerHTML = `<option value="all">All Methods</option>${methods
    .map((method) => `<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`)
    .join("")}`;
}

/**
 * Populates the tag filter dropdown from loaded endpoints
 * (ported from fazal305/specforge-api-explorer).
 */
function populateApiTagFilter(endpoints) {
  const tags = [...new Set(endpoints.flatMap((endpoint) => endpoint.tags))].sort();

  apiTagFilter.innerHTML = `<option value="all">All Tags</option>${tags
    .map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`)
    .join("")}`;
}

/**
 * Filters endpoints by search text, method, and tag
 * (method/tag filtering ported from fazal305/specforge-api-explorer).
 */
function filterApiViewerEndpoints() {
  const term = apiEndpointSearchInput.value.toLowerCase().trim();
  const method = apiMethodFilter.value;
  const tag = apiTagFilter.value;

  apiViewerFilteredEndpointsState = apiViewerEndpointsState.filter(
    (endpoint) => {
      const searchable =
        `${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.tags.join(" ")}`.toLowerCase();
      const matchesTerm = !term || searchable.includes(term);
      const matchesMethod = method === "all" || endpoint.method === method;
      const matchesTag = tag === "all" || endpoint.tags.includes(tag);

      return matchesTerm && matchesMethod && matchesTag;
    },
  );

  renderApiViewerEndpoints(apiViewerFilteredEndpointsState);
  showStatus(
    `Showing ${apiViewerFilteredEndpointsState.length} matching endpoints.`,
    "success",
  );
}

/**
 * Imports a local .json/.yaml/.yml spec file
 * (ported from fazal305/specforge-api-explorer).
 */
async function handleApiSpecFileImport(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const extension = file.name.split(".").pop().toLowerCase();

  if (!["json", "yaml", "yml"].includes(extension)) {
    showStatus("Please import a .json, .yaml, or .yml file.", "error");
    return;
  }

  apiSpecInput.value = await file.text();
  apiSpecTypeSelect.value = extension === "json" ? "json" : "yaml";
  parseApiViewerSpec();
}

/**
 * Sends a safe live GET request for the selected endpoint against a base
 * URL, substituting path parameters with a placeholder value
 * (ported from fazal305/specforge-api-explorer).
 */
async function tryApiViewerGetRequest() {
  if (!apiViewerSelectedEndpoint || apiViewerSelectedEndpoint.method !== "GET") {
    apiViewerTryStatus.textContent =
      "Select a GET endpoint before sending a request.";
    return;
  }

  const baseUrl = apiViewerBaseUrl.value.trim().replace(/\/$/, "");

  if (!baseUrl) {
    apiViewerTryStatus.textContent = "Enter a base URL before sending a GET request.";
    return;
  }

  const safePath = apiViewerSelectedEndpoint.path.replace(/\{([^}]+)\}/g, "1");
  const url = `${baseUrl}${safePath.startsWith("/") ? safePath : `/${safePath}`}`;

  apiViewerTryStatus.textContent = "Sending request...";
  apiViewerTryResponse.textContent = "";

  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    apiViewerTryStatus.textContent = `${response.status} ${response.statusText}`;
    apiViewerTryResponse.textContent =
      typeof body === "string" ? body : formatJson(body);
  } catch (error) {
    apiViewerTryStatus.textContent = "Network or CORS error.";
    apiViewerTryResponse.textContent = error.message;
  }
}

/**
 * Generates markdown-style API documentation from endpoints, including a
 * servers/tags overview section (ported from fazal305/specforge-api-explorer).
 */
function generateApiViewerDocs(spec, endpoints) {
  if (!endpoints.length) {
    return "# API Documentation\n\nNo endpoints found.\n";
  }

  const lines = [
    `# ${spec?.info?.title || "API Documentation"}`,
    "",
    `Version: ${spec?.info?.version || "Unknown"}`,
    "",
    spec?.info?.description || "",
    "",
    "## Servers",
    "",
  ];

  const servers = Array.isArray(spec?.servers) ? spec.servers : [];

  if (servers.length) {
    servers.forEach((server) => {
      lines.push(
        `- ${server.url}${server.description ? ` - ${server.description}` : ""}`,
      );
    });
  } else {
    lines.push("- No servers listed");
  }

  lines.push("", "## Endpoints", "");

  endpoints.forEach((endpoint) => {
    lines.push(`### ${endpoint.method} ${endpoint.path}`, "", endpoint.summary, "");

    if (endpoint.tags.length) {
      lines.push(`Tags: ${endpoint.tags.join(", ")}`, "");
    }

    lines.push(
      "#### Parameters",
      "```json",
      formatJson(endpoint.parameters),
      "```",
      "",
      "#### Responses",
      "```json",
      formatJson(endpoint.responses),
      "```",
      "",
    );
  });

  return lines.join("\n");
}

/**
 * Generates a compact JSON summary of the parsed spec and its endpoints
 * (ported from fazal305/specforge-api-explorer).
 */
function generateApiViewerJsonSummary(spec, endpoints) {
  return {
    title: spec?.info?.title || "Untitled API",
    version: spec?.info?.version || "Unknown",
    servers: spec?.servers || [],
    endpoints: endpoints.map((endpoint) => ({
      method: endpoint.method,
      path: endpoint.path,
      summary: endpoint.summary,
      tags: endpoint.tags,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
    })),
  };
}

/**
 * Downloads a JSON summary of the parsed API spec.
 */
function downloadApiViewerJsonSummary() {
  if (!apiViewerParsedSpecState) {
    showStatus("Parse a spec before downloading the JSON summary.", "error");
    return;
  }

  downloadText(
    "devkit-api-summary.json",
    formatJson(
      generateApiViewerJsonSummary(
        apiViewerParsedSpecState,
        apiViewerEndpointsState,
      ),
    ),
    "application/json",
  );
}

/**
 * Loads a realistic OpenAPI-style sample spec.
 */
function loadApiViewerSample() {
  apiSpecInput.value = formatJson({
    openapi: "3.0.0",
    info: {
      title: "DevKit Commerce API",
      version: "1.0.0",
    },
    paths: {
      "/products": {
        get: {
          summary: "List products",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Product list returned" },
          },
        },
        post: {
          summary: "Create product",
          parameters: [],
          responses: {
            201: { description: "Product created" },
            400: { description: "Invalid product payload" },
          },
        },
      },
      "/orders/{orderId}": {
        get: {
          summary: "Get order details",
          parameters: [
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Order returned" },
            404: { description: "Order not found" },
          },
        },
        delete: {
          summary: "Cancel order",
          parameters: [
            {
              name: "orderId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            204: { description: "Order cancelled" },
          },
        },
      },
    },
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
  document
    .getElementById("parseApiSpecBtn")
    .addEventListener("click", parseApiViewerSpec);
  document
    .getElementById("loadApiSpecSampleBtn")
    .addEventListener("click", loadApiViewerSample);
  document
    .getElementById("copyApiDocsBtn")
    .addEventListener("click", copyApiViewerDocs);
  document
    .getElementById("downloadApiDocsBtn")
    .addEventListener("click", downloadApiViewerDocs);
  document
    .getElementById("downloadApiSummaryBtn")
    .addEventListener("click", downloadApiViewerJsonSummary);
  document
    .getElementById("apiViewerTryGetBtn")
    .addEventListener("click", tryApiViewerGetRequest);

  apiSpecFileInput.addEventListener("change", handleApiSpecFileImport);
  apiEndpointSearchInput.addEventListener("input", filterApiViewerEndpoints);
  apiMethodFilter.addEventListener("change", filterApiViewerEndpoints);
  apiTagFilter.addEventListener("change", filterApiViewerEndpoints);

  apiEndpointList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-endpoint-id]");

    if (!button) {
      return;
    }

    const endpoint = apiViewerEndpointsState.find(
      (item) => item.id === button.dataset.endpointId,
    );

    if (endpoint) {
      apiViewerSelectedEndpoint = endpoint;
      renderApiViewerEndpoints(apiViewerFilteredEndpointsState);
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
