(function () {
    "use strict";

    function extractLegacyDocInfo() {
        let id = null;
        let hash = null;

        try {
            const currentUrl = new URL(window.location.href);
            id = currentUrl.searchParams.get("id");
            hash = currentUrl.searchParams.get("hash");
        } catch (error) {
            // Tiếp tục dò thông tin trong nội dung trang.
        }

        if (!id || !hash) {
            const pathMatch = window.location.pathname.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i);
            if (pathMatch) {
                id = id || pathMatch[1];
                hash = hash || pathMatch[2];
            }
        }

        if (!id || !hash) {
            const frames = document.querySelectorAll("iframe, embed");
            for (const element of frames) {
                const src = element.getAttribute("src") || element.src || "";
                const match = src.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i)
                    || src.match(/[?&]id=(\d+)[^"']*?[?&]hash=([a-fA-F0-9]+)/i);
                if (match) {
                    id = id || match[1];
                    hash = hash || match[2];
                    break;
                }
            }
        }

        if (!id || !hash) {
            const elements = document.querySelectorAll(
                'a[onclick*="hash"], button[onclick*="hash"], div[onclick*="hash"], a[href*="hash"]'
            );
            for (const element of elements) {
                const content = `${element.getAttribute("onclick") || ""} ${element.getAttribute("href") || ""}`;
                const match = content.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]+)/i)
                    || content.match(/[?&]id=(\d+)[^"']*?[?&]hash=([a-fA-F0-9]+)/i);
                if (match) {
                    id = id || match[1];
                    hash = hash || match[2];
                    break;
                }
            }
        }

        if (!id || !hash) {
            const html = document.documentElement ? document.documentElement.innerHTML : "";
            const match = html.match(/\/id\/(\d+)\/hash\/([a-fA-F0-9]{32})/i)
                || html.match(/id[\/=:\"']+(\d+)[\/=&\"'\s]+hash[\/=:\"']+([a-fA-F0-9]{32})/i);
            if (match) {
                id = id || match[1];
                hash = hash || match[2];
            }
        }

        return id && hash ? { type: "legacy", id, hash } : null;
    }

    function extractDlibDocInfo() {
        const allowedHosts = new Set([
            "thuvienso.hcmute.edu.vn",
            "thuvienso-hcmute.dlib.vn"
        ]);

        try {
            const url = new URL(window.location.href);
            if (allowedHosts.has(url.hostname) && /^\/tai-lieu\/.+\.html$/i.test(url.pathname)) {
                return { type: "dlib", pageUrl: url.href };
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    function getDocumentInfo() {
        return extractDlibDocInfo() || extractLegacyDocInfo();
    }

    function ensureStyles() {
        if (document.getElementById("hcmute-download-style")) return;

        const style = document.createElement("style");
        style.id = "hcmute-download-style";
        style.textContent = `
            .hcmute-download-btn {
                width: 50px;
                height: 50px;
                border: 2px solid rgb(214, 214, 214);
                border-radius: 15px;
                background-color: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: fixed;
                top: 25px;
                right: 25px;
                z-index: 2147483647;
                transition: all .3s ease;
                box-shadow: 0 4px 15px rgba(0, 0, 0, .2);
            }
            .hcmute-download-btn .svgIcon {
                fill: rgb(70, 70, 70);
                transition: fill .3s ease;
            }
            .hcmute-download-btn .icon2 {
                width: 18px;
                height: 5px;
                border: 0 solid rgb(70, 70, 70);
                border-width: 0 2px 2px;
                transition: border-color .3s ease;
            }
            .hcmute-download-btn:hover {
                background-color: rgb(51, 51, 51);
                transform: scale(1.05);
            }
            .hcmute-download-btn:hover .icon2 { border-color: rgb(235, 235, 235); }
            .hcmute-download-btn:hover .svgIcon {
                fill: #fff;
                animation: hcmute-slide-in-top 1s linear infinite;
            }
            @keyframes hcmute-slide-in-top {
                0% { transform: translateY(-8px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function setButtonState(button, color, title) {
        button.style.backgroundColor = color;
        button.title = title;
        const svgIcon = button.querySelector(".svgIcon");
        const icon2 = button.querySelector(".icon2");
        if (svgIcon) svgIcon.style.fill = color ? "white" : "";
        if (icon2) icon2.style.borderColor = color ? "white" : "";
    }

    function getLegacyFileName(id) {
        const slugMatch = window.location.pathname.match(/\/doc\/([^/]+)-(\d+)\.html/i);
        if (slugMatch && slugMatch[1]) return `${slugMatch[1]}.pdf`;

        if (document.title && document.title.length > 3 && !document.title.includes("HCMUTE")) {
            return `${document.title.trim().replace(/[/\\?%*:|"<>]/g, "_")}_${id}.pdf`;
        }
        return `${id}.pdf`;
    }

    async function downloadLegacyPdf(info) {
        const timestamp = Math.floor(Date.now() / 1000);
        const apiUrl = `https://thuvienso.hcmute.edu.vn/doc/loadpdf2?id=${info.id}&t1=${timestamp}&hash=${info.hash}`;
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: { "APP_KEY": info.hash }
        });

        if (!response.ok) throw new Error(`Máy chủ trả về lỗi HTTP ${response.status}`);

        let base64Text = (await response.text()).replace(/['"]+/g, "").trim();
        if (base64Text.includes("base64,")) base64Text = base64Text.split("base64,")[1];
        base64Text = base64Text.replace(/[^A-Za-z0-9+/=_]/g, "");
        while (base64Text.length % 4 !== 0) base64Text += "=";

        const characters = atob(base64Text);
        const bytes = new Uint8Array(characters.length);
        for (let index = 0; index < characters.length; index += 1) {
            bytes[index] = characters.charCodeAt(index);
        }

        const blob = new Blob([bytes], { type: "application/pdf" });
        if (blob.size < 1000) throw new Error("File PDF rỗng hoặc không hợp lệ");

        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = getLegacyFileName(info.id);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }

    function downloadDlibPdf(info) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type: "downloadDlibPdf", pageUrl: info.pageUrl },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (!response || !response.ok) {
                        reject(new Error(response?.error || "Không thể tải file PDF"));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    function initDownloader() {
        if (document.getElementById("hcmute-custom-download-btn") || !getDocumentInfo()) return;

        ensureStyles();
        const button = document.createElement("button");
        button.id = "hcmute-custom-download-btn";
        button.className = "hcmute-download-btn";
        button.type = "button";
        button.title = "Tải xuống PDF bản gốc";
        button.setAttribute("aria-label", "Tải xuống PDF bản gốc");
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512" class="svgIcon" aria-hidden="true">
                <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
            </svg>
            <span class="icon2"></span>
        `;
        (document.body || document.documentElement).appendChild(button);

        button.addEventListener("click", async () => {
            const info = getDocumentInfo();
            if (!info) return;

            button.disabled = true;
            button.style.pointerEvents = "none";
            setButtonState(button, "#FF9800", "Đang chuẩn bị file PDF...");

            try {
                if (info.type === "dlib") await downloadDlibPdf(info);
                else await downloadLegacyPdf(info);
                setButtonState(button, "#4CAF50", "Đã bắt đầu tải file PDF");
            } catch (error) {
                console.error("HCMUTE Downloader:", error);
                setButtonState(button, "#F44336", error.message || "Không thể tải file PDF");
            } finally {
                setTimeout(() => {
                    button.disabled = false;
                    button.style.pointerEvents = "auto";
                    setButtonState(button, "", "Tải xuống PDF bản gốc");
                }, 2000);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDownloader, { once: true });
    } else {
        initDownloader();
    }

    const observer = new MutationObserver(() => {
        if (!document.getElementById("hcmute-custom-download-btn")) initDownloader();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}());
