import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import { ALLOWED_MIME_TYPES, chooseUploadMode } from "../constants/uploads";
import { uploadViaSignedPut, uploadResumable } from "../utils/uploads";
import { typedStorage } from "../utils/storage";

export default function OnboardingDocs() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { companyInfo, updateCompanyInfo } = useCompany();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const hasBizCertDoc = useMemo(() => {
    if (!companyInfo) return false;
    if (Object.prototype.hasOwnProperty.call(companyInfo, "hasBizCertDoc")) {
      return !!companyInfo.hasBizCertDoc;
    }
    if (companyInfo.bizCertDocGcsObjectName) return true;
    if (Array.isArray(companyInfo.bizCertDocGcsObjectNames) && companyInfo.bizCertDocGcsObjectNames.length > 0) return true;
    return false;
  }, [companyInfo]);

  useEffect(() => {
    if (auth.isAuthenticated && hasBizCertDoc) {
      // If docs already present, go to dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [auth.isAuthenticated, hasBizCertDoc, navigate]);

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("파일을 선택해 주세요.");
      return;
    }
    if (file.type && !(file.type === "application/pdf" || String(file.type).startsWith("image/"))) {
      setError("허용되지 않는 파일 형식입니다. (PDF/이미지)");
      return;
    }

    const companyId = auth?.user?.company || companyInfo?.company || companyInfo?.name;
    if (!companyId) {
      setError("회사 식별 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);
      const folder = `business-certificates/${encodeURIComponent(companyId)}`;
      const mode = chooseUploadMode(file.size || 0);
      const onProgress = (p) => setProgress(p?.percent || 0);

      let result;
      if (mode === "signed-put") {
        const { promise } = uploadViaSignedPut(file, { folder, onProgress });
        result = await promise;
      } else {
        const { promise } = uploadResumable(file, { folder, onProgress });
        result = await promise;
      }

      const objectName = result?.objectName || "";
      if (!objectName) throw new Error("업로드 결과에 objectName이 없습니다.");

      // Persist to company profile
      updateCompanyInfo({
        bizCertDocGcsObjectName: objectName,
        bizCertDocName: file.name || "document.pdf",
      });

      try { typedStorage.flags.clearNeedsCompanyDocs(); } catch {}

      setStatus("success");
      // Navigate to dashboard after a short delay
      setTimeout(() => navigate("/dashboard", { replace: true }), 600);
    } catch (err) {
      console.error("[onboarding] upload error", err);
      setError(err?.message || "업로드 중 오류가 발생했습니다.");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <h1>회사 서류 제출</h1>
      <div className="page-scroll">
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="header-row" style={{ marginBottom: 10 }}>
            <div>
              <h2>사업자등록증 업로드</h2>
            </div>
          </div>
          <p style={{ color: "#555", marginTop: 0 }}>
            안전한 서비스 이용을 위해 회사 서류를 제출해 주세요. PDF 또는 이미지 파일을 지원합니다.
          </p>
          <form onSubmit={handleUpload}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <input
                id="biz-file"
                name="biz-file"
                type="file"
                accept="application/pdf,image/*"
                className="form-input"
                onChange={onFileChange}
                style={{ flex: 1 }}
              />
              <button className="form-button" type="submit" disabled={status === "uploading"}>
                {status === "uploading" ? "업로드 중..." : "업로드"}
              </button>
            </div>
            {status === "uploading" && (
              <div style={{ color: "#177245", fontSize: 13 }}>진행률: {progress}%</div>
            )}
            {error && <div className="error-message" style={{ marginTop: 8 }}>{error}</div>}
            {status === "success" && (
              <div className="success-message" style={{ marginTop: 8, color: "#177245" }}>
                업로드가 완료되었습니다. 대시보드로 이동합니다.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
