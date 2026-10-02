const jsonInput = document.getElementById("jsonInput");
const jsonFileInput = document.getElementById("jsonFileInput");
const jsonTreeOutput = document.getElementById("jsonTreeOutput");
const jsonStats = document.getElementById("jsonStats");
const jsonTreeSearch = document.getElementById("jsonTreeSearch");
const jsonTreeMatchCount = document.getElementById("jsonTreeMatchCount");

let jsonExplorerDataState = null;

/**
 * Validates JSON input, updates stats, and renders the tree.
 */
function validateJsonExplorer() {
  const parsed = parseJson(jsonInput.value);

  if (!parsed.ok) {
    jsonStats.innerHTML = createStatPill("Valid", "No");
    jsonTreeOutput.innerHTML = renderEmptyState(parsed.error.message);
    jsonExplorerDataState = null;
    jsonTreeSearch.disabled = true;
    jsonTreeSearch.value = "";
    jsonTreeMatchCount.textContent = "0 matches";
    showStatus("JSON validation failed.", "error");
    return null;
  }

  jsonExplorerDataState = parsed.value;
  jsonTreeSearch.disabled = false;
  renderJsonExplorerTree();

  const formatted = formatJson(parsed.value);
  // Depth/key/array counts ported from fazal305/dataforge's stats bar.
  jsonStats.innerHTML = [
    createStatPill("Valid", "Yes"),
    createStatPill("Type", getValueType(parsed.value)),
    createStatPill("Keys", countJsonKeys(parsed.value)),
    createStatPill("Max Depth", getJsonMaxDepth(parsed.value, 1)),
    createStatPill("Arrays", countJsonArrays(parsed.value)),
    createStatPill("Size", formatBytes(new Blob([formatted]).size)),
  ].join("");

  showStatus("JSON is valid.", "success");
  return parsed.value;
}

/**
 * Re-renders the tree using the current search term and updates the match
 * count (search/highlight ported from fazal305/dataforge).
 */
function renderJsonExplorerTree() {
  if (jsonExplorerDataState === null) {
    return;
  }

  const term = jsonTreeSearch.value.trim();
  jsonTreeOutput.innerHTML = "";
  const tree = document.createElement("ul");
  tree.className = "tree-list";
  renderJsonTree(jsonExplorerDataState, tree, "$", term);
  jsonTreeOutput.appendChild(tree);

  const matches = term
    ? countJsonMatches(jsonExplorerDataState, term.toLowerCase())
    : 0;
  jsonTreeMatchCount.textContent = `${matches} ${matches === 1 ? "match" : "matches"}`;
}

/**
 * Counts keys recursively in JSON data (ported from fazal305/dataforge).
 */
function countJsonKeys(value) {
  const type = getValueType(value);

  if (type === "array") {
    return value.reduce((total, item) => total + countJsonKeys(item), 0);
  }

  if (type === "object") {
    return Object.entries(value).reduce(
      (total, [, child]) => total + 1 + countJsonKeys(child),
      0,
    );
  }

  return 0;
}

/**
 * Counts arrays recursively in JSON data (ported from fazal305/dataforge).
 */
function countJsonArrays(value) {
  const type = getValueType(value);

  if (type === "array") {
    return (
      1 + value.reduce((total, item) => total + countJsonArrays(item), 0)
    );
  }

  if (type === "object") {
    return Object.values(value).reduce(
      (total, child) => total + countJsonArrays(child),
      0,
    );
  }

  return 0;
}

/**
 * Finds the maximum nesting depth in JSON data
 * (ported from fazal305/dataforge).
 */
function getJsonMaxDepth(value, depth = 1) {
  const type = getValueType(value);

  if (type !== "object" && type !== "array") {
    return depth;
  }

  const values = type === "array" ? value : Object.values(value);

  if (!values.length) {
    return depth;
  }

  return Math.max(...values.map((child) => getJsonMaxDepth(child, depth + 1)));
}

/**
 * Counts how many times a search term appears across keys and values
 * (ported from fazal305/dataforge).
 */
function countJsonMatches(value, needle, key = "") {
  let total = 0;

  if (key && key.toLowerCase().includes(needle)) {
    total += 1;
  }

  const type = getValueType(value);

  if (type === "array") {
    value.forEach((item, index) => {
      total += countJsonMatches(item, needle, `[${index}]`);
    });
  } else if (type === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      total += countJsonMatches(childValue, needle, childKey);
    });
  } else if (String(value).toLowerCase().includes(needle)) {
    total += 1;
  }

  return total;
}

/**
 * Wraps search term matches in a <mark> highlight
 * (ported from fazal305/dataforge).
 */
function highlightJsonMatch(text, term) {
  const escaped = escapeHtml(String(text));

  if (!term) {
    return escaped;
  }

  const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(
    new RegExp(`(${escapedTerm})`, "gi"),
    '<mark class="highlight">$1</mark>',
  );
}

/**
 * Pretty prints the current JSON input.
 */
function prettyPrintJsonExplorer() {
  const value = validateJsonExplorer();

  if (value === null) {
    return;
  }

  jsonInput.value = formatJson(value);
  showStatus("JSON formatted.", "success");
}

/**
 * Minifies the current JSON input.
 */
function minifyJsonExplorer() {
  const value = validateJsonExplorer();

  if (value === null) {
    return;
  }

  jsonInput.value = JSON.stringify(value);
  showStatus("JSON minified.", "success");
}

/**
 * Recursively renders a JSON value as a key/value tree.
 */
function renderJsonTree(value, container, path = "$", searchTerm = "") {
  const type = getValueType(value);
  const item = document.createElement("li");

  if (type === "object" || type === "array") {
    // Collapsible toggle button ported from fazal305/dataforge's tree.
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-sm btn-ghost tree-toggle";
    toggle.textContent = "-";
    toggle.setAttribute("aria-label", `Toggle ${path}`);

    const label = document.createElement("span");
    label.innerHTML = `<span class="tree-key">${highlightJsonMatch(path, searchTerm)}</span> <span class="tree-type">${type}</span>`;

    item.appendChild(toggle);
    item.appendChild(label);

    const nested = document.createElement("ul");

    Object.entries(value).forEach(([key, childValue]) => {
      renderJsonTree(childValue, nested, key, searchTerm);
    });

    toggle.addEventListener("click", () => {
      const collapsed = nested.classList.toggle("d-none");
      toggle.textContent = collapsed ? "+" : "-";
    });

    item.appendChild(nested);
  } else {
    item.innerHTML = `<span class="tree-key">${highlightJsonMatch(path, searchTerm)}</span>: <span class="tree-value">${highlightJsonMatch(JSON.stringify(value), searchTerm)}</span> <span class="tree-type">${type}</span>`;
  }

  container.appendChild(item);
}

/**
 * Loads realistic sample JSON into the editor.
 */
function loadJsonExplorerSample() {
  jsonInput.value = formatJson({
    user: {
      id: 305,
      name: "Fazal Developer",
      role: "Full Stack Engineer",
      active: true,
    },
    settings: {
      theme: "cyberpunk",
      editor: "DevKit Studio",
      notifications: ["builds", "deployments", "api-errors"],
    },
    products: [
      {
        id: "PRD-1001",
        name: "Neon Mechanical Keyboard",
        price: 129.99,
        inStock: true,
      },
      {
        id: "PRD-1002",
        name: "API Debugger Desk Mat",
        price: 39.5,
        inStock: false,
      },
    ],
    orders: [
      {
        id: "ORD-9001",
        status: "paid",
        total: 169.49,
      },
    ],
  });

  validateJsonExplorer();
}

/**
 * Copies the current JSON editor value.
 */
function copyJsonExplorerOutput() {
  copyText(jsonInput.value, "JSON copied.");
}

/**
 * Downloads the current JSON editor value.
 */
function downloadJsonExplorerOutput() {
  downloadText("devkit-json-output.json", jsonInput.value, "application/json");
}

/**
 * Imports a local JSON/text file into the editor
 * (ported from fazal305/dataforge).
 */
async function handleJsonExplorerFileImport(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  jsonInput.value = await file.text();
  validateJsonExplorer();
  jsonFileInput.value = "";
}

/**
 * Binds JSON Explorer UI events.
 */
function bindJsonExplorerEvents() {
  document
    .getElementById("validateJsonBtn")
    .addEventListener("click", validateJsonExplorer);
  document
    .getElementById("prettyJsonBtn")
    .addEventListener("click", prettyPrintJsonExplorer);
  document
    .getElementById("minifyJsonBtn")
    .addEventListener("click", minifyJsonExplorer);
  document
    .getElementById("loadJsonSampleBtn")
    .addEventListener("click", loadJsonExplorerSample);
  document
    .getElementById("copyJsonBtn")
    .addEventListener("click", copyJsonExplorerOutput);
  document
    .getElementById("downloadJsonBtn")
    .addEventListener("click", downloadJsonExplorerOutput);
  jsonFileInput.addEventListener("change", handleJsonExplorerFileImport);
  jsonTreeSearch.addEventListener("input", renderJsonExplorerTree);
}

/**
 * Initializes the JSON Explorer page.
 */
function initializeJsonExplorer() {
  bindJsonExplorerEvents();
}

document.addEventListener("DOMContentLoaded", initializeJsonExplorer);
