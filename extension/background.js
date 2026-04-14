const API_ENDPOINT = "https://antinsfw-agf0habfesauhgah.southeastasia-01.azurewebsites.net/predict";

async function captureAndAnalyze() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || activeTab.url.startsWith('chrome://')) {
            scheduleNextTick(); // Tetap jadwalkan tick berikutnya walau di-skip
            return;
        }

        const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: "jpeg", quality: 50 });
        const base64Image = dataUrl.split(',')[1];

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64Image })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();

        if (result.status === "nsfw") {
            console.warn("NSFW terdeteksi! Mengirim sinyal blur...");
            chrome.tabs.sendMessage(activeTab.id, { action: "EXECUTE_BLUR" });
        } else {
            console.log("Aman.");
        }
    } catch (error) {
        console.error("Proses deteksi gagal:", error);
    }
    
    scheduleNextTick();
}

function scheduleNextTick() {
    // Random antara 500ms sampai 3000ms
    const randomInterval = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
    setTimeout(captureAndAnalyze, randomInterval);
}

chrome.runtime.onInstalled.addListener(() => {
    console.log("NSFW Filter Service Worker Started.");
    scheduleNextTick();
});