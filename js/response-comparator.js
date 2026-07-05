const originalResponseInput = document.getElementById("originalResponseInput");
const updatedResponseInput = document.getElementById("updatedResponseInput");
const diffStats = document.getElementById("diffStats");
const diffResultsOutput = document.getElementById("diffResultsOutput");

let diffResultsState = [];

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

    diffResultsState = compareValues(original.value, updated.value, "$");
    renderDiffResults(diffResultsState);
    showStatus("Response comparison complete.", "success");
}

/**
 * Compares two values recursively.
 */
function compareValues(originalValue, updatedValue, path = "$") {
    const originalType = getValueType(originalValue);
    const updatedType = getValueType(updatedValue);

    if (originalType !== updatedType) {
        return [{
            type: "changed",
            path,
            before: originalValue,
            after: updatedValue,
            message: `Type changed from ${originalType} to ${updatedType}`
        }];
    }

    if (originalType === "object") {
        return compareObjects(originalValue, updatedValue, path);
    }

    if (originalType === "array") {
        return compareArrays(originalValue, updatedValue, path);
    }

    if (originalValue !== updatedValue) {
        return [{ type: "changed", path, before: originalValue, after: updatedValue, message: "Value changed" }];
    }

    return [{ type: "unchanged", path, before: originalValue, after: updatedValue, message: "Unchanged" }];
}

/**
 * Compares two objects recursively.
 */
function compareObjects(originalObj, updatedObj, path = "$") {
    const results = [];
    const keys = new Set([...Object.keys(originalObj), ...Object.keys(updatedObj)]);

    keys.forEach((key) => {
        const nextPath = `${path}.${key}`;

        if (!(key in originalObj)) {
            results.push({ type: "added", path: nextPath, before: undefined, after: updatedObj[key], message: "Field added" });
            return;
        }

        if (!(key in updatedObj)) {
            results.push({ type: "removed", path: nextPath, before: originalObj[key], after: undefined, message: "Field removed" });
            return;
        }

        results.push(...compareValues(originalObj[key], updatedObj[key], nextPath));
    });

    return results;
}

/**
 * Compares two arrays recursively by index.
 */
function compareArrays(originalArray, updatedArray, path = "$") {
    const results = [];
    const maxLength = Math.max(originalArray.length, updatedArray.length);

    for (let index = 0; index < maxLength; index += 1) {
        const nextPath = `${path}[${index}]`;

        if (index >= originalArray.length) {
            results.push({ type: "added", path: nextPath, before: undefined, after: updatedArray[index], message: "Array item added" });
            continue;
        }

        if (index >= updatedArray.length) {
            results.push({ type: "removed", path: nextPath, before: originalArray[index], after: undefined, message: "Array item removed" });
            continue;
        }

        results.push(...compareValues(originalArray[index], updatedArray[index], nextPath));
    }

    return results;
}

/**
 * Renders diff summary stats and result rows.
 */
function renderDiffResults(results) {
    const counts = {
        added: results.filter((item) => item.type === "added").length,
        removed: results.filter((item) => item.type === "removed").length,
        changed: results.filter((item) => item.type === "changed").length,
        unchanged: results.filter((item) => item.type === "unchanged").length
    };

    diffStats.innerHTML = [
        createStatPill("Added", counts.added),
        createStatPill("Removed", counts.removed),
        createStatPill("Changed", counts.changed),
        createStatPill("Unchanged", counts.unchanged)
    ].join("");

    diffResultsOutput.innerHTML = results.map((item) => `
    <article class="diff-row ${escapeHtml(item.type)}">
      <span class="type-badge ${escapeHtml(item.type)}">${escapeHtml(item.type)}</span>
      <h4 class="mt-2">${escapeHtml(item.path)}</h4>
      <p class="item-description">${escapeHtml(item.message)}</p>
      <pre class="code-output">${escapeHtml(formatJson({ before: item.before ?? null, after: item.after ?? null }))}</pre>
    </article>
  `).join("");
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
            unchanged: results.filter((item) => item.type === "unchanged").length
        },
        results
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
            tier: "silver"
        },
        items: [
            { sku: "DK-KEYBOARD", quantity: 1, price: 129.99 }
        ]
    });

    updatedResponseInput.value = formatJson({
        id: 101,
        status: "paid",
        total: 279.99,
        user: {
            name: "Ayesha Khan",
            tier: "gold"
        },
        items: [
            { sku: "DK-KEYBOARD", quantity: 1, price: 119.99 },
            { sku: "DK-MOUSE", quantity: 1, price: 49.99 }
        ],
        coupon: "CYBER20"
    });

    compareResponses();
}

/**
 * Copies the current diff report.
 */
function copyDiffReport() {
    copyText(formatJson(generateDiffReport(diffResultsState)), "Diff report copied.");
}

/**
 * Downloads the current diff report.
 */
function downloadDiffJson() {
    downloadText("devkit-diff-report.json", formatJson(generateDiffReport(diffResultsState)), "application/json");
}

/**
 * Binds Response Comparator UI events.
 */
function bindResponseComparatorEvents() {
    document.getElementById("compareResponsesBtn").addEventListener("click", compareResponses);
    document.getElementById("loadComparisonSampleBtn").addEventListener("click", loadComparisonSample);
    document.getElementById("copyDiffReportBtn").addEventListener("click", copyDiffReport);
    document.getElementById("downloadDiffJsonBtn").addEventListener("click", downloadDiffJson);
}

/**
 * Initializes the Response Comparator page.
 */
function initializeResponseComparator() {
    bindResponseComparatorEvents();
}

document.addEventListener("DOMContentLoaded", initializeResponseComparator);