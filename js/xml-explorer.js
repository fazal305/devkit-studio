const xmlInput = document.getElementById("xmlInput");
const xmlTreeOutput = document.getElementById("xmlTreeOutput");
const xmlStats = document.getElementById("xmlStats");

/**
 * Validates XML input, updates stats, and renders the XML tree.
 */
function validateXmlExplorer() {
    const parsed = parseXml(xmlInput.value);

    if (!parsed.ok) {
        xmlStats.innerHTML = createStatPill("Valid", "No");
        xmlTreeOutput.innerHTML = renderEmptyState(parsed.error.message);
        showStatus("XML validation failed.", "error");
        return null;
    }

    xmlTreeOutput.innerHTML = "";
    const tree = document.createElement("ul");
    tree.className = "tree-list";
    renderXmlTree(parsed.value.documentElement, tree);
    xmlTreeOutput.appendChild(tree);

    xmlStats.innerHTML = [
        createStatPill("Valid", "Yes"),
        createStatPill("Root", parsed.value.documentElement.nodeName),
        createStatPill("Size", formatBytes(new Blob([xmlInput.value]).size))
    ].join("");

    showStatus("XML is valid.", "success");
    return parsed.value;
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
function renderXmlTree(xmlNode, container) {
    const item = document.createElement("li");
    const attributes = Array.from(xmlNode.attributes || [])
        .map((attribute) => `${attribute.name}="${attribute.value}"`)
        .join(" ");

    item.innerHTML = `<span class="tree-key">${escapeHtml(xmlNode.nodeName)}</span>`;

    if (attributes) {
        item.innerHTML += ` <span class="tree-type">${escapeHtml(attributes)}</span>`;
    }

    const text = Array.from(xmlNode.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.trim())
        .filter(Boolean)
        .join(" ");

    if (text) {
        item.innerHTML += `: <span class="tree-value">${escapeHtml(text)}</span>`;
    }

    const childElements = Array.from(xmlNode.children);

    if (childElements.length) {
        const nested = document.createElement("ul");
        childElements.forEach((child) => renderXmlTree(child, nested));
        item.appendChild(nested);
    }

    container.appendChild(item);
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
 * Binds XML Explorer UI events.
 */
function bindXmlExplorerEvents() {
    document.getElementById("validateXmlBtn").addEventListener("click", validateXmlExplorer);
    document.getElementById("prettyXmlBtn").addEventListener("click", prettyPrintXmlExplorer);
    document.getElementById("loadXmlSampleBtn").addEventListener("click", loadXmlExplorerSample);
    document.getElementById("copyXmlBtn").addEventListener("click", copyXmlExplorerOutput);
    document.getElementById("downloadXmlBtn").addEventListener("click", downloadXmlExplorerOutput);
}

/**
 * Initializes the XML Explorer page.
 */
function initializeXmlExplorer() {
    bindXmlExplorerEvents();
}

document.addEventListener("DOMContentLoaded", initializeXmlExplorer);