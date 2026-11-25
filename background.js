const PAGE_HOSTS = new Set([
    "thuvienso.hcmute.edu.vn",
    "thuvienso-hcmute.dlib.vn"
]);

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

    return { fileName: `${safeName}.pdf` };
}

function parsePdfUrl(pdfUrl) {
    let url;
    try {
        url = new URL(pdfUrl);
    } catch {
        throw new Error("Đường dẫn PDF không hợp lệ");
    }

    if (url.protocol !== "https:"
        || url.hostname !== PDF_HOST
        || !url.pathname.toLowerCase().endsWith(".pdf")) {
        throw new Error("Đường dẫn PDF không hợp lệ");
    }

    return url;
}

async function downloadPdf(pageUrl, pdfUrl) {
    const { fileName } = getDocumentInfo(pageUrl);
    const target = parsePdfUrl(pdfUrl);

    const downloadId = await chrome.downloads.download({
        url: target.href,
        filename: fileName,
        conflictAction: "uniquify",
        saveAs: false
    });

    if (!Number.isInteger(downloadId)) {
        throw new Error("Trình duyệt không thể bắt đầu tải file");
    }

    return { downloadId, fileName };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "downloadPdf") return false;

    if (typeof message.pdfUrl !== "string") {
        sendResponse({ ok: false, error: "Không tìm thấy đường dẫn PDF" });
        return false;
    }

    downloadPdf(sender.url, message.pdfUrl)
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
