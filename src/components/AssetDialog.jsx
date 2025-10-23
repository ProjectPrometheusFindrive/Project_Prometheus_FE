import React, { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "../utils/formatters";
import { formatDateShort } from "../utils/date";
import { isValidKoreanPlate, normalizeKoreanPlate } from "../utils/validators";
import { getSignedDownloadUrl } from "../utils/gcsApi";
import GCSImage from "./GCSImage";
import FilePreview from "./FilePreview";
import DocumentViewer from "./DocumentViewer";
import MultiDocGallery from "./MultiDocGallery";
import FilesPreviewCarousel from "./FilesPreviewCarousel";
import UploadProgress from "./UploadProgress";
import { uploadOneOCR } from "../utils/uploadHelpers";
import { ocrExtract } from "../api";
import { randomId } from "../utils/id";
import { useAuth } from "../contexts/AuthContext";
import { useCompany } from "../contexts/CompanyContext";
import OcrSuggestionPicker from "./OcrSuggestionPicker";
import { emitToast } from "../utils/toast";

// Normalize OCR fuel labels to canonical options used in UI
function normalizeFuelLabel(val) {
  const v = String(val || "").trim();
  const lower = v.toLowerCase();
  if (v === "휘발유") return "가솔린";
  if (v === "경유") return "디젤";
  if (v === "수소전기") return "수소";
  if (["gasoline", "petrol"].includes(lower)) return "가솔린";
  if (["diesel"].includes(lower)) return "디젤";
  if (["electric", "ev"].includes(lower)) return "전기";
  if (["hybrid", "hev", "phev", "plug-in hybrid"].includes(lower)) return "하이브리드";
  if (["hydrogen", "fcev"].includes(lower)) return "수소";
  if (["lpg"].includes(lower)) return "LPG";
  return v;
}

export default function AssetDialog({ asset = {}, mode = "create", onClose, onSubmit, requireDocs = true }) {
  const isEdit = mode === "edit";
  const [step, setStep] = useState(isEdit ? "details" : "upload");
  const tmpIdRef = useRef(randomId("asset"));
  const [busy, setBusy] = useState({ status: "idle", message: "", percent: 0, label: "" });
  const [preUploaded, setPreUploaded] = useState({ registration: [], insurance: [] });
  const [ocrSuggest, setOcrSuggest] = useState({});
  const auth = useAuth();
  const { companyInfo } = useCompany();
  const companyId = (auth?.user?.companyId || companyInfo?.companyId || "ci");
  const ocrFolderBase = `company/${companyId}/docs`;
  const [form, setForm] = useState({
    make: asset.make || "",
    model: asset.model || "",
    year: asset.year || "",
    fuelType: asset.fuelType || "",
    plate: asset.plate || "",
    vin: asset.vin || "",
    vehicleValue: asset.vehicleValue || "",
    registrationDoc: null,
    insuranceDoc: null, // 원리금 상환 계획표 (placeholder)
  });


  // Validate plate format
  const isPlateInvalid = form.plate && !isValidKoreanPlate(form.plate);

  const infoRow = (label, value) => (
    <>
      <div className="asset-info__label">{label}</div>
      <div className="asset-info__value">{value ?? <span className="empty">-</span>}</div>
    </>
  );

  const dateItem = (label, value) => {
    // Normalize incoming value (can be Date object or string) to display-safe string
    const display = value ? formatDateShort(value) : "";
    return (
      <div className="asset-dates__item">
        <div className="asset-dates__label">{label}</div>
        <div className="asset-dates__value">{display || <span className="empty">-</span>}</div>
      </div>
    );
  };

  // OCR suggestions mapped by field name, including aliasing for amortizationSchedule
  const fieldSuggestions = useMemo(() => {
    const map = {};
    const push = (name, value, confidence, source) => {
      if (!name) return;
      if (!map[name]) map[name] = [];
      map[name].push({ value, confidence, source });
    };
    const addDoc = (docKey) => {
      const doc = ocrSuggest && ocrSuggest[docKey];
      const fields = (doc && Array.isArray(doc.fields)) ? doc.fields : [];
      const source = doc && doc.source;
      fields.forEach((f) => {
        // Capture array suggestions, e.g., possibleFuelTypes: ["디젤", ...]
        if (f && f.name === "possibleFuelTypes" && Array.isArray(f.value)) {
          f.value.forEach((ft) => push("fuelType", String(ft || ""), f.confidence, source));
        }
        // Default push
        push(f.name, f.value, f.confidence, source);
      });
    };
    // Registration doc fields (plate, vin, make, model, year, ...)
    addDoc("registrationDoc");
    // Amortization schedule fields (e.g., vehiclePrice, monthlyPayment)
    const amort = ocrSuggest && ocrSuggest.amortizationSchedule;
    if (amort && Array.isArray(amort.fields)) {
      const source = amort.source;
      amort.fields.forEach(({ name, value, confidence }) => {
        // Alias vehiclePrice -> vehicleValue for FE form
        if (name === "vehiclePrice") {
          push("vehicleValue", value, confidence, source);
        }
        // Also keep original keys available if needed
        push(name, value, confidence, source);
      });
    }
    return map;
  }, [ocrSuggest]);

  // Auto-select fuel type when there is exactly one OCR candidate
  useEffect(() => {
    if (form.fuelType) return;
    const candidates = (fieldSuggestions.fuelType || [])
      .map((it) => normalizeFuelLabel(it?.value))
      .filter(Boolean);
    const unique = Array.from(new Set(candidates));
    if (unique.length === 1) {
      setForm((p) => ({ ...p, fuelType: unique[0] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldSuggestions.fuelType]);

  const applySuggestion = (key) => (val) => {
    const v = (val == null) ? "" : String(val);
    setForm((p) => {
      const next = { ...p, [key]: v };
      if (!next.vehicleType && next.model && next.year) {
        next.vehicleType = `${next.model} ${next.year}년형`;
      }
      return next;
    });
  };

  // Step 1: upload & OCR helpers (create mode only)
  const toArray = (val) => (Array.isArray(val) ? val : (val instanceof File ? [val] : []));
  const uploadOneFile = async (file, label) => {
    return uploadOneOCR(file, {
      folder: ocrFolderBase,
      type: "asset",
      tmpId: tmpIdRef.current,
      label,
      onProgress: (p) => setBusy((s) => ({ ...s, percent: p.percent })),
    });
  };

  // OCR 진행률 시뮬레이션 (10초 선형 증가, 완료 시 0.5초로 100%)
  const ocrTimerRef = useRef(null);
  const ocrStartRef = useRef(0);
  const startOcrSim = () => {
    ocrStartRef.current = Date.now();
    if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);
    ocrTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - ocrStartRef.current;
      const target = Math.min(95, Math.floor((elapsed / 10000) * 95));
      setBusy((b) => (b.status === "ocr" && b.percent < target ? { ...b, percent: target } : b));
    }, 200);
  };
  const completeOcrSim = async () => {
    if (ocrTimerRef.current) {
      clearInterval(ocrTimerRef.current);
      ocrTimerRef.current = null;
    }
    return new Promise((resolve) => {
      setBusy((b) => ({ ...b, percent: 100 }));
      setTimeout(resolve, 500);
    });
  };
  useEffect(() => () => { if (ocrTimerRef.current) clearInterval(ocrTimerRef.current); }, []);

  const handleUploadAndOcr = async () => {
    const regFiles = toArray(form.registrationDoc);
    const planFiles = toArray(form.insuranceDoc); // 원리금 상환 계획표
    if (requireDocs && regFiles.length === 0 && planFiles.length === 0) {
      emitToast("업로드할 파일을 선택해 주세요.", "warning");
      return;
    }

    // Prepare all items and total bytes for aggregate progress
    const items = [];
    regFiles.forEach((f) => items.push({ file: f, ocrLabel: "registrationDoc", display: `자동차 등록증 - ${f?.name || "파일"}` }));
    planFiles.forEach((f) => items.push({ file: f, ocrLabel: "amortizationSchedule", display: `원리금 상환 계획표 - ${f?.name || "파일"}` }));
    const totalBytes = items.reduce((sum, it) => sum + (it.file?.size || 0), 0);
    let completedBytes = 0;

    setBusy({ status: "uploading", message: "업로드 중...", percent: 0, label: items.length ? `${items.length}개 파일 업로드 준비...` : "파일 업로드" });
    try {
      const uploaded = { registration: [], insurance: [] };
      for (let i = 0; i < items.length; i++) {
        const { file, ocrLabel, display } = items[i];
        const fileSize = file?.size || 0;
        setBusy({ status: "uploading", message: "업로드 중...", percent: Math.round((completedBytes / Math.max(1, totalBytes)) * 100), label: `${i + 1}/${items.length} ${display}` });

        const res = await uploadOneOCR(file, {
          folder: ocrFolderBase,
          type: "asset",
          tmpId: tmpIdRef.current,
          label: ocrLabel,
          onProgress: (p) => {
            const loaded = typeof p?.loaded === "number"
              ? p.loaded
              : typeof p?.percent === "number"
                ? Math.round((p.percent / 100) * fileSize)
                : 0;
            const overallLoaded = completedBytes + loaded;
            const overallPct = totalBytes > 0 ? Math.min(99, Math.round((overallLoaded / totalBytes) * 100)) : 100;
            setBusy((s) => ({ ...s, percent: overallPct }));
          },
        });

        completedBytes += fileSize;
        const overallPctAfter = totalBytes > 0 ? Math.round((completedBytes / totalBytes) * 100) : 100;
        setBusy((s) => ({ ...s, percent: overallPctAfter }));

        if (res?.objectName) {
          if (ocrLabel === "registrationDoc") uploaded.registration.push(res);
          else if (ocrLabel === "amortizationSchedule") uploaded.insurance.push(res);
        }
      }

      setPreUploaded(uploaded);
      setBusy({ status: "ocr", message: "자동 채움 처리 중...", percent: 0, label: "자동 채움 처리 중..." });
      startOcrSim();
      const suggestions = {};
      // registrationDoc OCR → prefill
      if (uploaded.registration[0]?.objectName) {
        try {
          const resp = await ocrExtract({
            docType: "registrationDoc",
            objectName: uploaded.registration[0].objectName,
            sourceName: uploaded.registration[0].name,
            saveOutput: true,
          });
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.registrationDoc) {
            suggestions.registrationDoc = resp.ocrSuggestions.registrationDoc;
            // map fields into form conservatively (only empty fields)
            const fields = suggestions.registrationDoc.fields || [];
            const next = { ...form };
            const map = { plate: "plate", vin: "vin", registrationDate: "registrationDate", make: "make", model: "model", year: "year" };
            fields.forEach(({ name, value }) => {
              const key = map[name];
              if (key && (next[key] == null || next[key] === "")) {
                next[key] = String(value || "");
              }
            });
            // Compose vehicleType if possible
            if (!next.vehicleType && next.model && next.year) {
              next.vehicleType = `${next.model} ${next.year}년형`;
            }
            setForm(next);
          }
        } catch (e) {
          console.warn("registrationDoc OCR failed", e);
        }
      }

      // amortizationSchedule OCR (optional, store suggestions only)
      if (uploaded.insurance[0]?.objectName) {
        try {
          const resp = await ocrExtract({
            docType: "amortizationSchedule",
            objectName: uploaded.insurance[0].objectName,
            sourceName: uploaded.insurance[0].name,
            saveOutput: true,
          });
          if (resp && resp.ocrSuggestions && resp.ocrSuggestions.amortizationSchedule) {
            suggestions.amortizationSchedule = resp.ocrSuggestions.amortizationSchedule;
            // If vehiclePrice is present and 차량가액이 비어있으면 채워 넣기
            try {
              const fields = suggestions.amortizationSchedule.fields || [];
              const vField = fields.find((f) => f.name === "vehiclePrice");
              if (vField && (form.vehicleValue == null || form.vehicleValue === "")) {
                const raw = String(vField.value || "");
                setForm((p) => ({ ...p, vehicleValue: formatCurrency(raw) }));
              }
            } catch {}
          }
        } catch (e) {
          console.warn("amortizationSchedule OCR failed", e);
        }
      }

      setOcrSuggest(suggestions);
      await completeOcrSim();
      setBusy({ status: "idle", message: "", percent: 0, label: "" });
      setStep("details");
    } catch (e) {
      console.error("upload/OCR error", e);
      setBusy({ status: "idle", message: "", percent: 0, label: "" });
      // allow proceeding without OCR
      emitToast("업로드 또는 자동 채움 처리 중 오류가 발생했습니다. 수동으로 진행해 주세요.", "error");
      setStep("details");
    }
  };

  // Document preview state and helpers
  const [insuranceDocUrl, setInsuranceDocUrl] = useState("");
  const [registrationDocUrl, setRegistrationDocUrl] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (!isEdit || !asset) return;
    let cancelled = false;
    const fetchUrls = async () => {
      setLoadingDocs(true);
      try {
        const tasks = [];
        if (asset.insuranceDocGcsObjectName) {
          tasks.push(
            getSignedDownloadUrl(asset.insuranceDocGcsObjectName)
              .then((url) => { if (!cancelled) setInsuranceDocUrl(url); })
              .catch(() => {})
          );
        }
        if (asset.registrationDocGcsObjectName) {
          tasks.push(
            getSignedDownloadUrl(asset.registrationDocGcsObjectName)
              .then((url) => { if (!cancelled) setRegistrationDocUrl(url); })
              .catch(() => {})
          );
        }
        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    };
    fetchUrls();
    return () => { cancelled = true; };
  }, [isEdit, asset]);

  const [viewer, setViewer] = useState({ open: false, src: "", type: "", title: "" });
  const openViewer = (src, name) => {
    if (!src) return;
    const lower = String(name || "").toLowerCase();
    const isPdf = lower.endsWith(".pdf") || /(?:^|[.?=&])content-type=application%2Fpdf/.test(src);
    const isVideo = /(\.mp4|\.webm|\.mov|\.avi|\.mpeg|\.mpg)$/i.test(lower) || /[?&]type=video\//.test(src);
    const type = isPdf ? "pdf" : isVideo ? "video" : "image";
    const t = name ? `${name}` : "";
    setViewer({ open: true, src, type, title: t });
  };

  const onFile = (key) => (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (e.target.multiple) {
        console.debug("[upload-ui] asset dialog files selected:", { key, count: files.length, names: files.map(f => f.name) });
        setForm((p) => ({ ...p, [key]: files }));
      } else {
        const file = files[0];
        console.debug("[upload-ui] asset dialog file selected:", { key, name: file.name, size: file.size, type: file.type });
        setForm((p) => ({ ...p, [key]: file }));
      }
    } else {
      console.debug("[upload-ui] asset dialog file cleared:", { key });
      setForm((p) => ({ ...p, [key]: e.target.multiple ? [] : null }));
    }
  };

  const docBoxView = (title, url, docName) => {
    const renderContent = () => {
      if (loadingDocs) {
        return <div className="text-[12px] text-gray-600">문서 불러오는 중…</div>;
      }
      if (!url) {
        return <div className="empty">문서 없음</div>;
      }
      const lower = String(docName || "").toLowerCase();
      const isPdf = lower.endsWith('.pdf') || url.includes('content-type=application%2Fpdf');
      if (isPdf) {
        return (
          <button type="button" className="simple-button" onClick={() => openViewer(url, docName)} title="문서 미리보기">
            {docName || "문서 보기"}
          </button>
        );
      }
      return (
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-[200px] object-contain cursor-zoom-in"
          onClick={() => openViewer(url, docName)}
        />
      );
    };

    return (
      <div className="asset-doc">
        <div className="asset-doc__title">{title}</div>
        <div className="asset-doc__box min-h-20 p-2" aria-label={`${title} 미리보기 영역`}>
          {renderContent()}
        </div>
      </div>
    );
  };

  const docBoxEdit = (title, key, accept = "image/*,application/pdf") => (
    <div className="asset-doc">
      <div className="asset-doc__title">{title}</div>
      <div className="mb-3">
        <input
          id={`asset-${key}`}
          name={key}
          type="file"
          accept={accept}
          multiple
          onChange={onFile(key)}
          required={requireDocs}
        />
      </div>
      {Array.isArray(form[key]) ? (
        <div>
          <FilesPreviewCarousel files={form[key]} />
        </div>
      ) : (
        <FilePreview file={form[key]} />
      )}
    </div>
  );

  const handleSave = async () => {
    if (isPlateInvalid) {
      emitToast("올바르지 않은 차량번호 형식입니다.", "warning");
      return;
    }
    if (onSubmit) {
      await onSubmit({
        ...form,
        registrationDocGcsObjectName: preUploaded.registration[0]?.objectName || null,
        registrationDocName: preUploaded.registration[0]?.name || null,
        insuranceDocGcsObjectName: preUploaded.insurance[0]?.objectName || null,
        insuranceDocName: preUploaded.insurance[0]?.name || null,
      });
    }
  };

  const UploadStep = (
    <>
      <div className="asset-docs-section mb-4">
        {docBoxEdit("원리금 상환 계획표", "insuranceDoc")}
        {docBoxEdit("자동차 등록증", "registrationDoc")}
      </div>
      <div className="min-h-[26px] mt-1">
        <UploadProgress status={busy.status} percent={busy.percent} label={busy.label} variant="bar" />
      </div>
      <div className="asset-dialog__footer flex justify-end gap-2">
        <button type="button" className="form-button" onClick={handleUploadAndOcr} disabled={busy.status !== "idle"}>
          업로드 및 자동 채움
        </button>
        <button type="button" className="form-button form-button--muted" onClick={() => setStep("details")} disabled={busy.status !== "idle"}>
          자동 채움 없이 진행
        </button>
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </>
  );

  const DetailsStep = (
    <>
      <div className="asset-info grid-info">
        {infoRow(
          "제조사",
          <div className="flex items-center gap-2 flex-nowrap">
            <input id="asset-make" name="make" className="form-input flex-1 min-w-0" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} placeholder="예: 현대" />
            <OcrSuggestionPicker items={fieldSuggestions.make || []} onApply={applySuggestion("make")} showLabel={false} maxWidth={200} />
          </div>
        )}
        {infoRow(
          "차종",
          <div className="flex items-center gap-2 flex-nowrap">
            <input id="asset-model" name="model" className="form-input flex-1 min-w-0" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="예: 쏘나타" />
            <OcrSuggestionPicker items={fieldSuggestions.model || []} onApply={applySuggestion("model")} showLabel={false} maxWidth={200} />
          </div>
        )}
        {infoRow(
          "연식",
          <div className="flex items-center gap-2 flex-nowrap">
            <select id="asset-year" name="year" className="form-input flex-1 min-w-0" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}>
              {(() => {
                const CURRENT_YEAR = new Date().getFullYear();
                const YEAR_START = 1990;
                const options = [{ value: "", label: "선택" }].concat(
                  Array.from({ length: CURRENT_YEAR - YEAR_START + 1 }, (_, i) => {
                    const y = CURRENT_YEAR - i;
                    return { value: String(y), label: String(y) };
                  })
                );
                return options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ));
              })()}
            </select>
            <OcrSuggestionPicker items={(fieldSuggestions.year || []).map((it) => ({ ...it, value: String(it.value) }))} onApply={applySuggestion("year")} showLabel={false} maxWidth={140} />
          </div>
        )}
        {infoRow(
          "연료 타입",
          (() => {
            const base = ["", "가솔린", "디젤", "전기", "하이브리드", "LPG", "수소", "기타"];
            const suggestedRaw = (fieldSuggestions.fuelType || [])
              .map((it) => String(it.value || "").trim())
              .filter(Boolean);

            // Normalize OCR values to our base labels (휘발유→가솔린, 경유→디젤, etc.)
            const suggestedNormalized = new Set(suggestedRaw.map((s) => normalizeFuelLabel(s)));

            // Only use the base option list; do not inject OCR items
            const ordered = base.slice();

            // Option highlight style for OCR suggestions (light blue background, dark text)
            const highlightStyle = { backgroundColor: "#e3f2fd", color: "#1e3a8a" };

            // Normalize current selection to base to prevent selecting an unknown value (e.g., 휘발유→가솔린)
            const selectedValue = normalizeFuelLabel(form.fuelType);

            return (
              <div className="flex items-center gap-2 flex-nowrap">
                <select
                  id="asset-fuelType"
                  name="fuelType"
                  className="form-input"
                  value={selectedValue}
                  onChange={(e) => setForm((p) => ({ ...p, fuelType: normalizeFuelLabel(e.target.value) }))}
                >
                  {ordered.map((v, i) => {
                    const label = v || "선택";
                    const normalized = normalizeFuelLabel(v);
                    const isSuggested = v && suggestedNormalized.has(normalized);
                    return (
                      <option
                        key={v ? v : `_empty_${i}`}
                        value={v}
                        data-suggested={isSuggested ? "true" : undefined}
                        style={isSuggested ? highlightStyle : undefined}
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>
                {/* Compact OCR confidence indicator */}
                <OcrSuggestionPicker items={fieldSuggestions.fuelType || []} onApply={() => { /* no auto-apply for fuel */ }} showLabel={false} maxWidth={140} />
              </div>
            );
          })()
        )}
        {infoRow(
          "차량번호",
          <div className="flex items-center gap-2 w-full flex-wrap">
            <input id="asset-plate" name="plate"
              className={`form-input${isPlateInvalid ? " is-invalid" : ""}`}
              value={form.plate}
              onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
              onBlur={(e) => {
                const v = normalizeKoreanPlate(e.target.value);
                if (v !== form.plate) setForm((p) => ({ ...p, plate: v }));
              }}
              aria-invalid={isPlateInvalid ? true : undefined}
              placeholder="예: 28가2345"
            />
            {isPlateInvalid && (
              <span aria-live="polite" className="text-red-700 text-[12px]">올바르지 않은 형식</span>
            )}
            <OcrSuggestionPicker items={fieldSuggestions.plate || []} onApply={applySuggestion("plate")} showLabel={false} maxWidth={200} />
          </div>
        )}
        {infoRow(
          "차대번호(VIN)",
          <div className="flex items-center gap-2 flex-nowrap">
            <input id="asset-vin" name="vin" className="form-input flex-1 min-w-0" value={form.vin} onChange={(e) => setForm((p) => ({ ...p, vin: e.target.value }))} placeholder="예: KMHxxxxxxxxxxxxxx" />
            <OcrSuggestionPicker items={fieldSuggestions.vin || []} onApply={applySuggestion("vin")} showLabel={false} maxWidth={240} />
          </div>
        )}
        {infoRow(
          "차량가액(원)",
          <div className="flex items-center gap-2 flex-nowrap w-full">
            <input id="asset-vehicleValue" name="vehicleValue"
              className="form-input flex-1"
              type="text"
              value={form.vehicleValue}
              onChange={(e) => setForm((p) => ({ ...p, vehicleValue: formatCurrency(e.target.value) }))}
              inputMode="numeric"
              maxLength={20}
              placeholder="예: 25,000,000"
            />
            <OcrSuggestionPicker
              items={fieldSuggestions.vehicleValue || []}
              onApply={(val) => {
                const raw = val == null ? "" : String(val);
                setForm((p) => ({ ...p, vehicleValue: formatCurrency(raw) }));
              }}
              showLabel={false}
              maxWidth={200}
            />
          </div>
        )}
      </div>
      <div className="asset-dialog__footer flex justify-end gap-2">
        <button type="button" className="form-button form-button--muted" onClick={() => setStep("upload")}>이전</button>
        <button type="button" className="form-button" onClick={handleSave} disabled={isPlateInvalid}>저장</button>
        <button type="button" className="form-button" onClick={onClose}>닫기</button>
      </div>
    </>
  );

  return (
    <div className="asset-dialog">
      <div className="asset-dialog__body">
        {isEdit ? (
          <>
            <div className="asset-docs-section mb-4">
              {/* Multi-doc gallery (preferred) */}
              {Array.isArray(asset.insuranceDocGcsObjectNames) && asset.insuranceDocGcsObjectNames.length > 0 ? (
                <MultiDocGallery
                  title="원리금 상환 계획표"
                  items={asset.insuranceDocGcsObjectNames.map((obj, idx) => ({ name: (asset.insuranceDocNames && asset.insuranceDocNames[idx]) || `보험서류 ${idx + 1}` , objectName: obj }))}
                />
              ) : (
                docBoxView("원리금 상환 계획표", insuranceDocUrl, asset.insuranceDocName)
              )}
              {Array.isArray(asset.registrationDocGcsObjectNames) && asset.registrationDocGcsObjectNames.length > 0 ? (
                <MultiDocGallery
                  title="자동차 등록증"
                  items={asset.registrationDocGcsObjectNames.map((obj, idx) => ({ name: (asset.registrationDocNames && asset.registrationDocNames[idx]) || `등록증 ${idx + 1}`, objectName: obj }))}
                />
              ) : (
                docBoxView("자동차 등록증", registrationDocUrl, asset.registrationDocName)
              )}
            </div>
          <div className="asset-info grid-info">
            {infoRow("제조사", asset.make || "")}
            {infoRow("차종", asset.model || "")}
            {infoRow("연식", asset.year || "")}
            {infoRow("연료 타입", asset.fuelType || "")}
            {infoRow("차량번호", asset.plate || "")}
            {infoRow("차대번호(VIN)", asset.vin || "")}
            {infoRow("차량가액", asset.vehicleValue || "")}
          </div>
          </>
        ) : (step === "upload" ? UploadStep : DetailsStep)}

        {(asset.purchaseDate || asset.registrationDate || asset.systemRegDate || asset.systemDelDate) && (
          <div className="mt-4">
            <div className="asset-doc__title mb-2">등록 정보</div>
            <div className="asset-dates">
              {asset.purchaseDate && dateItem("차량 구매일", asset.purchaseDate)}
              {(asset.registrationDate || asset.systemRegDate) && dateItem("전산 등록일", asset.registrationDate || asset.systemRegDate)}
              {asset.systemDelDate && dateItem("전산 삭제일", asset.systemDelDate)}
            </div>
          </div>
        )}
      </div>

      {isEdit && (
        <div className="asset-dialog__footer">
          <button type="button" className="form-button" onClick={onClose}>닫기</button>
        </div>
      )}
      <DocumentViewer
        isOpen={viewer.open}
        onClose={() => setViewer((v) => ({ ...v, open: false }))}
        src={viewer.src}
        type={viewer.type}
        title={viewer.title}
      />
    </div>
  );
}
