import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rentals } from "../data/rentals";
import RentalForm from "../components/forms/RentalForm";

export default function RentalContracts() {
  const [items, setItems] = useState(() => rentals.map((r) => ({ ...r })));
  const [showCreate, setShowCreate] = useState(false);

  // Load drafts from localStorage and merge once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rentalDrafts");
      if (!raw) return;
      const drafts = JSON.parse(raw);
      if (!Array.isArray(drafts)) return;
      setItems((prev) => {
        const existingIds = new Set(prev.map((x) => String(x.rental_id)));
        const toAdd = drafts
          .filter((d) => d && d.rental_id && !existingIds.has(String(d.rental_id)))
          .map((d) => ({
            ...d,
            rental_period: d.rental_period || { start: d.start || "", end: d.end || "" },
          }));
        if (toAdd.length === 0) return prev;
        return [...prev, ...toAdd];
      });
    } catch {}
  }, []);

  const rows = useMemo(() => {
    const now = new Date();
    return items.map((r) => {
      const start = r?.rental_period?.start ? new Date(r.rental_period.start) : null;
      const end = r?.rental_period?.end ? new Date(r.rental_period.end) : null;
      const isActive = start && end ? now >= start && now <= end : false;
      const isOverdue = end ? now > end : false;
      const isStolen = Boolean(r.reported_stolen);
      const overdueDays = end ? Math.max(0, Math.floor((now - end) / (1000 * 60 * 60 * 24))) : 0;
      let statusText = "-";
      let statusClass = "";
      if (isStolen) {
        statusText = "Stolen suspected";
        statusClass = "badge--maintenance";
      } else if (isOverdue) {
        statusText = `Overdue ${overdueDays}d`;
        statusClass = "badge--rented";
      } else if (isActive) {
        statusText = "Active";
        statusClass = "badge--rented";
      }
      return { ...r, isActive, isOverdue, isStolen, overdueDays, statusText, statusClass };
    });
  }, [items]);

  const nextRentalId = () => {
    let max = 0;
    items.forEach((r) => {
      const n = parseInt(String(r.rental_id || 0), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    });
    return max + 1;
  };

  const handleCreateSubmit = (data) => {
    const { contract_file, driver_license_file, ...rest } = data || {};
    const rental_id = rest.rental_id && String(rest.rental_id).trim() ? rest.rental_id : nextRentalId();
    const normalized = {
      ...rest,
      rental_id,
      rental_period: { start: rest.start || "", end: rest.end || "" },
    };
    setItems((prev) => [normalized, ...prev]);
    try {
      const arr = JSON.parse(localStorage.getItem("rentalDrafts") || "[]");
      arr.push({ ...rest, rental_id, createdAt: new Date().toISOString() });
      localStorage.setItem("rentalDrafts", JSON.stringify(arr));
    } catch {}
    setShowCreate(false);
  };

  return (
    <div className="page">
      <h1>Rental Contracts</h1>
      <div className="page-scroll">
        <div className="asset-toolbar" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1 }} />
          <button type="button" className="form-button" onClick={() => setShowCreate(true)}>
            계약 등록
          </button>
        </div>

        {showCreate && (
          <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginTop: 0, marginBottom: 12 }}>대여 계약 등록</h2>
              <>
                <RentalForm
                  formId="rental-create"
                  initial={{ rental_id: nextRentalId() }}
                  onSubmit={handleCreateSubmit}
                  showSubmit={false}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="submit" className="form-button" form="rental-create">저장</button>
                  <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setShowCreate(false)}>닫기</button>
                </div>
              </>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table className="asset-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Rental ID</th>
                <th>VIN</th>
                <th>Renter</th>
                <th>Contact</th>
                <th>Period</th>
                <th>Insurance</th>
                <th>Current Loc</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rental_id}>
                  <td>{r.statusText !== "-" ? <span className={`badge ${r.statusClass}`}>{r.statusText}</span> : "-"}</td>
                  <td>
                    <Link to={`/detail/rental/${r.rental_id}`}>{r.rental_id}</Link>
                  </td>
                  <td>{r.vin}</td>
                  <td>{r.renter_name}</td>
                  <td>{r.contact_number}</td>
                  <td>
                    {r.rental_period?.start ? new Date(r.rental_period.start).toLocaleDateString() : "-"} ~{" "}
                    {r.rental_period?.end ? new Date(r.rental_period.end).toLocaleDateString() : "-"}
                  </td>
                  <td>{r.insurance_name || "-"}</td>
                  <td>
                    {r.current_location
                      ? `${Number(r.current_location.lat).toFixed(4)}, ${Number(r.current_location.lng).toFixed(4)}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
