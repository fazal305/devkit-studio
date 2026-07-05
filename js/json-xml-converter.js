const converterMode = document.getElementById("converterMode");
const converterInput = document.getElementById("converterInput");
const converterOutput = document.getElementById("converterOutput");

let converterOutputState = "";

/**
 * Converts a JSON value into XML text.
 */
function convertJsonToXml(jsonValue, rootName = "root") {
    const safeRoot = sanitizeXmlName(rootName);

    if (Array.isArray(jsonValue)) {
        return `<${safeRoot}>${jsonValue.map((item) => convertJsonToXml(item, "item")).join("")}</${safeRoot}>`;
    }

    if (jsonValue !== null && typeof jsonValue === "object") {
        const children = Object.entries(jsonValue)
            .map(([key, value]) => convertJsonToXml(value, key))
            .join("");

        return `<${safeRoot}>${children}</${safeRoot}>`;
    }

    return `<${safeRoot}>${escapeHtml(jsonValue)}</${safeRoot}>`;
}

/**
 * Sanitizes JSON keys so they can become XML element names.
 */
function sanitizeXmlName(name) {
    return String(name || "item").replace(/^[^A-Za-z_]+|[^A-Za-z0-9_.-]/g, "_");
}

/**
 * Converts an XML node into a JSON-compatible value.
 */
function convertXmlToJson(xmlNode) {
    const childElements = Array.from(xmlNode.children);
    const attributes = Array.from(xmlNode.attributes || {});

    if (!childElements.length && !attributes.length) {
        return xmlNode.textContent.trim();
    }

    const result = {};

    attributes.forEach((attribute) => {
        result[`@${attribute.name}`] = attribute.value;
    });

    childElements.forEach((child) => {
        const value = convertXmlToJson(child);

        if (result[child.nodeName]) {
            if (!Array.isArray(result[child.nodeName])) {
                result[child.nodeName] = [result[child.nodeName]];
            }

            result[child.nodeName].push(value);
        } else {
            result[child.nodeName] = value;
        }
    });

    const text = Array.from(xmlNode.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.trim())
        .filter(Boolean)
        .join(" ");

    if (text) {
        result["#text"] = text;
    }

    return result;
}

/**
 * Runs the active converter mode.
 */
function handleConverterRun() {
    if (converterMode.value === "jsonToXml") {
        const parsed = parseJson(converterInput.value);

        if (!parsed.ok) {
            showStatus("JSON input is invalid.", "error");
            return;
        }

        converterOutputState = prettyFormatXmlText(convertJsonToXml(parsed.value, "devkit"));
        converterOutput.textContent = converterOutputState;
        showStatus("JSON converted to XML.", "success");
        return;
    }

    const parsedXml = parseXml(converterInput.value);

    if (!parsedXml.ok) {
        showStatus("XML input is invalid.", "error");
        return;
    }

    const converted = {
        [parsedXml.value.documentElement.nodeName]: convertXmlToJson(parsedXml.value.documentElement)
    };

    converterOutputState = formatJson(converted);
    converterOutput.textContent = converterOutputState;
    showStatus("XML converted to JSON.", "success");
}

/**
 * Formats XML text with indentation.
 */
function prettyFormatXmlText(xmlText) {
    const parsed = parseXml(xmlText);

    if (!parsed.ok) {
        return xmlText;
    }

    return prettyFormatXmlNode(parsed.value.documentElement);
}

/**
 * Formats an XML node recursively.
 */
function prettyFormatXmlNode(node, depth = 0) {
    const indent = "  ".repeat(depth);

    if (node.nodeType === Node.TEXT_NODE) {
        const value = node.textContent.trim();
        return value ? `${indent}${value}` : "";
    }

    const children = Array.from(node.childNodes).filter((child) => {
        return child.nodeType !== Node.TEXT_NODE || child.textContent.trim();
    });

    if (!children.length) {
        return `${indent}<${node.nodeName}></${node.nodeName}>`;
    }

    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        return `${indent}<${node.nodeName}>${children[0].textContent.trim()}</${node.nodeName}>`;
    }

    const childText = children
        .map((child) => prettyFormatXmlNode(child, depth + 1))
        .filter(Boolean)
        .join("\n");

    return `${indent}<${node.nodeName}>\n${childText}\n${indent}</${node.nodeName}>`;
}

/**
 * Loads sample input for the selected converter mode.
 */
function loadConverterSample() {
    if (converterMode.value === "jsonToXml") {
        converterInput.value = formatJson({
            user: {
                id: 305,
                name: "Fazal Developer",
                role: "Frontend Engineer"
            },
            product: {
                sku: "PRD-100",
                name: "Neon Keyboard",
                price: 129.99
            },
            settings: {
                theme: "cyberpunk",
                notifications: true
            }
        });
    } else {
        converterInput.value = `<order>
  <id>ORD-9001</id>
  <status>paid</status>
  <customer>
    <name>Fazal Developer</name>
    <email>fazal@example.com</email>
  </customer>
  <items>
    <item>
      <sku>PRD-100</sku>
      <quantity>1</quantity>
    </item>
  </items>
</order>`;
    }

    handleConverterRun();
}

/**
 * Copies converter output.
 */
function copyConverterOutput() {
    copyText(converterOutputState || converterOutput.textContent, "Converted output copied.");
}

/**
 * Downloads converter output.
 */
function downloadConverterOutput() {
    const isJson = converterMode.value === "xmlToJson";
    downloadText(isJson ? "devkit-converted.json" : "devkit-converted.xml", converterOutputState || converterOutput.textContent, isJson ? "application/json" : "application/xml");
}

/**
 * Binds converter UI events.
 */
function bindConverterEvents() {
    document.getElementById("runConverterBtn").addEventListener("click", handleConverterRun);
    document.getElementById("loadConverterSampleBtn").addEventListener("click", loadConverterSample);
    document.getElementById("copyConverterOutputBtn").addEventListener("click", copyConverterOutput);
    document.getElementById("downloadConverterOutputBtn").addEventListener("click", downloadConverterOutput);
    converterMode.addEventListener("change", loadConverterSample);
}

/**
 * Initializes the converter page.
 */
function initializeConverter() {
    bindConverterEvents();
}

document.addEventListener("DOMContentLoaded", initializeConverter);