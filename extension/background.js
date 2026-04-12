// Ganti URL ini nanti dengan URL Ngrok dari Google Colab-mu
const API_ENDPOINT = "https://swivel-egging-slightly.ngrok-free.dev/predict";

// Interval polling (dalam milidetik). 2000ms = 2 detik.
const POLLING_INTERVAL = 2000;

let intervalId = null;

// Fungsi untuk mengambil screenshot dan mengirimnya ke API
async function captureAndAnalyze() {
    try {
        // Ambil ID dari tab yang sedang aktif di window pengguna
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Cek apakah tab valid dan bukan halaman internal Chrome (seperti chrome://)
        if (!activeTab || activeTab.url.startsWith('chrome://')) {
            return;
        }

        // Ambil screenshot dari tab tersebut (Format default: base64 JPEG)
        const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: "jpeg", quality: 50 });
        
        // Hapus header "data:image/jpeg;base64," agar kita hanya mengirim base64 raw-nya saja
        const base64Image = dataUrl.split(',')[1];

        // Kirim HTTP POST Request ke Colab
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_base64: base64Image })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        // Evaluasi hasil prediksi model
        if (result.status === "nsfw") {
            console.warn("NSFW terdeteksi! Mengirim sinyal blur ke content.js");
            // Kirim pesan ke content.js yang ada di tab tersebut
            chrome.tabs.sendMessage(activeTab.id, { action: "EXECUTE_BLUR" });
        } else {
            console.log("Aman.");
        }

    } catch (error) {
        // Error handling biasa terjadi jika API belum nyala atau Ngrok mati
        console.error("Proses deteksi gagal:", error);
    }
}

// Mulai interval saat ekstensi diaktifkan
chrome.runtime.onInstalled.addListener(() => {
    console.log("NSFW Filter Service Worker Started.");
    // Eksekusi fungsi setiap 2 detik
    intervalId = setInterval(captureAndAnalyze, POLLING_INTERVAL);
});