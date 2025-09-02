import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { assets } from "../data/assets";
import { rentals } from "../data/rentals";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";

export default function Detail() {
  const { type, id } = useParams();
  const t = (type || "").toLowerCase();

  const data = useMemo(() => {
    if (t === "asset") {
      return assets.find((a) => String(a.id) === String(id));
    }
    if (t === "rental" || t === "issue") {
      const rid = Number(id);
      return rentals.find((r) => Number(r.rental_id) === rid);
    }
    return null;
  }, [t, id]);

  if (!data) {
    return (
      <div className="page">
        <h1>Details</h1>
        <div className="empty">No data found.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Details</h1>
      <div className="page-scroll">
        {t === "asset" && (
          <AssetForm initial={data} readOnly />
        )}
        {t === "rental" && (
          <RentalForm initial={data} readOnly />
        )}
        {t === "issue" && (
          <IssueForm
            initial={{
              vin: data.vin,
              type: data.reported_stolen
                ? "stolen"
                : new Date() > new Date(data.rental_period.end)
                ? "overdue"
                : "other",
              severity: data.reported_stolen ? "high" : "medium",
              description: `From rental #${data.rental_id}`,
            }}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

