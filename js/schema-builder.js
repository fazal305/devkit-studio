const schemaInput = document.getElementById("schemaInput");
const schemaPreviewOutput = document.getElementById("schemaPreviewOutput");
const schemaAnalysisOutput = document.getElementById("schemaAnalysisOutput");

let schemaState = null;
let schemaAnalysisRows = [];

/**
 * Generates JSON Schema from the sample JSON editor.
 */
function generateJsonSchemaFromSample() {
    const parsed = parseJson(schemaInput.value);

    if (!parsed.ok) {
        showStatus("Sample JSON is invalid.", "error");
        return;
    }

    schemaAnalysisRows = [];
    schemaState = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        ...generateSchema(parsed.value, "$")
    };

    renderSchemaPreview(schemaState);
    renderSchemaFieldAnalysis(schemaAnalysisRows);
    showStatus("JSON Schema generated.", "success");
}

/**
 * Generates a JSON Schema node recursively.
 */
function generateSchema(value, path = "$") {
    const type = getValueType(value);
    schemaAnalysisRows.push({ path, type, required: true });

    if (type === "object") {
        return generateObjectSchema(value, path);
    }

    if (type === "array") {
        return generateArraySchema(value, path);
    }

    return { type };
}

/**
 * Generates schema for object values.
 */
function generateObjectSchema(obj, path = "$") {
    const properties = {};
    const required = [];

    Object.entries(obj).forEach(([key, value]) => {
        properties[key] = generateSchema(value, `${path}.${key}`);
        required.push(key);
    });

    return {
        type: "object",
        properties,
        required,
        additionalProperties: false
    };
}

/**
 * Generates schema for array values.
 */
function generateArraySchema(array, path = "$") {
    if (!array.length) {
        return { type: "array", items: {} };
    }

    return {
        type: "array",
        items: mergeSchemas(array.map((item, index) => generateSchema(item, `${path}[${index}]`)))
    };
}

/**
 * Merges compatible schemas found in array samples.
 */
function mergeSchemas(schemas) {
    const uniqueTypes = [...new Set(schemas.map((schema) => schema.type))];

    if (uniqueTypes.length > 1) {
        return { anyOf: schemas };
    }

    if (uniqueTypes[0] === "object") {
        const properties = {};
        const required = new Set();

        schemas.forEach((schema) => {
            Object.entries(schema.properties || {}).forEach(([key, value]) => {
                properties[key] = properties[key] ? mergeSchemas([properties[key], value]) : value;
                required.add(key);
            });
        });

        return {
            type: "object",
            properties,
            required: Array.from(required),
            additionalProperties: false
        };
    }

    if (uniqueTypes[0] === "array") {
        return {
            type: "array",
            items: mergeSchemas(schemas.map((schema) => schema.items || {}))
        };
    }

    return schemas[0];
}

/**
 * Renders the generated schema preview.
 */
function renderSchemaPreview(schema) {
    schemaPreviewOutput.textContent = formatJson(schema);
}

/**
 * Renders schema field analysis rows.
 */
function renderSchemaFieldAnalysis(rows) {
    if (!rows.length) {
        schemaAnalysisOutput.innerHTML = renderEmptyState("No field analysis available.");
        return;
    }

    schemaAnalysisOutput.innerHTML = rows.map((row) => `
    <article class="history-item">
      <h4>${escapeHtml(row.path)}</h4>
      <p class="item-meta">type: ${escapeHtml(row.type)} | required: ${escapeHtml(row.required)}</p>
    </article>
  `).join("");
}

/**
 * Loads realistic sample JSON for schema generation.
 */
function loadSchemaSample() {
    schemaInput.value = formatJson({
        product: {
            id: "PRD-100",
            name: "Neon Mechanical Keyboard",
            price: 129.99,
            inStock: true,
            tags: ["keyboard", "rgb", "developer"],
            dimensions: {
                width: 44,
                height: 4,
                unit: "cm"
            }
        },
        order: {
            id: "ORD-9001",
            status: "paid",
            customer: {
                name: "Fazal Developer",
                email: "fazal@example.com"
            },
            items: [
                {
                    sku: "PRD-100",
                    quantity: 1,
                    total: 129.99
                }
            ]
        }
    });

    generateJsonSchemaFromSample();
}

/**
 * Copies the generated schema.
 */
function copySchemaOutput() {
    copyText(schemaPreviewOutput.textContent, "Schema copied.");
}

/**
 * Downloads the generated schema.
 */
function downloadSchemaOutput() {
    downloadText("devkit-schema.json", schemaPreviewOutput.textContent, "application/schema+json");
}

/**
 * Binds Schema Builder UI events.
 */
function bindSchemaBuilderEvents() {
    document.getElementById("generateSchemaBtn").addEventListener("click", generateJsonSchemaFromSample);
    document.getElementById("loadSchemaSampleBtn").addEventListener("click", loadSchemaSample);
    document.getElementById("copySchemaBtn").addEventListener("click", copySchemaOutput);
    document.getElementById("downloadSchemaBtn").addEventListener("click", downloadSchemaOutput);
}

/**
 * Initializes the Schema Builder page.
 */
function initializeSchemaBuilder() {
    bindSchemaBuilderEvents();
}

document.addEventListener("DOMContentLoaded", initializeSchemaBuilder);