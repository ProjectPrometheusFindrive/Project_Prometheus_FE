import { useState } from "react";
import { fetchRentalById, updateRental } from "../api";
import { ALLOWED_MIME_TYPES } from "../constants/uploads";
import { uploadOneCancelable } from "../utils/uploadHelpers";
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

    if (contract.accidentReported && !contract.accidentReport) {
      try {
        const full = await fetchRentalById(contract.rentalId);
        if (full && (full.accidentReported || contract.accidentReported) && full.accidentReport) {
          setAccidentTarget(full);
          setShowAccidentInfoModal(true);
          return;
        }
      } catch (e) {
        // ignore
      }
    }

    if (contract.accidentReported && contract.accidentReport) {
      setAccidentTarget(contract);
      setShowAccidentInfoModal(true);
      return;
    }

    const report = contract.accidentReport || {};
    setAccidentTarget(contract);
    setAccidentForm({
      accidentDate: report.accidentDate || "",
      accidentHour: report.accidentHour || "00",
      accidentMinute: report.accidentMinute || "00",
      accidentSecond: report.accidentSecond || "00",
      handlerName: report.handlerName || "",
      blackboxFile: report.blackboxFile || null,
      blackboxFileName: report.blackboxFileName || "",
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
    const memoNote = `사고 접수됨 (${now.toLocaleDateString()})`;
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
        const typeOk = !blackboxFile.type || ALLOWED_MIME_TYPES.includes(blackboxFile.type);
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
