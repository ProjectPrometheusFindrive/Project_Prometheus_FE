import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitToast } from "../utils/toast";
import privacyMd from "../data/terms/privacy.md?raw";
import locationMd from "../data/terms/location.md?raw";
import marketingMd from "../data/terms/marketing.md?raw";
import Markdown from "../components/Markdown";

export default function TermsAgreement() {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState({
    privacy: false,
    location: false,
    marketing: false
  });

  const handleAgreementChange = (type) => {
    setAgreements(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSelectAll = () => {
    const allChecked = agreements.privacy && agreements.location && agreements.marketing;
    setAgreements({
      privacy: !allChecked,
      location: !allChecked,
      marketing: !allChecked
    });
  };

  const handleNext = () => {
    if (!agreements.privacy || !agreements.location) {
      emitToast("필수 약관에 동의해주세요.", "warning");
      return;
    }
    navigate("/signup");
  };

  const canProceed = agreements.privacy && agreements.location;

  return (
    <div className="login-container h-screen overflow-hidden flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="login-card w-full max-w-2xl h-[90vh] bg-white border border-gray-100 rounded-xl shadow-lg p-5 flex flex-col overflow-hidden min-h-0">
        <h1 className="login-title text-2xl font-semibold mb-4 text-gray-800">약관 동의</h1>

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col gap-3" style={{ marginBottom: "20px" }}>
          <div className="flex items-center p-3 bg-gray-100 rounded flex-none">
            <input
              type="checkbox"
              id="selectAll"
              checked={agreements.privacy && agreements.location && agreements.marketing}
              onChange={handleSelectAll}
              style={{ marginRight: "10px", transform: "scale(1.2)" }}
            />
            <label htmlFor="selectAll" className="font-semibold text-base">
              전체 동의
            </label>
          </div>
          <div
            className="grid flex-1 min-h-0 overflow-hidden"
            style={{ gridTemplateRows: "minmax(0, 4fr) minmax(0, 4fr) minmax(0, 2fr)", rowGap: "0.75rem" }}
          >
            <div className="flex flex-col min-h-0">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={agreements.privacy}
                  onChange={() => handleAgreementChange("privacy")}
                  style={{ marginRight: "10px" }}
                />
                <label htmlFor="privacy" className="font-medium">
                  (필수) 개인정보 처리방침 동의
                </label>
              </div>
            <div className="bg-gray-50 p-4 rounded text-sm flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-200">
              <h4>개인정보 처리방침</h4>
              <Markdown content={privacyMd} className="markdown-body" />
            </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="location"
                  checked={agreements.location}
                  onChange={() => handleAgreementChange("location")}
                  style={{ marginRight: "10px" }}
                />
                <label htmlFor="location" className="font-medium">
                  (필수) 위치정보 이용약관 동의
                </label>
              </div>
            <div className="bg-gray-50 p-4 rounded text-sm flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-200">
              <h4>위치정보 이용약관</h4>
              <Markdown content={locationMd} className="markdown-body" />
            </div>
            </div>

            <div className="flex flex-col min-h-0">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={agreements.marketing}
                  onChange={() => handleAgreementChange("marketing")}
                  style={{ marginRight: "10px" }}
                />
                <label htmlFor="marketing" className="font-medium">
                  (선택) 마케팅 정보 수신 동의
                </label>
              </div>
            <div className="bg-gray-50 p-4 rounded text-sm flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-200">
              <Markdown content={marketingMd} className="markdown-body" />
            </div>
            </div>
          </div>
        </div>

        <div className="bg-white pt-4 mt-auto border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="login-button flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg h-11"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="login-button flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-11"
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.5, cursor: canProceed ? "pointer" : "not-allowed" }}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
