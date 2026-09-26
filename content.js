(function () {
    "use strict";

    const BUTTON_ID = "hcmute-custom-download-btn";
    const STYLE_ID = "hcmute-download-style";

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            #${BUTTON_ID} {
                width: 50px;
                height: 50px;
                padding: 0;
                border: 2px solid #d6d6d6;
                border-radius: 15px;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: fixed;
                top: 25px;
                right: 25px;
                z-index: 2147483647;
                cursor: pointer;
                box-shadow: 0 4px 15px rgb(0 0 0 / 20%);
                transition: background-color .3s, transform .3s;
            }
            #${BUTTON_ID}:hover { background: #333; transform: scale(1.05); }
            #${BUTTON_ID}:disabled { cursor: wait; }
            #${BUTTON_ID} .download-arrow { fill: #464646; }
            #${BUTTON_ID} .download-tray {
                width: 18px;
                height: 5px;
                border: 0 solid #464646;
                border-width: 0 2px 2px;
            }
            #${BUTTON_ID}:hover .download-arrow {
                fill: #fff;
                animation: hcmute-download-arrow 1s linear infinite;
            }
            #${BUTTON_ID}:hover .download-tray { border-color: #fff; }
            #${BUTTON_ID}[data-state="loading"] { background: #ff9800; }
            #${BUTTON_ID}[data-state="success"] { background: #4caf50; }
            #${BUTTON_ID}[data-state="error"] { background: #f44336; }
            #${BUTTON_ID}[data-state] .download-arrow { fill: #fff; }
            #${BUTTON_ID}[data-state] .download-tray { border-color: #fff; }
            @keyframes hcmute-download-arrow {
                from { transform: translateY(-8px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function setState(button, state, title) {
        if (state) button.dataset.state = state;
        else delete button.dataset.state;
        button.title = title;
        button.setAttribute("aria-label", title);
    }

    function requestDownload() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: "downloadPdf" }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!response?.ok) {
                    reject(new Error(response?.error || "Không thể tải file PDF"));
                } else {
                    resolve(response);
                }
            });
        });
    }

    function createButton() {
        ensureStyles();

        const button = document.createElement("button");
        button.id = BUTTON_ID;
        button.type = "button";
        setState(button, "", "Tải xuống PDF bản gốc");
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512" class="download-arrow" aria-hidden="true">
                <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
            </svg>
            <span class="download-tray"></span>
        `;

        button.addEventListener("click", async () => {
            button.disabled = true;
            setState(button, "loading", "Đang chuẩn bị file PDF...");

            try {
                await requestDownload();
                setState(button, "success", "Đã bắt đầu tải file PDF");
            } catch (error) {
                console.error("HCMUTE Downloader:", error);
                setState(button, "error", error.message || "Không thể tải file PDF");
            } finally {
                setTimeout(() => {
                    button.disabled = false;
                    setState(button, "", "Tải xuống PDF bản gốc");
                }, 2000);
            }
        });

        return button;
    }

    (document.body || document.documentElement).appendChild(createButton());
}());
