import React, { useEffect } from "react";
import useFormState from "../../hooks/useFormState";

export default function DeviceInfoForm({ initial = {}, onSubmit, readOnly = false, formId, showSubmit = true }) {
  const initialFormValues = {
    supplier: initial.supplier || "",
    installDate: initial.installDate || "",
    installer: initial.installer || "",
    serial: initial.serial || "",
    photos: initial.photos || [], // in-memory only
  };

  const submitProxy = async (values) => {
    if (onSubmit) {
      return onSubmit(values);
    }
  };

  const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit: submitProxy });

  useEffect(() => {
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  }, [initial, readOnly, formId, showSubmit]);

  useEffect(() => {
  }, [form]);

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []);
    update("photos", files);
  };

  const infoRow = (label, input) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div>{input}</div>
    </>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__body">
        <div className="asset-doc" style={{ marginBottom: 16 }}>
          <div className="asset-doc__title">단말 장착 사진</div>
          <div className="asset-doc__box" aria-label="단말 장착 사진 업로드">
            {readOnly ? (
              <div className="asset-doc__placeholder">
                {Array.isArray(form.photos) && form.photos.length > 0
                  ? `${form.photos.length}개 파일 등록됨`
                  : "등록된 파일 없음"
                }
              </div>
            ) : (
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotos}
                  disabled={readOnly}
                />
                <div className="asset-doc__placeholder">
                  {Array.isArray(form.photos) && form.photos.length > 0
                    ? `${form.photos.length}개 파일 선택됨`
                    : "파일 선택/촬영"
                  }
                </div>
              </label>
            )}
          </div>
        </div>

        <form id={formId} onSubmit={handleSubmit}>
          <div className="asset-info grid-info">
            {infoRow(
              "단말 공급사",
              <input
                id="supplier"
                className="form-input"
                value={form.supplier}
                onChange={(e) => update("supplier", e.target.value)}
                placeholder="예: ABC 디바이스"
                disabled={readOnly}
                required
              />
            )}
            {infoRow(
              "단말 장착일",
              <input
                id="installDate"
                type="date"
                className="form-input"
                value={form.installDate}
                onChange={(e) => update("installDate", e.target.value)}
                disabled={readOnly}
                required
              />
            )}
            {infoRow(
              "장착자 이름",
              <input
                id="installer"
                className="form-input"
                value={form.installer}
                onChange={(e) => update("installer", e.target.value)}
                placeholder="예: 홍길동"
                disabled={readOnly}
                required
              />
            )}
            {infoRow(
              "단말 시리얼번호",
              <input
                id="serial"
                className="form-input"
                value={form.serial}
                onChange={(e) => update("serial", e.target.value)}
                placeholder="예: DEV-2024-0001"
                disabled={readOnly}
                required
              />
            )}
          </div>

          {!readOnly && showSubmit && (
            <div className="asset-dialog__footer">
              <button type="submit" className="form-button">저장</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
