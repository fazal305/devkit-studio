const schemaInput = document.getElementById("schemaInput");
const schemaFileInput = document.getElementById("schemaFileInput");
const schemaPreviewOutput = document.getElementById("schemaPreviewOutput");
const schemaAnalysisOutput = document.getElementById("schemaAnalysisOutput");
const schemaStats = document.getElementById("schemaStats");
const schemaFieldSearch = document.getElementById("schemaFieldSearch");
const includeRequiredToggle = document.getElementById("includeRequiredToggle");
const includeExamplesToggle = document.getElementById("includeExamplesToggle");
const includeDescriptionsToggle = document.getElementById(
  "includeDescriptionsToggle",
);
const detectNullableToggle = document.getElementById("detectNullableToggle");
const strictArrayItemsToggle = document.getElementById(
  "strictArrayItemsToggle",
);

let schemaState = null;
let schemaAnalysisRows = [];
let filteredSchemaAnalysisRows = [];

// Schema generation options ported from fazal305/json-schema-builder: devkit's
// builder previously always marked every field required, never included
// examples/descriptions, never flagged nullable fields, and always used a
// strict (oneOf-merged) array item strategy with no way to turn any of it off.
let schemaOptions = {
  includeRequired: true,
  includeExamples: false,
  includeDescriptions: false,
  detectNullable: true,
  strictArrayItems: true,
};

/**
 * Reads option checkboxes into schemaOptions.
 */
function syncSchemaOptions() {
  schemaOptions = {
    includeRequired: includeRequiredToggle.checked,
    includeExamples: includeExamplesToggle.checked,
    includeDescriptions: includeDescriptionsToggle.checked,
    detectNullable: detectNullableToggle.checked,
    strictArrayItems: strictArrayItemsToggle.checked,
  };
}

/**
 * Generates JSON Schema from the sample JSON editor.
 */
function generateJsonSchemaFromSample() {
  const parsed = parseJson(schemaInput.value);

  if (!parsed.ok) {
    showStatus("Sample JSON is invalid.", "error");
    return;
  }

  syncSchemaOptions();
  schemaAnalysisRows = [];
  schemaState = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...generateSchema(parsed.value, "$"),
  };
  filteredSchemaAnalysisRows = [...schemaAnalysisRows];

  renderSchemaPreview(schemaState);
  renderSchemaFieldAnalysis(filteredSchemaAnalysisRows);
  renderSchemaStats(schemaAnalysisRows);
  schemaFieldSearch.value = "";
  showStatus("JSON Schema generated.", "success");
}

/**
 * Generates a JSON Schema node recursively.
 */
function generateSchema(value, path = "$") {
  const type = getValueType(value);
  const example = formatSchemaExample(value);
  schemaAnalysisRows.push({
    path,
    type,
    required: schemaOptions.includeRequired,
    example,
  });

  let schema;

  if (type === "object") {
    schema = generateObjectSchema(value, path);
  } else if (type === "array") {
    schema = generateArraySchema(value, path);
  } else {
    schema = { type };
  }

  if (schemaOptions.detectNullable && value === null) {
    schema.type = "null";
  }

  if (schemaOptions.includeExamples && value !== undefined) {
    schema.examples = [value];
  }

  if (schemaOptions.includeDescriptions) {
    schema.description =
      path === "$" ? "Schema for the root JSON value." : `Schema for ${path}.`;
  }

  return schema;
}

/**
 * Formats a value for the field analysis table.
 */
function formatSchemaExample(value) {
  const type = getValueType(value);

  if (type === "object" || type === "array") {
    const text = JSON.stringify(value);
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  if (type === "string") {
    return `"${value}"`;
  }

  return String(value);
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

  const schema = {
    type: "object",
    properties,
    additionalProperties: false,
  };

  if (schemaOptions.includeRequired && required.length) {
    schema.required = required;
  }

  return schema;
}

/**
 * Generates schema for array values. When strictArrayItems is off, only the
 * first item's shape is used instead of merging every item
 * (ported from fazal305/json-schema-builder).
 */
function generateArraySchema(array, path = "$") {
  if (!array.length) {
    return { type: "array", items: {} };
  }

  if (!schemaOptions.strictArrayItems) {
    return { type: "array", items: generateSchema(array[0], `${path}[0]`) };
  }

  return {
    type: "array",
    items: mergeSchemas(
      array.map((item, index) => generateSchema(item, `${path}[${index}]`)),
    ),
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
        properties[key] = properties[key]
          ? mergeSchemas([properties[key], value])
          : value;
        required.add(key);
      });
    });

    return {
      type: "object",
      properties,
      required: Array.from(required),
      additionalProperties: false,
    };
  }

  if (uniqueTypes[0] === "array") {
    return {
      type: "array",
      items: mergeSchemas(schemas.map((schema) => schema.items || {})),
    };
  }

  return schemas[0];
}

/**
 * Renders the generated schema preview.
 */
function renderSchemaPreview(schema) {
  schemaPreviewOutput.textContent = schema
    ? formatJson(schema)
    : "Generate a schema to preview it here.";
}

/**
 * Renders schema field analysis rows.
 */
function renderSchemaFieldAnalysis(rows) {
  if (!rows.length) {
    schemaAnalysisOutput.innerHTML = renderEmptyState(
      schemaAnalysisRows.length
        ? "No fields match your search."
        : "No field analysis available.",
    );
    return;
  }

  schemaAnalysisOutput.innerHTML = rows
    .map(
      (row) => `
    <article class="history-item">
      <h4>${escapeHtml(row.path)}</h4>
      <p class="item-meta">type: ${escapeHtml(row.type)} | required: ${escapeHtml(row.required ? "Yes" : "No")} | example: ${escapeHtml(row.example)}</p>
    </article>
  `,
    )
    .join("");
}

/**
 * Renders field/depth/array stats for the generated schema
 * (ported from fazal305/json-schema-builder).
 */
function renderSchemaStats(rows) {
  const nestedObjects = rows.filter(
    (row) => row.type === "object" && row.path !== "$",
  ).length;
  const arraysFound = rows.filter((row) => row.type === "array").length;
  const maxDepth = rows.reduce((max, row) => {
    const depth = (row.path.match(/\.|\[/g) || []).length;
    return Math.max(max, depth);
  }, 0);

  schemaStats.innerHTML = [
    createStatPill("Total Fields", rows.length),
    createStatPill("Nested Objects", nestedObjects),
    createStatPill("Arrays Found", arraysFound),
    createStatPill("Max Depth", maxDepth),
  ].join("");
}

/**
 * Filters field analysis rows by path, type, required status, or example
 * (ported from fazal305/json-schema-builder).
 */
function filterSchemaFieldAnalysis(term) {
  const normalizedTerm = term.trim().toLowerCase();

  filteredSchemaAnalysisRows = normalizedTerm
    ? schemaAnalysisRows.filter((row) => {
        const requiredText = row.required ? "required yes" : "optional no";

        return (
          row.path.toLowerCase().includes(normalizedTerm) ||
          row.type.toLowerCase().includes(normalizedTerm) ||
          row.example.toLowerCase().includes(normalizedTerm) ||
          requiredText.includes(normalizedTerm)
        );
      })
    : [...schemaAnalysisRows];

  renderSchemaFieldAnalysis(filteredSchemaAnalysisRows);
}

/**
 * Imports a local .json file and generates a schema from its contents
 * (ported from fazal305/json-schema-builder).
 */
function handleSchemaFileImport(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    showStatus("Please import a .json file.", "error");
    schemaFileInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    schemaInput.value = String(reader.result);
    generateJsonSchemaFromSample();
  });

  reader.addEventListener("error", () => {
    showStatus("Unable to read the selected file.", "error");
  });

  reader.readAsText(file);
}

/**
 * Pretty-prints the sample JSON input
 * (ported from fazal305/json-schema-builder).
 */
function formatSchemaInput() {
  const parsed = parseJson(schemaInput.value);

  if (!parsed.ok) {
    showStatus("Cannot format invalid JSON.", "error");
    return;
  }

  schemaInput.value = formatJson(parsed.value);
  showStatus("Input JSON formatted.", "success");
}

/**
 * Copies the sample JSON input.
 */
function copySchemaInput() {
  copyText(schemaInput.value, "Input JSON copied.");
}

/**
 * Clears all schema builder state and output
 * (ported from fazal305/json-schema-builder).
 */
function clearSchemaBuilder() {
  schemaState = null;
  schemaAnalysisRows = [];
  filteredSchemaAnalysisRows = [];

  schemaInput.value = "";
  schemaFileInput.value = "";
  schemaFieldSearch.value = "";

  renderSchemaPreview(null);
  renderSchemaFieldAnalysis([]);
  renderSchemaStats([]);
  showStatus("Cleared input, output, and stats.", "info");
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
        unit: "cm",
      },
    },
    order: {
      id: "ORD-9001",
      status: "paid",
      customer: {
        name: "Fazal Developer",
        email: "fazal@example.com",
      },
      items: [
        {
          sku: "PRD-100",
          quantity: 1,
          total: 129.99,
        },
      ],
    },
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
  downloadText(
    "devkit-schema.json",
    schemaPreviewOutput.textContent,
    "application/schema+json",
  );
}

/**
 * Binds Schema Builder UI events.
 */
function bindSchemaBuilderEvents() {
  document
    .getElementById("generateSchemaBtn")
    .addEventListener("click", generateJsonSchemaFromSample);
  document
    .getElementById("loadSchemaSampleBtn")
    .addEventListener("click", loadSchemaSample);
  document
    .getElementById("copySchemaBtn")
    .addEventListener("click", copySchemaOutput);
  document
    .getElementById("downloadSchemaBtn")
    .addEventListener("click", downloadSchemaOutput);
  document
    .getElementById("formatSchemaInputBtn")
    .addEventListener("click", formatSchemaInput);
  document
    .getElementById("copySchemaInputBtn")
    .addEventListener("click", copySchemaInput);
  document
    .getElementById("clearSchemaBtn")
    .addEventListener("click", clearSchemaBuilder);

  schemaFileInput.addEventListener("change", handleSchemaFileImport);
  schemaFieldSearch.addEventListener("input", (event) =>
    filterSchemaFieldAnalysis(event.target.value),
  );

  [
    includeRequiredToggle,
    includeExamplesToggle,
    includeDescriptionsToggle,
    detectNullableToggle,
    strictArrayItemsToggle,
  ].forEach((toggle) => {
    toggle.addEventListener("change", () => {
      if (schemaInput.value.trim()) {
        generateJsonSchemaFromSample();
      }
    });
  });
}

/**
 * Initializes the Schema Builder page.
 */
function initializeSchemaBuilder() {
  bindSchemaBuilderEvents();
}

document.addEventListener("DOMContentLoaded", initializeSchemaBuilder);
