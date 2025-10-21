import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      alert("필수 약관에 동의해주세요.");
      return;
    }
    navigate("/signup");
  };

  const canProceed = agreements.privacy && agreements.location;

  return (
    <div className="login-container min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="login-card w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg p-5">
        <h1 className="login-title text-2xl font-semibold mb-4 text-gray-800">약관 동의</h1>

        <div style={{ marginBottom: "20px" }}>
          <div className="flex items-center mb-4 p-3 bg-gray-100 rounded">
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

          <div className="mb-4">
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
            <div className="bg-gray-50 p-4 rounded text-sm max-h-28 overflow-y-auto border border-gray-200">
              <h4>개인정보 처리방침</h4>
              <p>1. 개인정보의 처리 목적</p>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리하고 있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.</p>
              <ul>
                <li>회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증</li>
                <li>재화 또는 서비스 제공</li>
                <li>고객센터 운영</li>
                <li>새로운 서비스 개발 및 맞춤 서비스 제공</li>
              </ul>

              <p>2. 개인정보의 처리 및 보유 기간</p>
              <p>회사는 정보주체로부터 개인정보를 수집할 때 동의받은 개인정보 보유·이용기간 또는 법령에 따른 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>

              <p>3. 개인정보의 제3자 제공</p>
              <p>회사는 정보주체의 개인정보를 개인정보 처리 목적에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
            </div>
          </div>

          <div className="mb-4">
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
            <div className="bg-gray-50 p-4 rounded text-sm max-h-28 overflow-y-auto border border-gray-200">
              <h4>위치정보 이용약관</h4>
              <p>1. 위치정보의 수집·이용 목적</p>
              <ul>
                <li>차량 위치 추적 서비스 제공</li>
                <li>차량 렌탈 서비스 관련 위치 기반 서비스 제공</li>
                <li>긴급상황 시 차량 위치 확인</li>
                <li>도난 차량 추적 및 회수</li>
              </ul>

              <p>2. 수집하는 위치정보의 항목</p>
              <ul>
                <li>GPS 좌표 정보</li>
                <li>기지국 위치 정보</li>
                <li>Wi-Fi 접속 지점(AP) 정보</li>
              </ul>

              <p>3. 위치정보의 보유·이용 기간</p>
              <p>위치정보는 수집·이용에 대한 동의일로부터 개인위치정보의 이용·제공목적을 달성할 때까지 보유·이용됩니다.</p>

              <p>4. 위치정보의 제3자 제공</p>
              <p>회사는 개인위치정보를 제3자에게 제공하지 않습니다. 단, 법령에 의한 경우는 예외로 합니다.</p>
            </div>
          </div>

          <div className="mb-5">
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
            <div className="bg-gray-50 p-4 rounded text-sm max-h-16 overflow-y-auto border border-gray-200">
              <p>서비스 관련 새로운 소식, 이벤트 정보, 맞춤형 광고 등을 이메일, SMS, 앱 푸시 등으로 받아보실 수 있습니다.</p>
              <p>동의하지 않으셔도 서비스 이용이 가능하며, 언제든지 철회하실 수 있습니다.</p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white pt-4 mt-5 border-t border-gray-200 flex gap-2">
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
