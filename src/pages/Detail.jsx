import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets } from "../data/assets";
import { rentals } from "../data/rentals";
import AssetForm from "../components/forms/AssetForm";
import RentalForm from "../components/forms/RentalForm";
import IssueForm from "../components/forms/IssueForm";

export default function Detail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const t = (type || "").toLowerCase();
  const [editing, setEditing] = useState(false);

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

      <div className="sticky-header">
        <div className="view-toggle" role="toolbar" aria-label="Detail actions">
          <button type="button" className="toggle-btn" onClick={() => navigate(-1)}>Back</button>
          {!editing ? (
            <button type="button" className="toggle-btn" onClick={() => setEditing(true)}>Edit</button>
          ) : (
            // Save submits the form rendered below via the 'form' attribute
            <button type="submit" className="toggle-btn is-active" form="detail-form">Save</button>
          )}
        </div>
      </div>

      <div className="page-scroll">
        {t === "asset" && (
          <AssetForm
            key={`asset-${editing}-${data.id}`}
            initial={data}
            readOnly={!editing}
            formId="detail-form"
            showSubmit={false}
            onSubmit={(form) => {
              try {
                const edits = JSON.parse(localStorage.getItem("assetEdits") || "{}");
                edits[String(data.id)] = { ...data, ...form };
                localStorage.setItem("assetEdits", JSON.stringify(edits));
              } catch {}
              setEditing(false);
            }}
          />
        )}
        {t === "rental" && (
          <RentalForm
            key={`rental-${editing}-${data.rental_id}`}
            initial={data}
            readOnly={!editing}
            formId="detail-form"
            showSubmit={false}
            onSubmit={(form) => {
              try {
                const edits = JSON.parse(localStorage.getItem("rentalEdits") || "{}");
                edits[String(data.rental_id)] = { ...data, ...form };
                localStorage.setItem("rentalEdits", JSON.stringify(edits));
              } catch {}
              setEditing(false);
            }}
          />
        )}
        {t === "issue" && (
          <IssueForm
            key={`issue-${editing}-${data.rental_id}`}
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
            readOnly={!editing}
            formId="detail-form"
            showSubmit={false}
            onSubmit={(form) => {
              try {
                const edits = JSON.parse(localStorage.getItem("issueEdits") || "{}");
                edits[String(data.rental_id)] = form;
                localStorage.setItem("issueEdits", JSON.stringify(edits));
              } catch {}
              setEditing(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
