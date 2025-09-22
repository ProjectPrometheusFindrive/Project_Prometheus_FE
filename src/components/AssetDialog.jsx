import React from "react";

export default function AssetDialog({ asset = {}, mode = "create", onClose }) {
  const isEdit = mode === "edit";
  const docBox = (title) => (
    <div className="asset-doc">
      <div className="asset-doc__title">{title}</div>
      <div className="asset-doc__box" aria-label={`${title} 미리보기/업로드 영역`}>
        <div className="asset-doc__placeholder">프리뷰/업로드 영역</div>
      </div>
    </div>
  );

  const infoRow = (label, value) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div className="asset-info__value">{value ?? <span className="empty">-</span>}</div>
    </>
  );

  const dateItem = (label, value) => (
    <div className="asset-dates__item">
      <div className="asset-dates__label">{label}</div>
      <div className="asset-dates__value">{value || <span className="empty">-</span>}</div>
    </div>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__grid">
        <div className="asset-dialog__left">
          {docBox("원리금 상환 계획표")}
          {docBox("자동차 등록증")}
        </div>

        <div className="asset-dialog__right">
          <div className="asset-info grid-info">
            {infoRow("제조사", asset.make || "")}
            {infoRow("차종", asset.model || "")}
            {infoRow("차량번호", asset.plate || "")}
            {infoRow("차대번호(VIN)", asset.vin || "")}
            {infoRow("차량가액", asset.vehicleValue || "")}
          </div>

          <div className="asset-dates">
            {dateItem("차량 구매일", asset.purchaseDate || "")}
            {dateItem("전산 등록 일자", asset.systemRegDate || "")}
            {dateItem("전산 삭제 일자", asset.systemDelDate || "")}
          </div>
        </div>
      </div>

      <div className="asset-dialog__footer">
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

