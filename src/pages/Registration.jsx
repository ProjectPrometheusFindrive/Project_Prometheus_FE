import React, { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";

export default function Registration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = (searchParams.get("type") || "asset").toLowerCase();
  const mode = useMemo(() => (typeParam === "rental" || typeParam === "issue" ? typeParam : "asset"), [typeParam]);
  const navigate = useNavigate();

  useEffect(() => {
    // Normalize invalid values to a valid one
    if (typeParam !== mode) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("type", mode);
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const changeMode = (next) => {
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("type", next);
      return sp;
    });
  };

  const handleAssetSubmit = (data) => {
    try {
      const arr = JSON.parse(localStorage.getItem("assetDrafts") || "[]");
      arr.push({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem("assetDrafts", JSON.stringify(arr));
    } catch {}
    navigate("/assets");
  };

  const handleRentalSubmit = (data) => {
    try {
      const arr = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
      arr.push({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem("rentalDrafts", JSON.stringify(arr));
    } catch {}
    navigate("/rentals");
  };

  const handleIssueSubmit = (data) => {
    try {
      const arr = JSON.parse(localStorage.getItem("issueDrafts") || "[]");
      arr.push({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem("issueDrafts", JSON.stringify(arr));
    } catch {}
    navigate("/returns");
  };

  return (
    <div className="page">
      <h1>Registration</h1>

      <div className="sticky-header">
        <div className="view-toggle" role="tablist" aria-label="Registration type">
          <button type="button" className={`toggle-btn ${mode === "asset" ? "is-active" : ""}`} onClick={() => changeMode("asset")} role="tab" aria-selected={mode === "asset"}>
            Asset
          </button>
          <button type="button" className={`toggle-btn ${mode === "rental" ? "is-active" : ""}`} onClick={() => changeMode("rental")} role="tab" aria-selected={mode === "rental"}>
            Rental
          </button>
          <button type="button" className={`toggle-btn ${mode === "issue" ? "is-active" : ""}`} onClick={() => changeMode("issue")} role="tab" aria-selected={mode === "issue"}>
            Issue
          </button>
        </div>
      </div>
      <div className="page-scroll">
        {mode === "asset" && <AssetForm onSubmit={handleAssetSubmit} />}
        {mode === "rental" && <RentalForm onSubmit={handleRentalSubmit} />}
        {mode === "issue" && <IssueForm onSubmit={handleIssueSubmit} />}
      </div>
    </div>
  );
}
