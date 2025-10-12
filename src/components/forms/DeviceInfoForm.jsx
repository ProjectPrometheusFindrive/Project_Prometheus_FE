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
    console.log("[DeviceInfoForm] onSubmit called", { values });
    if (onSubmit) {
      return onSubmit(values);
    }
  };

  const { form, update, handleSubmit } = useFormState(initialFormValues, { onSubmit: submitProxy });

  useEffect(() => {
    console.log("[DeviceInfoForm] mount", { initial, readOnly, formId, showSubmit });
    console.log("[DeviceInfoForm] initialFormValues", initialFormValues);
    return () => {
      console.log("[DeviceInfoForm] unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("[DeviceInfoForm] props changed", { initial, readOnly, formId, showSubmit });
    console.log("[DeviceInfoForm] recomputed initialFormValues", initialFormValues);
  }, [initial, readOnly, formId, showSubmit]);

  useEffect(() => {
    console.log("[DeviceInfoForm] form changed", form);
  }, [form]);

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []);
    console.log("[DeviceInfoForm] handlePhotos", { count: files.length, names: files.map((f) => f && f.name) });
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
                  onFocus={() => console.log("[DeviceInfoForm] focus photos")}
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
                onFocus={() => console.log("[DeviceInfoForm] focus supplier")}
                onChange={(e) => {
                  console.log("[DeviceInfoForm] change supplier", { value: e.target.value, readOnly });
                  update("supplier", e.target.value);
                }}
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
                onFocus={() => console.log("[DeviceInfoForm] focus installDate")}
                onChange={(e) => {
                  console.log("[DeviceInfoForm] change installDate", { value: e.target.value, readOnly });
                  update("installDate", e.target.value);
                }}
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
                onFocus={() => console.log("[DeviceInfoForm] focus installer")}
                onChange={(e) => {
                  console.log("[DeviceInfoForm] change installer", { value: e.target.value, readOnly });
                  update("installer", e.target.value);
                }}
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
                onFocus={() => console.log("[DeviceInfoForm] focus serial")}
                onChange={(e) => {
                  console.log("[DeviceInfoForm] change serial", { value: e.target.value, readOnly });
                  update("serial", e.target.value);
                }}
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
