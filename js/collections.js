const collectionNameInput = document.getElementById("collectionNameInput");
const collectionsListOutput = document.getElementById("collectionsListOutput");
const collectionRequestsOutput = document.getElementById("collectionRequestsOutput");
const collectionStats = document.getElementById("collectionStats");

const collectionsKey = "devkitStudio.collections";
const requestDraftKey = "devkitStudio.requestDraft";

let activeCollectionId = null;

/**
 * Creates a new collection by name.
 */
function createCollection(name) {
    const cleanName = name.trim();

    if (!cleanName) {
        showStatus("Enter a collection name first.", "warning");
        return;
    }

    const collections = loadStorageData(collectionsKey, []);
    const collection = {
        id: crypto.randomUUID(),
        name: cleanName,
        requests: [],
        createdAt: new Date().toISOString()
    };

    collections.unshift(collection);
    saveStorageData(collectionsKey, collections);
    activeCollectionId = collection.id;
    collectionNameInput.value = "";
    renderCollections();
    showStatus(`Collection "${cleanName}" created.`, "success");
}

/**
 * Renders saved collections.
 */
function renderCollections() {
    const collections = loadStorageData(collectionsKey, []);
    collectionStats.innerHTML = createStatPill("Collections", collections.length);

    if (!collections.length) {
        collectionsListOutput.innerHTML = renderEmptyState("Create a collection to get started.");
        collectionRequestsOutput.innerHTML = renderEmptyState("Saved collection requests will appear here.");
        return;
    }

    if (!activeCollectionId) {
        activeCollectionId = collections[0].id;
    }

    collectionsListOutput.innerHTML = collections.map((collection) => `
    <article class="collection-item">
      <h4>${escapeHtml(collection.name)}</h4>
      <p class="item-meta">${escapeHtml(collection.requests.length)} requests | ${escapeHtml(new Date(collection.createdAt).toLocaleString())}</p>
      <div class="item-actions">
        <button class="btn btn-sm ${collection.id === activeCollectionId ? "btn-cyber" : "btn-ghost"}" type="button" data-select-collection="${escapeHtml(collection.id)}">View Requests</button>
      </div>
    </article>
  `).join("");

    renderCollectionRequests();
}

/**
 * Saves a request to the active collection.
 */
function saveRequestToCollection(request) {
    const collections = loadStorageData(collectionsKey, []);

    if (!collections.length) {
        collections.push({
            id: crypto.randomUUID(),
            name: "Default Collection",
            requests: [],
            createdAt: new Date().toISOString()
        });
    }

    const target = collections.find((collection) => collection.id === activeCollectionId) || collections[0];
    target.requests.unshift(request);
    saveStorageData(collectionsKey, collections);
    activeCollectionId = target.id;
    renderCollections();
}

/**
 * Renders requests for the active collection.
 */
function renderCollectionRequests() {
    const collections = loadStorageData(collectionsKey, []);
    const collection = collections.find((item) => item.id === activeCollectionId);

    if (!collection || !collection.requests.length) {
        collectionRequestsOutput.innerHTML = renderEmptyState("No requests saved in this collection yet.");
        return;
    }

    collectionRequestsOutput.innerHTML = collection.requests.map((request) => `
    <article class="history-item">
      <span class="method-badge ${escapeHtml(request.method.toLowerCase())}">${escapeHtml(request.method)}</span>
      <h4 class="mt-2">${escapeHtml(request.url)}</h4>
      <p class="item-meta">${escapeHtml(new Date(request.createdAt).toLocaleString())}</p>
      <div class="item-actions">
        <button class="btn btn-sm btn-ghost" type="button" data-load-collection-request="${escapeHtml(request.id)}">Load Request</button>
        <button class="btn btn-sm btn-ghost" type="button" data-delete-collection-request="${escapeHtml(request.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

/**
 * Loads a collection request into an API Client draft.
 */
function loadCollectionRequest(id) {
    const collections = loadStorageData(collectionsKey, []);
    const allRequests = collections.flatMap((collection) => collection.requests);
    const request = allRequests.find((item) => item.id === id);

    if (!request) {
        showStatus("Saved request was not found.", "error");
        return;
    }

    saveStorageData(requestDraftKey, {
        method: request.method,
        url: request.url,
        headers: request.headers || [],
        queryParams: request.queryParams || [],
        body: request.body || ""
    });

    showStatus("Request loaded as API Client draft.", "success");
}

/**
 * Deletes a request from the active collection.
 */
function deleteCollectionRequest(id) {
    const collections = loadStorageData(collectionsKey, []);

    collections.forEach((collection) => {
        collection.requests = collection.requests.filter((request) => request.id !== id);
    });

    saveStorageData(collectionsKey, collections);
    renderCollections();
    showStatus("Saved request deleted.", "success");
}

/**
 * Exports all collections as JSON.
 */
function exportCollections() {
    const collections = loadStorageData(collectionsKey, []);
    downloadText("devkit-collections.json", formatJson(collections), "application/json");
}

/**
 * Binds Collections UI events.
 */
function bindCollectionsEvents() {
    document.getElementById("createCollectionBtn").addEventListener("click", () => createCollection(collectionNameInput.value));
    document.getElementById("exportCollectionsBtn").addEventListener("click", exportCollections);

    collectionsListOutput.addEventListener("click", (event) => {
        const button = event.target.closest("[data-select-collection]");

        if (button) {
            activeCollectionId = button.dataset.selectCollection;
            renderCollections();
        }
    });

    collectionRequestsOutput.addEventListener("click", (event) => {
        const loadButton = event.target.closest("[data-load-collection-request]");
        const deleteButton = event.target.closest("[data-delete-collection-request]");

        if (loadButton) {
            loadCollectionRequest(loadButton.dataset.loadCollectionRequest);
        }

        if (deleteButton) {
            deleteCollectionRequest(deleteButton.dataset.deleteCollectionRequest);
        }
    });
}

/**
 * Initializes the Collections page.
 */
function initializeCollections() {
    bindCollectionsEvents();
    renderCollections();
}

document.addEventListener("DOMContentLoaded", initializeCollections);