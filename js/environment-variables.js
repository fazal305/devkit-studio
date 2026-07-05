const environmentNameInput = document.getElementById("environmentNameInput");
const activeEnvironmentSelect = document.getElementById("activeEnvironmentSelect");
const environmentVariablesEditor = document.getElementById("environmentVariablesEditor");
const environmentsListOutput = document.getElementById("environmentsListOutput");
const environmentStats = document.getElementById("environmentStats");

const environmentsKey = "devkitStudio.environments";
const activeEnvironmentKey = "devkitStudio.activeEnvironmentId";

/**
 * Creates a new environment by name.
 */
function createEnvironment(name) {
    const cleanName = name.trim();

    if (!cleanName) {
        showStatus("Enter an environment name first.", "warning");
        return;
    }

    const environments = loadStorageData(environmentsKey, []);
    const environment = {
        id: crypto.randomUUID(),
        name: cleanName,
        variables: [
            { key: "baseUrl", value: "https://jsonplaceholder.typicode.com" },
            { key: "contentType", value: "application/json" }
        ],
        createdAt: new Date().toISOString()
    };

    environments.unshift(environment);
    saveStorageData(environmentsKey, environments);
    setActiveEnvironment(environment.id);
    environmentNameInput.value = "";
    showStatus(`Environment "${cleanName}" created.`, "success");
}

/**
 * Renders environments, active selector, and variable rows.
 */
function renderEnvironments() {
    const environments = loadStorageData(environmentsKey, []);
    const activeId = loadStorageData(activeEnvironmentKey, null);
    const activeEnvironment = environments.find((environment) => environment.id === activeId);

    environmentStats.innerHTML = createStatPill("Environments", environments.length);

    activeEnvironmentSelect.innerHTML = [
        `<option value="">No active environment</option>`,
        ...environments.map((environment) => `<option value="${escapeHtml(environment.id)}">${escapeHtml(environment.name)}</option>`)
    ].join("");

    activeEnvironmentSelect.value = activeId || "";

    if (!environments.length) {
        environmentsListOutput.innerHTML = renderEmptyState("Create an environment to store variables.");
        environmentVariablesEditor.innerHTML = renderEmptyState("No active environment selected.");
        return;
    }

    environmentsListOutput.innerHTML = environments.map((environment) => `
    <article class="collection-item">
      <h4>${escapeHtml(environment.name)}</h4>
      <p class="item-meta">${escapeHtml(environment.variables.length)} variables | ${environment.id === activeId ? "active" : "inactive"}</p>
      <div class="item-actions">
        <button class="btn btn-sm ${environment.id === activeId ? "btn-cyber" : "btn-ghost"}" type="button" data-set-environment="${escapeHtml(environment.id)}">Set Active</button>
      </div>
    </article>
  `).join("");

    renderEnvironmentVariableRows(activeEnvironment);
}

/**
 * Sets the active environment ID.
 */
function setActiveEnvironment(id) {
    saveStorageData(activeEnvironmentKey, id || null);
    renderEnvironments();
}

/**
 * Renders variable editor rows for the active environment.
 */
function renderEnvironmentVariableRows(environment) {
    if (!environment) {
        environmentVariablesEditor.innerHTML = renderEmptyState("No active environment selected.");
        return;
    }

    environmentVariablesEditor.innerHTML = environment.variables.map((variable, index) => `
    <div class="row-editor">
      <input class="form-control" data-env-key type="text" placeholder="Key" value="${escapeHtml(variable.key)}">
      <input class="form-control" data-env-value type="text" placeholder="Value" value="${escapeHtml(variable.value)}">
      <button class="btn btn-sm btn-ghost" type="button" data-remove-variable="${index}">Remove</button>
    </div>
  `).join("");
}

/**
 * Adds a variable row to the active environment editor.
 */
function addEnvironmentVariable() {
    const activeId = loadStorageData(activeEnvironmentKey, null);

    if (!activeId) {
        showStatus("Create or select an environment first.", "warning");
        return;
    }

    const row = document.createElement("div");
    row.className = "row-editor";
    row.innerHTML = `
    <input class="form-control" data-env-key type="text" placeholder="Key">
    <input class="form-control" data-env-value type="text" placeholder="Value">
    <button class="btn btn-sm btn-ghost" type="button" data-remove-variable>Remove</button>
  `;

    environmentVariablesEditor.appendChild(row);
}

/**
 * Removes a variable row from the editor.
 */
function removeEnvironmentVariable(index) {
    const rows = environmentVariablesEditor.querySelectorAll(".row-editor");

    if (rows[index]) {
        rows[index].remove();
    }
}

/**
 * Saves variable editor rows into the active environment.
 */
function saveEnvironmentVariables() {
    const activeId = loadStorageData(activeEnvironmentKey, null);
    const environments = loadStorageData(environmentsKey, []);
    const activeEnvironment = environments.find((environment) => environment.id === activeId);

    if (!activeEnvironment) {
        showStatus("No active environment selected.", "warning");
        return;
    }

    activeEnvironment.variables = Array.from(environmentVariablesEditor.querySelectorAll(".row-editor"))
        .map((row) => ({
            key: row.querySelector("[data-env-key]").value.trim(),
            value: row.querySelector("[data-env-value]").value.trim()
        }))
        .filter((variable) => variable.key);

    saveStorageData(environmentsKey, environments);
    renderEnvironments();
    showStatus("Environment variables saved.", "success");
}

/**
 * Deletes an environment by ID.
 */
function deleteEnvironment(id) {
    const activeId = id || loadStorageData(activeEnvironmentKey, null);

    if (!activeId) {
        showStatus("No environment selected.", "warning");
        return;
    }

    const environments = loadStorageData(environmentsKey, []).filter((environment) => environment.id !== activeId);
    saveStorageData(environmentsKey, environments);
    saveStorageData(activeEnvironmentKey, environments[0]?.id || null);
    renderEnvironments();
    showStatus("Environment deleted.", "success");
}

/**
 * Exports environments as JSON.
 */
function exportEnvironments() {
    const environments = loadStorageData(environmentsKey, []);
    downloadText("devkit-environments.json", formatJson(environments), "application/json");
}

/**
 * Binds Environment Variables UI events.
 */
function bindEnvironmentEvents() {
    document.getElementById("createEnvironmentBtn").addEventListener("click", () => createEnvironment(environmentNameInput.value));
    document.getElementById("addVariableBtn").addEventListener("click", addEnvironmentVariable);
    document.getElementById("saveEnvironmentBtn").addEventListener("click", saveEnvironmentVariables);
    document.getElementById("deleteEnvironmentBtn").addEventListener("click", () => deleteEnvironment());
    document.getElementById("exportEnvironmentsBtn").addEventListener("click", exportEnvironments);

    activeEnvironmentSelect.addEventListener("change", () => setActiveEnvironment(activeEnvironmentSelect.value));

    environmentsListOutput.addEventListener("click", (event) => {
        const button = event.target.closest("[data-set-environment]");

        if (button) {
            setActiveEnvironment(button.dataset.setEnvironment);
        }
    });

    environmentVariablesEditor.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-variable]");

        if (button) {
            button.closest(".row-editor").remove();
        }
    });
}

/**
 * Initializes the Environment Variables page.
 */
function initializeEnvironmentVariables() {
    bindEnvironmentEvents();
    renderEnvironments();
}

document.addEventListener("DOMContentLoaded", initializeEnvironmentVariables);