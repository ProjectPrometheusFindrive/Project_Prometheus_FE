import React, { useState } from "react";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import DocumentViewer from "./DocumentViewer";

// items: Array<{ name: string, objectName?: string, url?: string }>
export default function MultiDocGallery({ title = "문서", items = [] }) {
  const [viewer, setViewer] = useState({ open: false, src: "", name: "" });
  const openItem = async (it) => {
    try {
      let src = it.url || "";
      if (!src && it.objectName) {
        src = await getSignedDownloadUrl(it.objectName);
      }
      if (!src) return;
      setViewer({ open: true, src, name: it.name || "document" });
    } catch (e) {
      console.error("Failed to open document", e);
      alert("문서를 열 수 없습니다.");
    }
  };
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="multi-doc-gallery mt-2">
      {title && <div className="asset-doc__title mb-1.5">{title}</div>}
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-2">
        {items.map((it, idx) => (
          <div key={(it.objectName || it.url || it.name || idx) + idx} className="doc-card border rounded-lg p-2.5 flex flex-col gap-1.5 border-[#eee]">
            <div className="text-[13px] text-gray-800 break-words">{it.name || `문서 ${idx + 1}`}</div>
            <div className="flex gap-1.5">
              <button type="button" className="form-button" onClick={() => openItem(it)}>보기</button>
              {(it.url || it.objectName) && (
                <button
                  type="button"
                  className="form-button form-button--muted"
                  onClick={async () => {
                    try {
                      const link = document.createElement("a");
                      const href = it.url ? it.url : await getSignedDownloadUrl(it.objectName);
                      link.href = href;
                      link.download = it.name || "document";
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (e) {
                      console.error("download failed", e);
                      alert("다운로드에 실패했습니다.");
                    }
                  }}
                >
                  다운로드
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <DocumentViewer isOpen={viewer.open} onClose={() => setViewer({ open: false, src: "", name: "" })} src={viewer.src} title={viewer.name} downloadName={viewer.name} />
    </div>
  );
}
