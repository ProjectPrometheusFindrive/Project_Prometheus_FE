import { useCallback, useState } from "react";
import { fetchAssetInsurance, saveAsset } from "../api";

// Encapsulates insurance modal state and async flows.
// Caller supplies an onSaved(id, patch, response) to merge table rows.
export default function useInsuranceModal({ onSaved } = {}) {
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insuranceAsset, setInsuranceAsset] = useState(null);
  const [insuranceReadOnly, setInsuranceReadOnly] = useState(false);

  const openInsuranceModal = useCallback((asset) => {
    setInsuranceReadOnly(false);
    setInsuranceAsset(asset);
    setShowInsuranceModal(true);
    if (asset?.id) {
      (async () => {
        try {
          const detail = await fetchAssetInsurance(asset.id);
          if (detail) setInsuranceAsset((prev) => ({ ...(prev || {}), ...detail }));
        } catch (e) {
          console.error("Failed to load insurance detail", e);
        }
      })();
    }
  }, []);

  const openInsuranceModalReadOnly = useCallback((asset) => {
    setInsuranceReadOnly(true);
    setInsuranceAsset(asset);
    setShowInsuranceModal(true);
    if (asset?.id) {
      (async () => {
        try {
          const detail = await fetchAssetInsurance(asset.id);
          if (detail) setInsuranceAsset((prev) => ({ ...(prev || {}), ...detail }));
        } catch (e) {
          console.error("Failed to load insurance detail", e);
        }
      })();
    }
  }, []);

  const closeInsuranceModal = useCallback(() => {
    setInsuranceAsset(null);
    setShowInsuranceModal(false);
    setInsuranceReadOnly(false);
  }, []);

  const handleInsuranceSubmit = useCallback(async (patch) => {
    const id = insuranceAsset?.id;
    if (!id) return;
    try {
      const resp = await saveAsset(id, patch || {});
      if (typeof onSaved === "function") {
        try { onSaved(id, patch || {}, resp); } catch {}
      }
      closeInsuranceModal();
      return resp;
    } catch (e) {
      console.error("Failed to save insurance", e);
      throw e;
    }
  }, [insuranceAsset?.id, onSaved, closeInsuranceModal]);

  return {
    // state
    showInsuranceModal,
    insuranceAsset,
    insuranceReadOnly,
    // actions
    openInsuranceModal,
    openInsuranceModalReadOnly,
    closeInsuranceModal,
    handleInsuranceSubmit,
    setInsuranceAsset, // expose for advanced use if needed
  };
}

