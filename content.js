if (window.top === window.self) {
    window.onload = function() {
        initDownloader();
    };
}

function initDownloader() {
    let targetUrl = window.location.href;
    let iframe = document.querySelector('iframe');
    
    if (iframe && iframe.src && iframe.src.includes('hash=')) {
        targetUrl = iframe.src;
    }

    if (!targetUrl.includes('hash=')) return; 

    let url = new URL(targetUrl);
    let id = url.searchParams.get("id");
    let t1 = url.searchParams.get("t1");
    let hash = url.searchParams.get("hash");

    if (!id || !t1 || !hash) return;

    let apiUrl = `https://thuvienso.hcmute.edu.vn/doc/loadpdf2?id=${id}&t1=${t1}&hash=${hash}`;

    let style = document.createElement('style');
    style.innerHTML = `
        .hcmute-download-btn { width: 50px; height: 50px; border: 2px solid rgb(214, 214, 214); border-radius: 15px; background-color: rgb(255, 255, 255); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; position: fixed; top: 25px; right: 25px; z-index: 9999999; transition-duration: 0.3s; box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.11); }
        .hcmute-download-btn .svgIcon { fill: rgb(70, 70, 70); }
        .hcmute-download-btn .icon2 { width: 18px; height: 5px; border-bottom: 2px solid rgb(70, 70, 70); border-left: 2px solid rgb(70, 70, 70); border-right: 2px solid rgb(70, 70, 70); }
        .hcmute-download-btn:hover { background-color: rgb(51, 51, 51); transition-duration: 0.3s; }
        .hcmute-download-btn:hover .icon2 { border-color: rgb(235, 235, 235); }
        .hcmute-download-btn:hover .svgIcon { fill: rgb(255, 255, 255); animation: slide-in-top 1s linear infinite; }
        @keyframes slide-in-top { 0% { transform: translateY(-10px); opacity: 0; } 100% { transform: translateY(0px); opacity: 1; } }
    `;
    document.head.appendChild(style);

    let downloadBtn = document.createElement("button");
    downloadBtn.className = "hcmute-download-btn";
    downloadBtn.title = "Tải xuống nhanh"; 
    downloadBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 384 512" class="svgIcon">
        <path d="M169.4 470.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 370.8 224 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 306.7L54.6 265.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"></path>
      </svg>
      <span class="icon2"></span>
    `;
    document.body.appendChild(downloadBtn);

    downloadBtn.onclick = async function() {
        try {
            downloadBtn.style.backgroundColor = "#FF9800";
            downloadBtn.style.pointerEvents = "none";
            downloadBtn.querySelector('.svgIcon').style.fill = "white";
            downloadBtn.querySelector('.icon2').style.borderColor = "white";

            let response = await fetch(apiUrl, {
                method: 'GET',
                headers: { "APP_KEY": hash }
            });

            if (!response.ok) throw new Error("Máy chủ từ chối");
            let rawText = await response.text();

            let base64Text = rawText.replace(/['"]+/g, '').trim();
            if (base64Text.includes("base64,")) {
                base64Text = base64Text.split("base64,")[1];
            }
            base64Text = base64Text.replace(/[^A-Za-z0-9+\/=_]/g, "");

            let pdfResponse = await fetch("data:application/pdf;base64," + base64Text);
            let blob = await pdfResponse.blob();

            if (blob.size < 1000) throw new Error("File quá nhỏ");

            let downloadUrl = window.URL.createObjectURL(blob);
            let a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `${id}.pdf`; 
            document.body.appendChild(a);
            a.click();
            
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            downloadBtn.style.backgroundColor = "#4CAF50";

        } catch (error) {
            console.error("Lỗi:", error);
            downloadBtn.style.backgroundColor = "#F44336";
        } finally {
            setTimeout(() => {
                downloadBtn.style.pointerEvents = "auto";
                downloadBtn.style.backgroundColor = ""; 
                downloadBtn.querySelector('.svgIcon').style.fill = ""; 
                downloadBtn.querySelector('.icon2').style.borderColor = ""; 
            }, 2000);
        }
    };
}
