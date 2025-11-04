import { useState } from "react";
import { fetchRentalById, fetchRentalAccidentDetail, updateRental } from "../api";
import { isFileTypeAllowed } from "../constants/uploads";
import { uploadOneCancelable } from "../utils/uploadHelpers";
import { formatDisplayDate } from "../utils/date";
import { emitToast } from "../utils/toast";

const DEFAULT_FORM = {
  accidentDate: "",
  accidentHour: "00",
  accidentMinute: "00",
  accidentSecond: "00",
  handlerName: "",
  blackboxFile: null,
  blackboxFileName: "",
};

export default function useAccidentReport({ setItems, setSelectedContract }) {
  const [showAccidentModal, setShowAccidentModal] = useState(false);
  const [showAccidentInfoModal, setShowAccidentInfoModal] = useState(false);
  const [accidentTarget, setAccidentTarget] = useState(null);
  const [accidentForm, setAccidentForm] = useState({ ...DEFAULT_FORM });
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadState, setUploadState] = useState({ status: "idle", percent: 0, error: "", cancel: null, mode: "" });

  const handleAccidentInputChange = (name, value) => {
    setAccidentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccidentFileChange = (event) => {
    const file = event.target?.files && event.target.files[0] ? event.target.files[0] : null;
    setAccidentForm((prev) => ({
      ...prev,
      blackboxFile: file,
      blackboxFileName: file ? file.name : prev.blackboxFileName,
    }));
  };

  const handleOpenAccidentModal = async (contract) => {
    if (!contract) return;

    // If summary lacks full accident data (e.g., only filename), hydrate from detail API
    const hasReport = !!contract.accidentReport;
    const report = contract.accidentReport || {};
    const hasPlayableRef = !!(report.blackboxGcsObjectName || report.blackboxFileUrl || (report.blackboxFile instanceof File));
    const filenameOnly = !!(report.blackboxFileName && !hasPlayableRef);
    const needsHydration = !!(contract.accidentReported && (!hasReport || filenameOnly));

    if (needsHydration) {
      try {
        // Prefer dedicated accident detail endpoint if BE supports it
        let merged = null;
        try {
          const detail = await fetchRentalAccidentDetail(contract.rentalId);
          if (detail && detail.accidentReport) {
            merged = { ...contract, accidentReported: true, accidentReport: detail.accidentReport };
          }
        } catch (_) {
          // ignore and fallback to full rental fetch
        }
        if (!merged) {
          const full = await fetchRentalById(contract.rentalId);
          if (full && (full.accidentReported || contract.accidentReported) && full.accidentReport) {
            merged = full;
          }
        }
        if (merged) {
          setAccidentTarget(merged);
          setShowAccidentInfoModal(true);
          return;
        }
      } catch (e) {
        // ignore fetch errors; fall through to best-effort display
      }
    }

    if (contract.accidentReported && hasReport) {
      setAccidentTarget(contract);
      setShowAccidentInfoModal(true);
      return;
    }

    const prefill = contract.accidentReport || {};
    setAccidentTarget(contract);
    setAccidentForm({
      accidentDate: prefill.accidentDate || "",
      accidentHour: prefill.accidentHour || "00",
      accidentMinute: prefill.accidentMinute || "00",
      accidentSecond: prefill.accidentSecond || "00",
      handlerName: prefill.handlerName || "",
      blackboxFile: prefill.blackboxFile || null,
      blackboxFileName: prefill.blackboxFileName || "",
    });
    setFileInputKey((k) => k + 1);
    setShowAccidentModal(true);
  };

  const handleCloseAccidentModal = () => {
    setShowAccidentModal(false);
    setAccidentTarget(null);
    setAccidentForm({ ...DEFAULT_FORM });
    setFileInputKey((k) => k + 1);
    setUploadState({ status: "idle", percent: 0, error: "", cancel: null, mode: "" });
  };

  const handleCloseAccidentInfoModal = () => {
    setShowAccidentInfoModal(false);
    setAccidentTarget(null);
  };

  const buildAccidentMemo = (currentMemo, note) => {
    if (!currentMemo) return note;
    if (currentMemo.includes("사고 접수")) return currentMemo;
    return `${currentMemo} / ${note}`;
  };

  const handleAccidentSubmit = async (event) => {
    event.preventDefault();
    if (!accidentTarget) return;

    const now = new Date();
    const memoNote = `사고 접수됨 (${formatDisplayDate(now)})`;
    const { accidentDate, accidentHour, accidentMinute, accidentSecond, handlerName, blackboxFile, blackboxFileName } = accidentForm;
    const accidentDateTime = accidentDate ? `${accidentDate}T${accidentHour}:${accidentMinute}:${accidentSecond}` : "";
    const accidentDisplayTime = accidentDate ? `${accidentDate.replace(/-/g, ".")} ${accidentHour}:${accidentMinute}:${accidentSecond}` : "";

    const updatedReport = {
      accidentDate,
      accidentHour,
      accidentMinute,
      accidentSecond,
      handlerName,
      accidentDateTime,
      accidentDisplayTime,
      blackboxFile,
      blackboxFileName,
      recordedAt: now.toISOString(),
    };

    try {
      if (blackboxFile) {
        const typeOk = isFileTypeAllowed(blackboxFile);
        if (!typeOk) {
          emitToast("허용되지 않는 파일 형식입니다.", "warning");
          return;
        }
        const folder = `rentals/${accidentTarget.rentalId}/blackbox`;
        const onProgress = (p) => setUploadState((s) => ({ ...s, percent: p.percent }));
        const { mode, cancel, promise } = uploadOneCancelable(blackboxFile, { folder, label: "blackbox", onProgress });
        setUploadState({ status: "uploading", percent: 0, error: "", cancel, mode });
        const result = await promise;
        setUploadState({ status: "success", percent: 100, error: "", cancel: null, mode });
        if (result) {
          updatedReport.blackboxFileUrl = result.url || "";
          updatedReport.blackboxGcsObjectName = result.objectName || "";
        }
      }

      await updateRental(accidentTarget.rentalId, {
        accidentReported: true,
        accidentReport: updatedReport,
        memo: buildAccidentMemo(accidentTarget.memo || "", memoNote),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.rentalId === accidentTarget.rentalId
            ? {
                ...item,
                accidentReported: true,
                memo: buildAccidentMemo(item.memo || "", memoNote),
                accidentReport: updatedReport,
              }
            : item
        )
      );
      setSelectedContract((prev) => {
        if (!prev || prev.rentalId !== accidentTarget.rentalId) return prev;
        return {
          ...prev,
          accidentReported: true,
          memo: buildAccidentMemo(prev.memo || "", memoNote),
          accidentReport: updatedReport,
        };
      });
      emitToast("사고 등록이 저장되었습니다.", "success");
      handleCloseAccidentModal();
    } catch (e) {
      console.error("Failed to submit accident info", e);
      const isAbort = String((e && e.message) || "").toLowerCase().includes("abort");
      if (isAbort) {
        setUploadState((s) => ({ ...s, status: "idle" }));
        return;
      }
      setUploadState((s) => ({ ...s, status: "error", error: e?.message || "업로드/저장 실패" }));
      emitToast("사고 등록 저장 실패", "error");
    }
  };

  return {
    showAccidentModal,
    showAccidentInfoModal,
    accidentTarget,
    accidentForm,
    fileInputKey,
    uploadState,
    handleAccidentInputChange,
    handleAccidentFileChange,
    handleOpenAccidentModal,
    handleCloseAccidentModal,
    handleCloseAccidentInfoModal,
    handleAccidentSubmit,
  };
}
