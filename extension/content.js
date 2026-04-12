// Dengarkan pesan dari background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXECUTE_BLUR") {
        applyCensorship();
    }
});

function applyCensorship() {
    // Cek dulu apakah overlay blur sudah pernah dibuat sebelumnya
    // (Biar kita ga numpuk jutaan div kalau terdeteksi berkali-kali)
    if (document.getElementById("nsfw-blur-overlay")) {
        return; 
    }

    // Buat elemen div baru untuk menutupi layar
    const overlay = document.createElement("div");
    overlay.id = "nsfw-blur-overlay";

    // Styling CSS untuk efek blur total di satu layar
    Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.8)", // Gelap transparan
        backdropFilter: "blur(50px)",          // Efek blur kuat
        zIndex: "2147483647",                  // Z-index paling maksimal agar menutupi segalanya
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontFamily: "sans-serif",
        pointerEvents: "all"                   // Blokir klik pengguna ke website aslinya
    });

    // Tambahkan teks peringatan di tengah layar
    overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px;">⚠️ KONTEN DIBLOKIR</h1>
        <p style="font-size: 1.5rem;">Sistem mendeteksi adanya indikasi konten NSFW.</p>
    `;

    // Pasang elemen ini ke dalam Body HTML website
    document.body.appendChild(overlay);
}