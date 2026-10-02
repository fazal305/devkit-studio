const originalResponseInput = document.getElementById("originalResponseInput");
const updatedResponseInput = document.getElementById("updatedResponseInput");
const diffStats = document.getElementById("diffStats");
const diffResultsOutput = document.getElementById("diffResultsOutput");
const showUnchangedToggle = document.getElementById("showUnchangedToggle");
const caseSensitiveToggle = document.getElementById("caseSensitiveToggle");
const compareArrayOrderToggle = document.getElementById(
  "compareArrayOrderToggle",
);
const diffFilterInput = document.getElementById("diffFilterInput");

let diffResultsState = [];
let filteredDiffResultsState = [];

// Comparison options ported from fazal305/api-response-comparator: devkit's
// comparator previously always compared array order strictly, always used
// case-sensitive string equality, and always rendered unchanged fields.
let comparisonOptions = {
  showUnchanged: false,
  caseSensitive: true,
  compareArrayOrder: true,
};

/**
 * Reads comparison option toggles into comparisonOptions.
 */
function syncComparisonOptions() {
  comparisonOptions = {
    showUnchanged: showUnchangedToggle.checked,
    caseSensitive: caseSensitiveToggle.checked,
    compareArrayOrder: compareArrayOrderToggle.checked,
  };
}

/**
 * Compares the original and updated response JSON inputs.
 */
function compareResponses() {
  const original = parseJson(originalResponseInput.value);
  const updated = parseJson(updatedResponseInput.value);

  if (!original.ok || !updated.ok) {
    showStatus("Both response inputs must contain valid JSON.", "error");
    return;
  }

  syncComparisonOptions();
  diffResultsState = compareValues(original.value, updated.value, "$");
  filteredDiffResultsState = [...diffResultsState];
  diffFilterInput.value = "";
  renderDiffResults(filteredDiffResultsState);
  showStatus("Response comparison complete.", "success");
}

/**
 * Compares two values recursively.
 */
function compareValues(originalValue, updatedValue, path = "$") {
  const originalType = getValueType(originalValue);
  const updatedType = getValueType(updatedValue);

  if (originalType !== updatedType) {
    return [
      {
        type: "changed",
        path,
        before: originalValue,
        after: updatedValue,
        message: `Type changed from ${originalType} to ${updatedType}`,
      },
    ];
  }

  if (originalType === "object") {
    return compareObjects(originalValue, updatedValue, path);
  }

  if (originalType === "array") {
    return compareArrays(originalValue, updatedValue, path);
  }

  if (
    originalType === "string" &&
    !comparisonOptions.caseSensitive &&
    originalValue.toLowerCase() === updatedValue.toLowerCase()
  ) {
    return comparisonOptions.showUnchanged
      ? [
          {
            type: "unchanged",
            path,
            before: originalValue,
            after: updatedValue,
            message: "Unchanged",
          },
        ]
      : [];
  }

  if (originalValue !== updatedValue) {
    return [
      {
        type: "changed",
        path,
        before: originalValue,
        after: updatedValue,
        message: "Value changed",
      },
    ];
  }

  return comparisonOptions.showUnchanged
    ? [
        {
          type: "unchanged",
          path,
          before: originalValue,
          after: updatedValue,
          message: "Unchanged",
        },
      ]
    : [];
}

/**
 * Compares two objects recursively.
 */
function compareObjects(originalObj, updatedObj, path = "$") {
  const results = [];
  const keys = new Set([
    ...Object.keys(originalObj),
    ...Object.keys(updatedObj),
  ]);

  keys.forEach((key) => {
    const nextPath = `${path}.${key}`;

    if (!(key in originalObj)) {
      results.push({
        type: "added",
        path: nextPath,
        before: undefined,
        after: updatedObj[key],
        message: "Field added",
      });
      return;
    }

    if (!(key in updatedObj)) {
      results.push({
        type: "removed",
        path: nextPath,
        before: originalObj[key],
        after: undefined,
        message: "Field removed",
      });
      return;
    }

    results.push(...compareValues(originalObj[key], updatedObj[key], nextPath));
  });

  return results;
}

/**
 * Compares two arrays recursively by index. When compareArrayOrder is off,
 * both arrays are sorted by their JSON representation first so re-ordered
 * items aren't reported as changed (ported from api-response-comparator).
 */
function compareArrays(originalArray, updatedArray, path = "$") {
  if (!comparisonOptions.compareArrayOrder) {
    const sortedOriginal = [...originalArray].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
    const sortedUpdated = [...updatedArray].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
    return compareArraysByIndex(sortedOriginal, sortedUpdated, path);
  }

  return compareArraysByIndex(originalArray, updatedArray, path);
}

/**
 * Compares two arrays index by index.
 */
function compareArraysByIndex(originalArray, updatedArray, path = "$") {
  const results = [];
  const maxLength = Math.max(originalArray.length, updatedArray.length);

  for (let index = 0; index < maxLength; index += 1) {
    const nextPath = `${path}[${index}]`;

    if (index >= originalArray.length) {
      results.push({
        type: "added",
        path: nextPath,
        before: undefined,
        after: updatedArray[index],
        message: "Array item added",
      });
      continue;
    }

    if (index >= updatedArray.length) {
      results.push({
        type: "removed",
        path: nextPath,
        before: originalArray[index],
        after: undefined,
        message: "Array item removed",
      });
      continue;
    }

    results.push(
      ...compareValues(originalArray[index], updatedArray[index], nextPath),
    );
  }

  return results;
}

/**
 * Renders diff summary stats (always from the full result set) and the
 * (possibly filtered) result rows.
 */
function renderDiffResults(results) {
  const counts = {
    added: diffResultsState.filter((item) => item.type === "added").length,
    removed: diffResultsState.filter((item) => item.type === "removed").length,
    changed: diffResultsState.filter((item) => item.type === "changed").length,
    unchanged: diffResultsState.filter((item) => item.type === "unchanged")
      .length,
  };

  diffStats.innerHTML = [
    createStatPill("Added", counts.added),
    createStatPill("Removed", counts.removed),
    createStatPill("Changed", counts.changed),
    createStatPill("Unchanged", counts.unchanged),
  ].join("");

  if (!results.length) {
    diffResultsOutput.innerHTML = renderEmptyState(
      diffResultsState.length
        ? "No differences match your filter."
        : "Compare two responses to view the diff report.",
    );
    return;
  }

  diffResultsOutput.innerHTML = results
    .map(
      (item) => `
    <article class="diff-row ${escapeHtml(item.type)}">
      <span class="type-badge ${escapeHtml(item.type)}">${escapeHtml(item.type)}</span>
      <h4 class="mt-2">${escapeHtml(item.path)}</h4>
      <p class="item-description">${escapeHtml(item.message)}</p>
      <pre class="code-output">${escapeHtml(formatJson({ before: item.before ?? null, after: item.after ?? null }))}</pre>
    </article>
  `,
    )
    .join("");
}

/**
 * Generates a structured diff report object.
 */
function generateDiffReport(results) {
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      added: results.filter((item) => item.type === "added").length,
      removed: results.filter((item) => item.type === "removed").length,
      changed: results.filter((item) => item.type === "changed").length,
      unchanged: results.filter((item) => item.type === "unchanged").length,
    },
    results,
  };
}

/**
 * Loads sample original and updated API responses.
 */
function loadComparisonSample() {
  originalResponseInput.value = formatJson({
    id: 101,
    status: "processing",
    total: 299.99,
    user: {
      name: "Ayesha Khan",
      tier: "silver",
    },
    items: [{ sku: "DK-KEYBOARD", quantity: 1, price: 129.99 }],
  });

  updatedResponseInput.value = formatJson({
    id: 101,
    status: "paid",
    total: 279.99,
    user: {
      name: "Ayesha Khan",
      tier: "gold",
    },
    items: [
      { sku: "DK-KEYBOARD", quantity: 1, price: 119.99 },
      { sku: "DK-MOUSE", quantity: 1, price: 49.99 },
    ],
    coupon: "CYBER20",
  });

  compareResponses();
}

/**
 * Filters the current diff results by path, type, or formatted value
 * (ported from fazal305/api-response-comparator).
 */
function filterDiffResults(term) {
  const normalizedTerm = term.trim().toLowerCase();

  filteredDiffResultsState = normalizedTerm
    ? diffResultsState.filter((item) => {
        const searchable = [
          item.path,
          item.type,
          formatValueForReport(item.before),
          formatValueForReport(item.after),
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedTerm);
      })
    : [...diffResultsState];

  renderDiffResults(filteredDiffResultsState);
}

/**
 * Converts a value into a readable string for filtering and text reports.
 */
function formatValueForReport(value) {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "object") {
    return formatJson(value);
  }

  return String(value);
}

/**
 * Builds a human-readable text diff report
 * (ported from fazal305/api-response-comparator).
 */
function buildTextReport() {
  const report = generateDiffReport(diffResultsState);
  const lines = [
    "DevKit Studio Response Comparator Report",
    `Generated: ${report.generatedAt}`,
    "",
    `Added Fields: ${report.summary.added}`,
    `Removed Fields: ${report.summary.removed}`,
    `Changed Values: ${report.summary.changed}`,
    `Unchanged Values: ${report.summary.unchanged}`,
    "",
    "Details:",
  ];

  diffResultsState.forEach((item) => {
    lines.push(
      `- [${item.type}] ${item.path}: ${item.message} (before: ${formatValueForReport(item.before)}, after: ${formatValueForReport(item.after)})`,
    );
  });

  return lines.join("\n");
}

/**
 * Copies the current diff report.
 */
function copyDiffReport() {
  copyText(
    formatJson(generateDiffReport(diffResultsState)),
    "Diff report copied.",
  );
}

/**
 * Downloads the current diff report.
 */
function downloadDiffJson() {
  downloadText(
    "devkit-diff-report.json",
    formatJson(generateDiffReport(diffResultsState)),
    "application/json",
  );
}

/**
 * Downloads a human-readable text diff report.
 */
function downloadDiffText() {
  if (!diffResultsState.length) {
    showStatus("Run a comparison before downloading a text report.", "error");
    return;
  }

  downloadText(
    "devkit-diff-report.txt",
    buildTextReport(),
    "text/plain",
  );
}

/**
 * Binds Response Comparator UI events.
 */
function bindResponseComparatorEvents() {
  document
    .getElementById("compareResponsesBtn")
    .addEventListener("click", compareResponses);
  document
    .getElementById("loadComparisonSampleBtn")
    .addEventListener("click", loadComparisonSample);
  document
    .getElementById("copyDiffReportBtn")
    .addEventListener("click", copyDiffReport);
  document
    .getElementById("downloadDiffJsonBtn")
    .addEventListener("click", downloadDiffJson);
  document
    .getElementById("downloadDiffTextBtn")
    .addEventListener("click", downloadDiffText);

  diffFilterInput.addEventListener("input", () => {
    filterDiffResults(diffFilterInput.value);
  });

  [showUnchangedToggle, caseSensitiveToggle, compareArrayOrderToggle].forEach(
    (toggle) => {
      toggle.addEventListener("change", () => {
        if (originalResponseInput.value.trim() && updatedResponseInput.value.trim()) {
          compareResponses();
        }
      });
    },
  );
}

/**
 * Initializes the Response Comparator page.
 */
function initializeResponseComparator() {
  bindResponseComparatorEvents();
}

document.addEventListener("DOMContentLoaded", initializeResponseComparator);
