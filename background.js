const DLIB_PAGE_HOSTS = new Set([
    "thuvienso.hcmute.edu.vn",
    "thuvienso-hcmute.dlib.vn"
]);

function getDlibDocument(pageUrl) {
    const url = new URL(pageUrl);

    if (!DLIB_PAGE_HOSTS.has(url.hostname)) {
        throw new Error("Trang tài liệu không thuộc thư viện số HCMUTE");
    }

    if (!/^\/tai-lieu\/.+\.html$/i.test(url.pathname)) {
        throw new Error("Không nhận diện được đường dẫn tài liệu");
    }

    return {
        apiUrl: `https://apiuni.dlib.vn/api/v1/congcong/get-detail-document/${url.pathname}`,
        fileName: `${decodeURIComponent(url.pathname.split("/").pop())
            .replace(/\.html$/i, "")
            .replace(/[\\/:*?"<>|]/g, "_")}.pdf`
    };
}

async function downloadDlibPdf(pageUrl) {
    const documentInfo = getDlibDocument(pageUrl);
    const response = await fetch(documentInfo.apiUrl, {
        method: "GET",
        headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
        throw new Error(`API trả về lỗi HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.status !== 200 || typeof result.pdfFLink !== "string" || !result.pdfFLink) {
        throw new Error("API không trả về đường dẫn file PDF");
    }

    const pdfUrl = new URL(result.pdfFLink);
    if (pdfUrl.protocol !== "https:" || pdfUrl.hostname !== "cdn.dlib.vn" || !/\.pdf(?:$|[?#])/i.test(pdfUrl.href)) {
        throw new Error("Đường dẫn PDF từ API không hợp lệ");
    }

    const downloadId = await chrome.downloads.download({
        url: pdfUrl.href,
        filename: documentInfo.fileName,
        conflictAction: "uniquify",
        saveAs: false
    });

    if (typeof downloadId !== "number") {
        throw new Error("Trình duyệt không thể bắt đầu tải file");
    }

    return { downloadId, fileName: documentInfo.fileName };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "downloadDlibPdf") return false;

    const pageUrl = sender.url || message.pageUrl;
    downloadDlibPdf(pageUrl)
        .then((data) => sendResponse({ ok: true, ...data }))
        .catch((error) => {
            console.error("HCMUTE Downloader:", error);
            sendResponse({ ok: false, error: error.message || "Không thể tải file PDF" });
        });

    return true;
});
