import React, { useMemo } from "react";
import { rentals } from "../data/rentals";
import { assets } from "../data/assets";

export default function ProblemVehicles() {
  const assetByVin = useMemo(() => {
    const m = new Map();
    assets.forEach((a) => {
      if (a.vin) m.set(a.vin, a);
    });
    return m;
  }, []);

  const today = new Date();

  const problems = useMemo(() => {
    return rentals
      .map((r) => {
        const end = new Date(r.rental_period.end);
        const overdueDays = Math.floor((today - end) / (1000 * 60 * 60 * 24));
        const isOverdue = overdueDays > 0;
        const isStolen = Boolean(r.reported_stolen);
        if (!(isOverdue || isStolen)) return null;
        const a = assetByVin.get(r.vin);
        return {
          rental_id: r.rental_id,
          vin: r.vin,
          renter_name: r.renter_name,
          contact_number: r.contact_number,
          rental_period: r.rental_period,
          insurance_name: r.insurance_name,
          current_location: r.current_location,
          issue:
            isStolen ? "도난 의심" : `반납 지연 (${overdueDays}일)`,
          asset: a || null,
        };
      })
      .filter(Boolean);
  }, [assetByVin]);

  return (
    <div className="page">
      <h1>반납 지연/도난 현황</h1>

      <div className="table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Rental ID</th>
              <th>VIN</th>
              <th>Make/Model</th>
              <th>Year</th>
              <th>Fuel</th>
              <th>Renter</th>
              <th>Contact</th>
              <th>Period</th>
              <th>Insurance</th>
              <th>Current Loc</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.rental_id}>
                <td>
                  <span className={`badge ${p.issue.includes("도난") ? "badge--maintenance" : "badge--rented"}`}>
                    {p.issue}
                  </span>
                </td>
                <td>{p.rental_id}</td>
                <td>{p.vin}</td>
                <td>
                  {p.asset ? `${p.asset.make} ${p.asset.model}` : "-"}
                </td>
                <td>{p.asset ? p.asset.year : "-"}</td>
                <td>{p.asset ? p.asset.fuelType : "-"}</td>
                <td>{p.renter_name}</td>
                <td>{p.contact_number}</td>
                <td>
                  {new Date(p.rental_period.start).toLocaleDateString()} ~
                  {" "}
                  {new Date(p.rental_period.end).toLocaleDateString()}
                </td>
                <td>{p.insurance_name}</td>
                <td>
                  {p.current_location
                    ? `${p.current_location.lat.toFixed(4)}, ${p.current_location.lng.toFixed(4)}`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {problems.length === 0 && (
        <div className="empty">문제 차량이 없습니다.</div>
      )}
    </div>
  );
}
