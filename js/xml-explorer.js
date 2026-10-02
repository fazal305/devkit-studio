const xmlInput = document.getElementById("xmlInput");
const xmlFileInput = document.getElementById("xmlFileInput");
const xmlTreeOutput = document.getElementById("xmlTreeOutput");
const xmlStats = document.getElementById("xmlStats");
const xmlTreeSearch = document.getElementById("xmlTreeSearch");
const xmlTreeMatchCount = document.getElementById("xmlTreeMatchCount");

let xmlExplorerDocState = null;

/**
 * Validates XML input, updates stats, and renders the XML tree.
 */
function validateXmlExplorer() {
  const parsed = parseXml(xmlInput.value);

  if (!parsed.ok) {
    xmlStats.innerHTML = createStatPill("Valid", "No");
    xmlTreeOutput.innerHTML = renderEmptyState(parsed.error.message);
    xmlExplorerDocState = null;
    xmlTreeSearch.disabled = true;
    xmlTreeSearch.value = "";
    xmlTreeMatchCount.textContent = "0 matches";
    showStatus("XML validation failed.", "error");
    return null;
  }

  xmlExplorerDocState = parsed.value;
  xmlTreeSearch.disabled = false;
  renderXmlExplorerTree();

  // Element/attribute/depth counts ported from fazal305/dataforge's stats bar.
  xmlStats.innerHTML = [
    createStatPill("Valid", "Yes"),
    createStatPill("Root", parsed.value.documentElement.nodeName),
    createStatPill("Tags", countXmlElements(parsed.value)),
    createStatPill("Max Depth", getXmlMaxDepth(parsed.value.documentElement, 1)),
    createStatPill("Attributes", countXmlAttributes(parsed.value)),
    createStatPill("Size", formatBytes(new Blob([xmlInput.value]).size)),
  ].join("");

  showStatus("XML is valid.", "success");
  return parsed.value;
}

/**
 * Re-renders the tree using the current search term and updates the match
 * count (search/highlight ported from fazal305/dataforge).
 */
function renderXmlExplorerTree() {
  if (!xmlExplorerDocState) {
    return;
  }

  const term = xmlTreeSearch.value.trim();
  xmlTreeOutput.innerHTML = "";
  const tree = document.createElement("ul");
  tree.className = "tree-list";
  renderXmlTree(xmlExplorerDocState.documentElement, tree, term);
  xmlTreeOutput.appendChild(tree);

  const matches = term
    ? countXmlMatches(xmlExplorerDocState.documentElement, term.toLowerCase())
    : 0;
  xmlTreeMatchCount.textContent = `${matches} ${matches === 1 ? "match" : "matches"}`;
}

/**
 * Counts XML element nodes (ported from fazal305/dataforge).
 */
function countXmlElements(xmlDoc) {
  return xmlDoc.getElementsByTagName("*").length;
}

/**
 * Counts XML attributes across all elements (ported from fazal305/dataforge).
 */
function countXmlAttributes(xmlDoc) {
  return Array.from(xmlDoc.getElementsByTagName("*")).reduce(
    (total, element) => total + element.attributes.length,
    0,
  );
}

/**
 * Finds the maximum XML element depth (ported from fazal305/dataforge).
 */
function getXmlMaxDepth(node, depth = 1) {
  const children = Array.from(node.children);

  if (!children.length) {
    return depth;
  }

  return Math.max(...children.map((child) => getXmlMaxDepth(child, depth + 1)));
}

/**
 * Counts how many times a search term appears across tag names,
 * attributes, and text (ported from fazal305/dataforge).
 */
function countXmlMatches(node, needle) {
  let total = node.nodeName.toLowerCase().includes(needle) ? 1 : 0;

  Array.from(node.attributes || []).forEach((attribute) => {
    if (attribute.name.toLowerCase().includes(needle)) total += 1;
    if (attribute.value.toLowerCase().includes(needle)) total += 1;
  });

  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      total += countXmlMatches(child, needle);
    } else if (
      child.nodeType === Node.TEXT_NODE &&
      child.textContent.trim().toLowerCase().includes(needle)
    ) {
      total += 1;
    }
  });

  return total;
}

/**
 * Wraps search term matches in a <mark> highlight
 * (ported from fazal305/dataforge).
 */
function highlightXmlMatch(text, term) {
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
 * Pretty prints the current XML input.
 */
function prettyPrintXmlExplorer() {
  const xmlDoc = validateXmlExplorer();

  if (!xmlDoc) {
    return;
  }

  xmlInput.value = prettyFormatXml(xmlDoc.documentElement);
  showStatus("XML formatted.", "success");
}

/**
 * Formats an XML node recursively with indentation.
 */
function prettyFormatXml(node, depth = 0) {
  const indent = "  ".repeat(depth);

  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent.trim();
    return value ? `${indent}${value}` : "";
  }

  const attributes = Array.from(node.attributes || [])
    .map((attribute) => ` ${attribute.name}="${attribute.value}"`)
    .join("");

  const children = Array.from(node.childNodes).filter((child) => {
    return child.nodeType !== Node.TEXT_NODE || child.textContent.trim();
  });

  if (!children.length) {
    return `${indent}<${node.nodeName}${attributes}></${node.nodeName}>`;
  }

  if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
    return `${indent}<${node.nodeName}${attributes}>${children[0].textContent.trim()}</${node.nodeName}>`;
  }

  const childText = children
    .map((child) => prettyFormatXml(child, depth + 1))
    .filter(Boolean)
    .join("\n");

  return `${indent}<${node.nodeName}${attributes}>\n${childText}\n${indent}</${node.nodeName}>`;
}

/**
 * Recursively renders XML nodes as a tree.
 */
function renderXmlTree(xmlNode, container, searchTerm = "") {
  const item = document.createElement("li");
  const attributes = Array.from(xmlNode.attributes || [])
    .map((attribute) => `${attribute.name}="${attribute.value}"`)
    .join(" ");

  const childElements = Array.from(xmlNode.children);

  if (childElements.length) {
    // Collapsible toggle button ported from fazal305/dataforge's tree.
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-sm btn-ghost tree-toggle";
    toggle.textContent = "-";
    toggle.setAttribute("aria-label", `Toggle ${xmlNode.nodeName}`);
    item.appendChild(toggle);

    const nested = document.createElement("ul");
    toggle.addEventListener("click", () => {
      const collapsed = nested.classList.toggle("d-none");
      toggle.textContent = collapsed ? "+" : "-";
    });

    const label = document.createElement("span");
    label.innerHTML = buildXmlNodeLabel(xmlNode, attributes, searchTerm);
    item.appendChild(label);

    childElements.forEach((child) =>
      renderXmlTree(child, nested, searchTerm),
    );
    item.appendChild(nested);
  } else {
    item.innerHTML = buildXmlNodeLabel(xmlNode, attributes, searchTerm);
  }

  container.appendChild(item);
}

/**
 * Builds the label markup for one XML tree node, including attributes and
 * direct text content with search highlighting.
 */
function buildXmlNodeLabel(xmlNode, attributes, searchTerm) {
  let html = `<span class="tree-key">${highlightXmlMatch(xmlNode.nodeName, searchTerm)}</span>`;

  if (attributes) {
    html += ` <span class="tree-type">${highlightXmlMatch(attributes, searchTerm)}</span>`;
  }

  const text = Array.from(xmlNode.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(" ");

  if (text) {
    html += `: <span class="tree-value">${highlightXmlMatch(text, searchTerm)}</span>`;
  }

  return html;
}

/**
 * Loads realistic sample XML into the editor.
 */
function loadXmlExplorerSample() {
  xmlInput.value = `<workspace>
  <project id="devkit-studio" status="active">
    <name>DevKit Studio</name>
    <owner>Fazal Developer</owner>
    <modules>
      <module enabled="true">JSON Explorer</module>
      <module enabled="true">XML Explorer</module>
      <module enabled="true">API Client</module>
      <module enabled="true">Schema Builder</module>
    </modules>
    <settings>
      <theme>cyberpunk</theme>
      <storage>localStorage</storage>
      <build>no-build</build>
    </settings>
  </project>
</workspace>`;

  validateXmlExplorer();
}

/**
 * Copies the current XML editor value.
 */
function copyXmlExplorerOutput() {
  copyText(xmlInput.value, "XML copied.");
}

/**
 * Downloads the current XML editor value.
 */
function downloadXmlExplorerOutput() {
  downloadText("devkit-xml-output.xml", xmlInput.value, "application/xml");
}

/**
 * Imports a local XML/text file into the editor
 * (ported from fazal305/dataforge).
 */
async function handleXmlExplorerFileImport(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  xmlInput.value = await file.text();
  validateXmlExplorer();
  xmlFileInput.value = "";
}

/**
 * Binds XML Explorer UI events.
 */
function bindXmlExplorerEvents() {
  document
    .getElementById("validateXmlBtn")
    .addEventListener("click", validateXmlExplorer);
  document
    .getElementById("prettyXmlBtn")
    .addEventListener("click", prettyPrintXmlExplorer);
  document
    .getElementById("loadXmlSampleBtn")
    .addEventListener("click", loadXmlExplorerSample);
  xmlFileInput.addEventListener("change", handleXmlExplorerFileImport);
  xmlTreeSearch.addEventListener("input", renderXmlExplorerTree);
  document
    .getElementById("copyXmlBtn")
    .addEventListener("click", copyXmlExplorerOutput);
  document
    .getElementById("downloadXmlBtn")
    .addEventListener("click", downloadXmlExplorerOutput);
}

/**
 * Initializes the XML Explorer page.
 */
function initializeXmlExplorer() {
  bindXmlExplorerEvents();
}

document.addEventListener("DOMContentLoaded", initializeXmlExplorer);
