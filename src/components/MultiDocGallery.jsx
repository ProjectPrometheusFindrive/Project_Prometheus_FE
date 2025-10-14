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
    <div className="multi-doc-gallery" style={{ marginTop: 8 }}>
      {title && <div className="asset-doc__title" style={{ marginBottom: 6 }}>{title}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {items.map((it, idx) => (
          <div key={(it.objectName || it.url || it.name || idx) + idx} className="doc-card" style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#333", wordBreak: "break-all" }}>{it.name || `문서 ${idx + 1}`}</div>
            <div style={{ display: "flex", gap: 6 }}>
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

