const PAGE_HOSTS = new Set([
    "thuvienso.hcmute.edu.vn",
    "thuvienso-hcmute.dlib.vn"
]);

const API_BASE_URL = "https://apiuni.dlib.vn/api/v1/congcong/get-detail-document/";
const PDF_HOST = "cdn.dlib.vn";

function getDocumentInfo(pageUrl) {
    const url = new URL(pageUrl);
    if (!PAGE_HOSTS.has(url.hostname) || !/^\/tai-lieu\/.+\.html$/i.test(url.pathname)) {
        throw new Error("Đường dẫn tài liệu không hợp lệ");
    }

    const encodedSlug = url.pathname.split("/").pop().replace(/\.html$/i, "");
    let slug = encodedSlug;
    try {
        slug = decodeURIComponent(encodedSlug);
    } catch {
        // Giữ nguyên slug nếu URL chứa chuỗi phần trăm không hợp lệ.
    }

    const safeName = slug
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/[. ]+$/g, "")
        .slice(0, 180) || "hcmute-document";

    return {
        apiUrl: API_BASE_URL + url.pathname,
        fileName: `${safeName}.pdf`
    };
}

async function downloadPdf(pageUrl) {
    const documentInfo = getDocumentInfo(pageUrl);
    const response = await fetch(documentInfo.apiUrl, {
        headers: { Accept: "application/json" }
    });

    if (!response.ok) {
        throw new Error(`API trả về lỗi HTTP ${response.status}`);
    }

    const result = await response.json();
    if (Number(result.status) !== 200 || typeof result.pdfFLink !== "string") {
        throw new Error("API không trả về đường dẫn PDF");
    }

    const pdfUrl = new URL(result.pdfFLink);
    if (pdfUrl.protocol !== "https:"
        || pdfUrl.hostname !== PDF_HOST
        || !pdfUrl.pathname.toLowerCase().endsWith(".pdf")) {
        throw new Error("Đường dẫn PDF từ API không hợp lệ");
    }

    const downloadId = await chrome.downloads.download({
        url: pdfUrl.href,
        filename: documentInfo.fileName,
        conflictAction: "uniquify",
        saveAs: false
    });

    if (!Number.isInteger(downloadId)) {
        throw new Error("Trình duyệt không thể bắt đầu tải file");
    }

    return { downloadId, fileName: documentInfo.fileName };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "downloadPdf") return false;

    downloadPdf(sender.url)
        .then((data) => sendResponse({ ok: true, ...data }))
        .catch((error) => {
            console.error("HCMUTE Downloader:", error);
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Không thể tải file PDF"
            });
        });

    return true;
});
