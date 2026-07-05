const jsonInput = document.getElementById("jsonInput");
const jsonTreeOutput = document.getElementById("jsonTreeOutput");
const jsonStats = document.getElementById("jsonStats");

/**
 * Validates JSON input, updates stats, and renders the tree.
 */
function validateJsonExplorer() {
    const parsed = parseJson(jsonInput.value);

    if (!parsed.ok) {
        jsonStats.innerHTML = createStatPill("Valid", "No");
        jsonTreeOutput.innerHTML = renderEmptyState(parsed.error.message);
        showStatus("JSON validation failed.", "error");
        return null;
    }

    jsonTreeOutput.innerHTML = "";
    const tree = document.createElement("ul");
    tree.className = "tree-list";
    renderJsonTree(parsed.value, tree, "$");
    jsonTreeOutput.appendChild(tree);

    const formatted = formatJson(parsed.value);
    jsonStats.innerHTML = [
        createStatPill("Valid", "Yes"),
        createStatPill("Type", getValueType(parsed.value)),
        createStatPill("Size", formatBytes(new Blob([formatted]).size))
    ].join("");

    showStatus("JSON is valid.", "success");
    return parsed.value;
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
function renderJsonTree(value, container, path = "$") {
    const type = getValueType(value);
    const item = document.createElement("li");

    if (type === "object" || type === "array") {
        item.innerHTML = `<span class="tree-key">${escapeHtml(path)}</span> <span class="tree-type">${type}</span>`;
        const nested = document.createElement("ul");

        Object.entries(value).forEach(([key, childValue]) => {
            renderJsonTree(childValue, nested, key);
        });

        item.appendChild(nested);
    } else {
        item.innerHTML = `<span class="tree-key">${escapeHtml(path)}</span>: <span class="tree-value">${escapeHtml(JSON.stringify(value))}</span> <span class="tree-type">${type}</span>`;
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
            active: true
        },
        settings: {
            theme: "cyberpunk",
            editor: "DevKit Studio",
            notifications: ["builds", "deployments", "api-errors"]
        },
        products: [
            {
                id: "PRD-1001",
                name: "Neon Mechanical Keyboard",
                price: 129.99,
                inStock: true
            },
            {
                id: "PRD-1002",
                name: "API Debugger Desk Mat",
                price: 39.5,
                inStock: false
            }
        ],
        orders: [
            {
                id: "ORD-9001",
                status: "paid",
                total: 169.49
            }
        ]
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
 * Binds JSON Explorer UI events.
 */
function bindJsonExplorerEvents() {
    document.getElementById("validateJsonBtn").addEventListener("click", validateJsonExplorer);
    document.getElementById("prettyJsonBtn").addEventListener("click", prettyPrintJsonExplorer);
    document.getElementById("minifyJsonBtn").addEventListener("click", minifyJsonExplorer);
    document.getElementById("loadJsonSampleBtn").addEventListener("click", loadJsonExplorerSample);
    document.getElementById("copyJsonBtn").addEventListener("click", copyJsonExplorerOutput);
    document.getElementById("downloadJsonBtn").addEventListener("click", downloadJsonExplorerOutput);
}

/**
 * Initializes the JSON Explorer page.
 */
function initializeJsonExplorer() {
    bindJsonExplorerEvents();
}

document.addEventListener("DOMContentLoaded", initializeJsonExplorer);