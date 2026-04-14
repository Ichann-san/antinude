let isOverlayActive = false;
let tamperObserver = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXECUTE_BLUR") {
        applyCensorship();
    }
});

function applyCensorship() {
    if (document.getElementById("nsfw-blur-overlay")) return;

    isOverlayActive = true;

    // 1. Overlay Background Blur
    const overlay = document.createElement("div");
    overlay.id = "nsfw-blur-overlay";
    Object.assign(overlay.style, {
        position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(20px)",
        zIndex: "2147483647",
        display: "flex", justifyContent: "center", alignItems: "center",
        fontFamily: "Arial, sans-serif",
        pointerEvents: "all"
    });

    // 2. Kotak Popup Minimalis & Formal
    const popupBox = document.createElement("div");
    Object.assign(popupBox.style, {
        backgroundColor: "#ffffff",
        padding: "30px 40px",
        borderRadius: "8px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        textAlign: "center",
        color: "#333",
        position: "relative",
        maxWidth: "400px"
    });

    // 3. Tombol Close (X)
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕";
    Object.assign(closeBtn.style, {
        position: "absolute", top: "12px", right: "15px",
        background: "none", border: "none",
        fontSize: "20px", cursor: "pointer", color: "#888",
        padding: "0"
    });
    closeBtn.onmouseover = () => closeBtn.style.color = "#333";
    closeBtn.onmouseout = () => closeBtn.style.color = "#888";
    
    // Logika ketika tombol X ditekan secara mandiri oleh user
    closeBtn.onclick = () => {
        isOverlayActive = false; // Matikan status aktif agar observer tidak marah
        overlay.remove();
    };

    // 4. Teks Konten
    const title = document.createElement("h2");
    title.innerText = "Akses Dibatasi";
    Object.assign(title.style, { margin: "0 0 10px 0", fontSize: "1.5rem", color: "#d9534f" });

    const desc = document.createElement("p");
    desc.innerText = "Sistem mendeteksi adanya indikasi konten tidak pantas pada tampilan layar Anda saat ini.";
    Object.assign(desc.style, { margin: "0", fontSize: "1rem", color: "#555", lineHeight: "1.5" });

    // Rangkai elemen
    popupBox.appendChild(closeBtn);
    popupBox.appendChild(title);
    popupBox.appendChild(desc);
    overlay.appendChild(popupBox);
    document.body.appendChild(overlay);

    // 5. Anti-Tampering Mechanism
    setupAntiTampering();
}

function setupAntiTampering() {
    if (tamperObserver) return;

    tamperObserver = new MutationObserver((mutations) => {
        if (!isOverlayActive) return; // Kalau user klik tombol X, biarkan saja

        mutations.forEach((mutation) => {
            // Cek jika user menghapus elemen dari DOM
            mutation.removedNodes.forEach((node) => {
                if (node.id === "nsfw-blur-overlay" || node.contains(document.getElementById("nsfw-blur-overlay"))) {
                    // Reset dan Respawn!
                    tamperObserver.disconnect();
                    tamperObserver = null;
                    isOverlayActive = false;
                    applyCensorship();
                }
            });

            // Cek jika user ngakalin CSS (contoh: diubah jadi display: none atau opacity: 0)
            if (mutation.type === "attributes" && mutation.target.id === "nsfw-blur-overlay") {
                const style = mutation.target.style;
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
                    style.display = "flex";
                    style.visibility = "visible";
                    style.opacity = "1";
                }
            }
        });
    });

    tamperObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
}