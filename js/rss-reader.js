const rssInput = document.getElementById("rssInput");
const rssSearchInput = document.getElementById("rssSearchInput");
const rssItemsOutput = document.getElementById("rssItemsOutput");
const rssStats = document.getElementById("rssStats");

let rssItemsState = [];

/**
 * Parses RSS XML input and renders feed items.
 */
function parseRssFeed() {
    const parsed = parseXml(rssInput.value);

    if (!parsed.ok) {
        rssItemsOutput.innerHTML = renderEmptyState(parsed.error.message);
        rssStats.innerHTML = createStatPill("Items", "0");
        showStatus("RSS parsing failed.", "error");
        return;
    }

    rssItemsState = extractRssItems(parsed.value);
    rssStats.innerHTML = createStatPill("Items", rssItemsState.length);
    renderRssItems(rssItemsState);
    showStatus(`Parsed ${rssItemsState.length} RSS items.`, "success");
}

/**
 * Extracts RSS feed item summaries from an XML document.
 */
function extractRssItems(xmlDoc) {
    return Array.from(xmlDoc.querySelectorAll("item")).map((item, index) => ({
        id: index + 1,
        title: item.querySelector("title")?.textContent.trim() || "Untitled",
        link: item.querySelector("link")?.textContent.trim() || "",
        date: item.querySelector("pubDate")?.textContent.trim() || "",
        description: item.querySelector("description")?.textContent.trim() || ""
    }));
}

/**
 * Renders RSS feed item cards.
 */
function renderRssItems(items) {
    if (!items.length) {
        rssItemsOutput.innerHTML = renderEmptyState("No feed items found.");
        return;
    }

    rssItemsOutput.innerHTML = items.map((item) => `
    <article class="feed-item">
      <h4>${escapeHtml(item.title)}</h4>
      <p class="item-meta">${escapeHtml(item.date || "No date")}</p>
      <p class="item-description">${escapeHtml(item.description)}</p>
      ${item.link ? `<div class="item-actions"><a class="btn btn-sm btn-ghost" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Open Link</a></div>` : ""}
    </article>
  `).join("");
}

/**
 * Filters RSS items by title, date, link, or description.
 */
function filterRssItems(term) {
    const normalized = term.toLowerCase().trim();

    if (!normalized) {
        renderRssItems(rssItemsState);
        return;
    }

    const filtered = rssItemsState.filter((item) => {
        return `${item.title} ${item.description} ${item.date} ${item.link}`.toLowerCase().includes(normalized);
    });

    renderRssItems(filtered);
    showStatus(`Showing ${filtered.length} matching feed items.`, "success");
}

/**
 * Loads realistic sample RSS XML.
 */
function loadRssSample() {
    rssInput.value = `<rss version="2.0">
  <channel>
    <title>DevKit Studio Release Feed</title>
    <link>https://example.com/devkit/releases</link>
    <description>Developer platform updates for API, schema, and tooling workflows.</description>
    <item>
      <title>API Client collections shipped</title>
      <link>https://example.com/devkit/releases/api-client-collections</link>
      <pubDate>Sun, 05 Jul 2026 09:30:00 GMT</pubDate>
      <description>Collections, saved requests, and local history are now available in the browser workspace.</description>
    </item>
    <item>
      <title>Schema Builder improves nested array analysis</title>
      <link>https://example.com/devkit/releases/schema-builder-arrays</link>
      <pubDate>Sun, 05 Jul 2026 10:15:00 GMT</pubDate>
      <description>JSON Schema generation now handles products, orders, settings, and mixed nested arrays.</description>
    </item>
    <item>
      <title>Mock Response Generator adds product templates</title>
      <link>https://example.com/devkit/releases/mock-products</link>
      <pubDate>Sun, 05 Jul 2026 11:00:00 GMT</pubDate>
      <description>Generate editable success, error, auth, pagination, and product mock responses.</description>
    </item>
  </channel>
</rss>`;

    parseRssFeed();
}

/**
 * Copies parsed RSS items as JSON.
 */
function copyRssJson() {
    copyText(formatJson(rssItemsState), "Feed JSON copied.");
}

/**
 * Downloads parsed RSS items as JSON.
 */
function downloadRssJson() {
    downloadText("devkit-feed-summary.json", formatJson(rssItemsState), "application/json");
}

/**
 * Binds RSS Reader UI events.
 */
function bindRssReaderEvents() {
    document.getElementById("parseRssBtn").addEventListener("click", parseRssFeed);
    document.getElementById("loadRssSampleBtn").addEventListener("click", loadRssSample);
    document.getElementById("copyRssJsonBtn").addEventListener("click", copyRssJson);
    document.getElementById("downloadRssJsonBtn").addEventListener("click", downloadRssJson);
    rssSearchInput.addEventListener("input", () => filterRssItems(rssSearchInput.value));
}

/**
 * Initializes the RSS Reader page.
 */
function initializeRssReader() {
    bindRssReaderEvents();
}

document.addEventListener("DOMContentLoaded", initializeRssReader);