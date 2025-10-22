import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import { ALLOWED_MIME_TYPES } from "../constants/uploads";
import { uploadOne } from "../utils/uploadHelpers";
import { typedStorage } from "../utils/storage";
import FilePreview from "../components/FilePreview";

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

    const companyId = auth?.user?.companyId
    if (!companyId) {
      setError("회사 식별 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);
      const folder = `business-certificates/${companyId}`;
      const onProgress = (p) => setProgress(p?.percent || 0);

      const result = await uploadOne(file, { folder, label: "bizCert", onProgress });
      const objectName = result?.objectName || "";
      if (!objectName) throw new Error("업로드 결과에 objectName이 없습니다.");

      // Persist to company profile and flip server-flag locally to unblock routing
      await updateCompanyInfo({
        bizCertDocGcsObjectName: objectName,
        bizCertDocName: file.name || "document.pdf",
        hasBizCertDoc: true,
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
    <div className="page space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">회사 서류 제출</h1>
      <div className="page-scroll space-y-4">
        <div className="card bg-white border border-gray-100 rounded-xl shadow-sm p-4" style={{ maxWidth: 720 }}>
          <div className="header-row mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">사업자등록증 업로드</h2>
            </div>
          </div>
          <p style={{ color: "#555", marginTop: 0 }}>
            안전한 서비스 이용을 위해 회사 서류를 제출해 주세요. PDF 또는 이미지 파일을 지원합니다.
          </p>
          <form onSubmit={handleUpload}>
            <div className="flex items-center gap-2 mb-3">
              <input
                id="biz-file"
                name="biz-file"
                type="file"
                accept="application/pdf,image/*"
                className="form-input flex-1"
                onChange={onFileChange}
              />
              <button className="form-button rounded-lg h-10" type="submit" disabled={status === "uploading"}>
                {status === "uploading" ? "업로드 중..." : "업로드"}
              </button>
            </div>
            {/* Local preview before upload */}
            <div style={{ marginBottom: 12 }}>
              <FilePreview file={file} />
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
