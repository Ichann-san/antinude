// --- Config ---
const API_ENDPOINT = "https://antinsfw-agf0habfesauhgah.southeastasia-01.azurewebsites.net/predict";
const API_KEY = "";  // Set your API key here (must match ANTINUDE_API_KEY on server)
const ALARM_NAME = "nsfw-scan";
const SCAN_INTERVAL_MINUTES = 0.1;  // ~6 seconds (minimum chrome.alarms supports)
const JPEG_QUALITY = 50;
const MAX_CONSECUTIVE_ERRORS = 5;

let errorCount = 0;

// --- Capture and Analyze ---
async function captureAndAnalyze() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Skip internal Chrome pages
        if (!activeTab || activeTab.url.startsWith("chrome://")) return;

        // Capture visible tab as JPEG
        const dataUrl = await chrome.tabs.captureVisibleTab(
            activeTab.windowId,
            { format: "jpeg", quality: JPEG_QUALITY }
        );
        const base64Image = dataUrl.split(",")[1];

        // Build request headers
        const headers = { "Content-Type": "application/json" };
        if (API_KEY) headers["X-API-Key"] = API_KEY;

        // Send to backend
        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers,
            body: JSON.stringify({ image_base64: base64Image }),
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        errorCount = 0;  // Reset on success

        if (result.status === "nsfw") {
            console.warn("[Antinude] NSFW detected — sending blur signal");
            chrome.tabs.sendMessage(activeTab.id, { action: "EXECUTE_BLUR" });
        }

    } catch (error) {
        errorCount++;
        console.error(`[Antinude] Detection failed (${errorCount}/${MAX_CONSECUTIVE_ERRORS}):`, error.message);

        // Back off if too many consecutive errors
        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
            console.warn("[Antinude] Too many errors, pausing for 30s...");
            chrome.alarms.clear(ALARM_NAME);
            setTimeout(() => {
                errorCount = 0;
                chrome.alarms.create(ALARM_NAME, { periodInMinutes: SCAN_INTERVAL_MINUTES });
            }, 30000);
        }
    }
}

// --- Alarm-based scheduling (proper MV3 pattern) ---
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        captureAndAnalyze();
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("[Antinude] Service worker started.");
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: SCAN_INTERVAL_MINUTES });
});

// Also start on browser startup
chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: SCAN_INTERVAL_MINUTES });
});