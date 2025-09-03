import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalContracts() {
  const [mode, setMode] = useState("table");

  const rows = useMemo(() => {
    const now = new Date();
    return rentals.map((r) => {
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
  }, []);

  return (
    <div className="page">
      <h1>렌탈 계약 현황</h1>

      <div className="sticky-header">
        <div className="view-toggle" role="tablist" aria-label="View toggle">
          <button
            type="button"
            role="tab"
            className={`toggle-btn ${mode === "table" ? "is-active" : ""}`}
            onClick={() => setMode("table")}
            aria-selected={mode === "table"}
          >
            Table
          </button>
          <button
            type="button"
            role="tab"
            className={`toggle-btn ${mode === "map" ? "is-active" : ""}`}
            onClick={() => setMode("map")}
            aria-selected={mode === "map"}
          >
            Map
          </button>
        </div>
      </div>

      <div className="page-scroll">
        {mode === "table" && (
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
                      {r.rental_period?.start ? new Date(r.rental_period.start).toLocaleDateString() : "-"} ~ {" "}
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
        )}

        {mode === "map" && (
          <div className="map-view">
            <div className="legend">
              <span className="legend__item"><span className="marker marker--active">A</span> Active</span>
              <span className="legend__item"><span className="marker marker--overdue">O</span> Overdue</span>
              <span className="legend__item"><span className="marker marker--stolen">S</span> Stolen</span>
              <span className="legend__item"><span className="marker marker--car">C</span> Other</span>
            </div>
            <RentalsMap rentals={rentals} />
          </div>
        )}
      </div>
    </div>
  );
}
