import { useCallback } from "react";
import { useConfirm } from "../contexts/ConfirmContext";
import { fetchRentals, fetchRentalsSummary, updateRental, saveAsset, createRental, resolveVehicleRentals } from "../api";
import { uploadMany } from "../utils/uploadHelpers";
import { emitToast } from "../utils/toast";

// Extracts management stage transitions and the rental-create follow-up flow.
// Requires several state setters so it can coordinate UI with API work.
export default function useManagementStage(options) {
  const confirm = useConfirm();
  const {
    setRows,
    setStageSaving,
    withManagementStage,
    getManagementStage,
    // Rental creation flow controls
    setShowRentalModal,
    setPendingStageAssetId,
    setPendingNextStage,
    setRentalFormInitial,
  } = options || {};

  const handleManagementStageChange = useCallback(async (asset, nextStage) => {
    if (!asset?.id || !nextStage) return;
    const assetId = asset.id;
    const previousStage = getManagementStage ? getManagementStage(asset) : asset?.managementStage;
    if (previousStage === nextStage) return;

    // Guardrails based on rentals consistency
    try {
      const now = new Date();
      let allRentalsForVin = [];
      try {
          const vinData = await resolveVehicleRentals(asset.vin);
          if (Array.isArray(vinData)) {
              allRentalsForVin = vinData;
          } else if (vinData && typeof vinData === 'object') {
              if (vinData.current) allRentalsForVin.push(vinData.current);
              if (Array.isArray(vinData.future)) allRentalsForVin.push(...vinData.future);
              if (Array.isArray(vinData.history)) allRentalsForVin.push(...vinData.history);
          }
      } catch (e) {
          console.warn("Failed to fetch rentals for VIN using resolveVehicleRentals", e);
          // Fallback to fetchRentals if resolveVehicleRentals fails
          let rentals = await fetchRentals();
          const list = Array.isArray(rentals) ? rentals : [];

      }

      const openForVin = allRentalsForVin.filter((r) => {
        const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
        return !(returnedAt && now >= returnedAt) && r?.contractStatus !== "완료";
      });

      const startOf = (r) => (r?.rentalPeriod?.start ? new Date(r.rentalPeriod.start) : null);
      const endOf = (r) => (r?.rentalPeriod?.end ? new Date(r.rentalPeriod.end) : null);
      const isActive = (r) => {
        const s = startOf(r); const e = endOf(r);
        return s && e ? now >= s && now <= e : false;
      };
      const isOverdue = (r) => {
        const e = endOf(r); const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
        return !returnedAt && e ? now > e : false;
      };
      const isReserved = (r) => {
        const s = startOf(r); const returnedAt = r?.returnedAt ? new Date(r.returnedAt) : null;
        return !returnedAt && s ? now < s : false;
      };

      const formatDate = (d) => {
        if (!d) return "";
        const date = new Date(d);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${mm}.${dd}`;
      };

      if (nextStage === "대여가능") {
        if (openForVin.length > 0) {
          const first = openForVin[0];
          const renter = first.renterName || "알 수 없음";
          const startStr = formatDate(first.rentalPeriod?.start);
          const endStr = formatDate(first.rentalPeriod?.end);
          const period = startStr && endStr ? `(${startStr}~${endStr})` : "";
          const msg = `${renter} 님의 대여 계약${period}이 진행 중입니다.\n반납 처리 후 대여가능으로 변경하시겠습니까?`;
          
          const ok = await confirm({ title: "관리단계 변경", message: msg, confirmText: "반납 및 변경", cancelText: "취소" });
          if (!ok) return;
          const ts = new Date().toISOString();
          try {
            await Promise.all(openForVin.map((r) => updateRental(r.rentalId, { returnedAt: ts }).catch(() => null)));
          } catch {}
        }
      }

      if ((nextStage === "대여중" || nextStage === "예약중")) {
        const hasOpen = openForVin.some((r) => isActive(r) || isOverdue(r) || isReserved(r) || r?.reportedStolen);
        if (!hasOpen) {
          if (previousStage === "대여가능") {
            const ok = await confirm({ title: "관리단계 변경", message: "현재 유효한 계약이 없습니다.\n신규로 대여 계약을 입력하시겠습니까?", confirmText: "계약 생성", cancelText: "취소" });
            if (!ok) return;
          }
          if (setPendingStageAssetId) setPendingStageAssetId(assetId);
          if (setPendingNextStage) setPendingNextStage(nextStage);
          if (setRentalFormInitial) setRentalFormInitial({ vin: asset.vin || "", plate: asset.plate || "", vehicleType: asset.vehicleType || "" });
          if (setShowRentalModal) setShowRentalModal(true);
          return; // postpone stage change until rental is created
        }
      }
    } catch (e) {
      console.warn("Stage-guard rentals check failed", e);
    }



    if (setRows && withManagementStage) {
      setRows((prev) => prev.map((row) => (row.id === assetId ? withManagementStage({ ...row, managementStage: nextStage }) : row)));
    }
    if (setStageSaving) setStageSaving((prev) => ({ ...prev, [assetId]: true }));

    try {
      const response = await saveAsset(assetId, { managementStage: nextStage });
      if (setRows && withManagementStage) {
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== assetId) return row;
            const updatedStage = response?.managementStage && withManagementStage ? response.managementStage : nextStage;
            const merged = { ...row, ...(response || {}), managementStage: updatedStage };
            return withManagementStage(merged);
          })
        );
      }
    } catch (error) {
      console.error("Failed to update management stage", error);
      emitToast("관리단계를 저장하지 못했습니다. 다시 시도해주세요.", "error");
      if (setRows && withManagementStage) {
        setRows((prev) => prev.map((row) => (row.id === assetId ? withManagementStage({ ...row, managementStage: previousStage }) : row)));
      }
    } finally {
      if (setStageSaving) {
        setStageSaving((prev) => { const next = { ...prev }; delete next[assetId]; return next; });
      }
    }
  }, [setRows, setStageSaving, withManagementStage, getManagementStage, setShowRentalModal, setPendingStageAssetId, setPendingNextStage, setRentalFormInitial]);

  const handleRentalCreateSubmit = useCallback(async (data, ctx) => {
    const { pendingStageAssetId, pendingNextStage, setShowRentalModalRef, setPendingStageAssetIdRef, setPendingNextStageRef } = ctx || {};
    const { contractFile, driverLicenseFile, ...rest } = data || {};
    const toArray = (val) => (Array.isArray(val) ? val : (val ? [val] : []));
    const contractList = toArray(contractFile);
    const licenseList = toArray(driverLicenseFile);

    try {
      // Upload documents using consolidated helpers
      const [contractRes, licenseRes] = await Promise.all([
        uploadMany(contractList, { folder: `rentals/contracts`, label: "contracts" }),
        uploadMany(licenseList, { folder: `rentals/licenses`, label: "licenses" }),
      ]);

      const objectNames = [...(contractRes?.objects || []), ...(licenseRes?.objects || [])];
      const rentalPayload = {
        ...rest,
        contractFiles: contractList.map((f) => ({ name: f.name })),
        driverLicenseFiles: licenseList.map((f) => ({ name: f.name })),
        uploadObjectNames: objectNames,
      };

      const created = await createRental(rentalPayload);
      // After creating rental, update the asset stage if needed
      if (pendingStageAssetId && pendingNextStage) {
        if (setStageSaving) setStageSaving((prev) => ({ ...prev, [pendingStageAssetId]: true }));
        try {
          const response = await saveAsset(pendingStageAssetId, { managementStage: pendingNextStage });
          if (setRows && withManagementStage) {
            setRows((prev) => prev.map((row) => {
              if (row.id !== pendingStageAssetId) return row;
              const updatedStage = response?.managementStage || pendingNextStage;
              const merged = { ...row, ...(response || {}), managementStage: updatedStage };
              return withManagementStage(merged);
            }));
          }
        } catch (e) {
          console.error("Failed to save management stage after rental create", e);
          emitToast("관리단계를 저장하지 못했습니다. 다시 시도해주세요.", "error");
        } finally {
          if (setStageSaving) setStageSaving((prev) => { const n = { ...prev }; delete n[pendingStageAssetId]; return n; });
        }
      }
    } finally {
      // always close modal and clear pending state
      try { setShowRentalModalRef ? setShowRentalModalRef(false) : (setShowRentalModal && setShowRentalModal(false)); } catch {}
      try { setPendingStageAssetIdRef ? setPendingStageAssetIdRef(null) : (setPendingStageAssetId && setPendingStageAssetId(null)); } catch {}
      try { setPendingNextStageRef ? setPendingNextStageRef(null) : (setPendingNextStage && setPendingNextStage(null)); } catch {}
    }
  }, [setRows, setStageSaving, withManagementStage, setShowRentalModal, setPendingStageAssetId, setPendingNextStage]);

  return { handleManagementStageChange, handleRentalCreateSubmit };
}
