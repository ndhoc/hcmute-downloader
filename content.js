(function() {
    function extractDocInfo() {
        let id = null;
        let hash = null;
        let t1 = null;

        try {
            const currentUrl = new URL(window.location.href);
            id = currentUrl.searchParams.get("id");
            hash = currentUrl.searchParams.get("hash");
            t1 = currentUrl.searchParams.get("t1");
        } catch (e) {}

        if (!id || !hash) {
            const pathMatch = window.location.pathname.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i);
            if (pathMatch) {
                id = id || pathMatch[1];
                hash = hash || pathMatch[2];
            }
        }

        if (!id || !hash) {
            const frames = document.querySelectorAll('iframe, embed');
            for (let el of frames) {
                const src = el.getAttribute('src') || el.src || '';
                if (!src) continue;
                
                const framePathMatch = src.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i);
                if (framePathMatch) {
                    id = id || framePathMatch[1];
                    hash = hash || framePathMatch[2];
                    break;
                }

                const frameQueryMatch = src.match(/[?&]id=(\d+)[^"']*?[?&]hash=([a-fA-F0-9]+)/i);
                if (frameQueryMatch) {
                    id = id || frameQueryMatch[1];
                    hash = hash || frameQueryMatch[2];
                    break;
                }
            }
        }

        if (!id || !hash) {
            const actionElements = document.querySelectorAll('a[onclick*="hash"], button[onclick*="hash"], div[onclick*="hash"], a[href*="hash"]');
            for (let el of actionElements) {
                const content = (el.getAttribute('onclick') || '') + ' ' + (el.getAttribute('href') || '');
                const m = content.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i) || content.match(/[?&]id=(\d+)[^"']*?[?&]hash=([a-fA-F0-9]+)/i);
                if (m) {
                    id = id || m[1];
                    hash = hash || m[2];
                    break;
                }
            }
        }

        if (!id || !hash) {
            const html = document.documentElement ? document.documentElement.innerHTML : '';
            const htmlMatch = html.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]{32})/i) || html.match(/id[\/=:\"']+(\d+)[\/=&\"'\s]+hash[\/=:\"']+([a-fA-F0-9]{32})/i);
            if (htmlMatch) {
                id = id || htmlMatch[1];
                hash = hash || htmlMatch[2];
            }
        }

        if (!t1) {
            t1 = Math.floor(Date.now() / 1000).toString();
        }

        if (id && hash) {
            return { id, hash, t1 };
        }
        return null;
    }

    function initDownloader() {
        if (document.getElementById('hcmute-custom-download-btn')) return;

        const info = extractDocInfo();
        if (!info) return;

        const { id, hash, t1 } = info;

        if (!document.getElementById('hcmute-download-style')) {
            const style = document.createElement('style');
            style.id = 'hcmute-download-style';
            style.innerHTML = `
                .hcmute-download-btn {
                    width: 50px;
                    height: 50px;
                    border: 2px solid rgb(214, 214, 214);
                    border-radius: 15px;
                    background-color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    position: fixed;
                    top: 25px;
                    right: 25px;
                    z-index: 2147483647;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }
                .hcmute-download-btn .svgIcon {
                    fill: rgb(70, 70, 70);
                    transition: fill 0.3s ease;
                }
                .hcmute-download-btn .icon2 {
                    width: 18px;
                    height: 5px;
                    border-bottom: 2px solid rgb(70, 70, 70);
                    border-left: 2px solid rgb(70, 70, 70);
                    border-right: 2px solid rgb(70, 70, 70);
                    transition: border-color 0.3s ease;
                }
                .hcmute-download-btn:hover {
                    background-color: rgb(51, 51, 51);
                    transform: scale(1.05);
                }
                .hcmute-download-btn:hover .icon2 {
                    border-color: rgb(235, 235, 235);
                }
                .hcmute-download-btn:hover .svgIcon {
                    fill: rgb(255, 255, 255);
                    animation: slide-in-top 1s linear infinite;
                }
                @keyframes slide-in-top {
                    0% { transform: translateY(-8px); opacity: 0; }
                    100% { transform: translateY(0px); opacity: 1; }
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const downloadBtn = document.createElement("button");
        downloadBtn.id = "hcmute-custom-download-btn";
        downloadBtn.className = "hcmute-download-btn";
        downloadBtn.title = "Tải xuống PDF bản gốc";
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512" class="svgIcon">
                <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
            </svg>
            <span class="icon2"></span>
        `;
        (document.body || document.documentElement).appendChild(downloadBtn);

        downloadBtn.onclick = async function() {
            try {
                downloadBtn.style.backgroundColor = "#FF9800";
                downloadBtn.style.pointerEvents = "none";
                const svgIcon = downloadBtn.querySelector('.svgIcon');
                const icon2 = downloadBtn.querySelector('.icon2');
                if (svgIcon) svgIcon.style.fill = "white";
                if (icon2) icon2.style.borderColor = "white";

                const currentT1 = Math.floor(Date.now() / 1000);
                const currentApiUrl = `https://thuvienso.hcmute.edu.vn/doc/loadpdf2?id=${id}&t1=${currentT1}&hash=${hash}`;

                const response = await fetch(currentApiUrl, {
                    method: 'GET',
                    headers: { "APP_KEY": hash }
                });

                if (!response.ok) throw new Error("Máy chủ từ chối phản hồi");
                const rawText = await response.text();

                let base64Text = rawText.replace(/['"]+/g, '').trim();
                if (base64Text.includes("base64,")) {
                    base64Text = base64Text.split("base64,")[1];
                }
                base64Text = base64Text.replace(/[^A-Za-z0-9+/=_]/g, "");

                while (base64Text.length % 4 !== 0) {
                    base64Text += '=';
                }

                const byteCharacters = atob(base64Text);
                const byteNumbers = new Uint8Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }

                const blob = new Blob([byteNumbers], { type: 'application/pdf' });
                if (blob.size < 1000) throw new Error("File PDF rỗng hoặc không hợp lệ");

                let downloadFileName = `${id}.pdf`;
                const slugMatch = window.location.pathname.match(/\/doc\/([^/]+)-(\d+)\.html/);
                if (slugMatch && slugMatch[1]) {
                    downloadFileName = `${slugMatch[1]}.pdf`;
                } else if (document.title && document.title.length > 3 && !document.title.includes('HCMUTE')) {
                    downloadFileName = `${document.title.trim().replace(/[/\\?%*:|"<>]/g, '_')}_${id}.pdf`;
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = downloadFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                downloadBtn.style.backgroundColor = "#4CAF50";

            } catch (error) {
                console.error("HCMUTE Downloader Error:", error);
                downloadBtn.style.backgroundColor = "#F44336";
            } finally {
                setTimeout(() => {
                    downloadBtn.style.pointerEvents = "auto";
                    downloadBtn.style.backgroundColor = "";
                    const svgIcon = downloadBtn.querySelector('.svgIcon');
                    const icon2 = downloadBtn.querySelector('.icon2');
                    if (svgIcon) svgIcon.style.fill = "";
                    if (icon2) icon2.style.borderColor = "";
                }, 2000);
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDownloader);
    } else {
        initDownloader();
    }

    const observer = new MutationObserver(() => {
        if (!document.getElementById('hcmute-custom-download-btn')) {
            initDownloader();
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
