const mockTypeSelect = document.getElementById("mockTypeSelect");
const mockOutput = document.getElementById("mockOutput");

/**
 * Generates a mock response for the selected template type.
 */
function generateMockResponse(type) {
    const now = new Date().toISOString();

    const templates = {
        success: {
            success: true,
            status: 200,
            message: "Request completed successfully.",
            data: {
                id: "REQ-305",
                processedAt: now,
                user: {
                    id: 305,
                    name: "Fazal Developer"
                }
            }
        },
        error: {
            success: false,
            status: 422,
            error: {
                code: "VALIDATION_ERROR",
                message: "The request payload contains invalid fields.",
                fields: [
                    { name: "email", issue: "Email format is invalid." },
                    { name: "quantity", issue: "Quantity must be greater than zero." }
                ]
            },
            traceId: crypto.randomUUID()
        },
        paginated: {
            success: true,
            page: 1,
            pageSize: 3,
            total: 27,
            totalPages: 9,
            data: [
                { id: "ORD-9001", status: "paid", total: 129.99 },
                { id: "ORD-9002", status: "processing", total: 89.5 },
                { id: "ORD-9003", status: "shipped", total: 249.0 }
            ]
        },
        auth: {
            success: true,
            tokenType: "Bearer",
            accessToken: "mock_access_token_305",
            expiresIn: 3600,
            user: {
                id: 305,
                name: "Fazal Developer",
                roles: ["admin", "developer"]
            }
        },
        product: {
            success: true,
            data: {
                id: "PRD-1001",
                name: "Neon Mechanical Keyboard",
                category: "Developer Gear",
                price: 129.99,
                currency: "USD",
                inStock: true,
                inventory: 42,
                tags: ["keyboard", "rgb", "productivity"],
                variants: [
                    { color: "black", layout: "US" },
                    { color: "white", layout: "UK" }
                ]
            }
        }
    };

    return templates[type] || templates.success;
}

/**
 * Renders a mock response in the editable output textarea.
 */
function renderMockResponse(mock) {
    mockOutput.value = formatJson(mock);
    showStatus("Mock response generated.", "success");
}

/**
 * Copies the mock output JSON.
 */
function copyMockResponse() {
    copyText(mockOutput.value, "Mock JSON copied.");
}

/**
 * Downloads the mock output JSON.
 */
function downloadMockResponse() {
    downloadText("devkit-mock-response.json", mockOutput.value, "application/json");
}

/**
 * Binds Mock Response Generator UI events.
 */
function bindMockGeneratorEvents() {
    document.getElementById("generateMockBtn").addEventListener("click", () => {
        renderMockResponse(generateMockResponse(mockTypeSelect.value));
    });

    document.getElementById("copyMockBtn").addEventListener("click", copyMockResponse);
    document.getElementById("downloadMockBtn").addEventListener("click", downloadMockResponse);
}

/**
 * Initializes the Mock Response Generator page.
 */
function initializeMockGenerator() {
    bindMockGeneratorEvents();
    renderMockResponse(generateMockResponse(mockTypeSelect.value));
}

document.addEventListener("DOMContentLoaded", initializeMockGenerator);