import React, { useState, useCallback } from "react";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalsMapPage() {
  // Filter state: default shows all categories
  const [filters, setFilters] = useState({
    active: true,
    overdue: true,
    stolen: true,
    other: true,
    geofence: true,
  });

  const toggle = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="page">
      <h1>Rental Map</h1>
      <div className="page-scroll">
        <div className="map-view">
          <div className="legend" role="group" aria-label="Marker filters">
            <button
              type="button"
              className={`legend__item${filters.active ? "" : " is-off"}`}
              onClick={() => toggle("active")}
              aria-pressed={filters.active}
              title="Toggle Active"
            >
              <span className="marker marker--active">🚗</span>
              <span className="legend__label">Active</span>
            </button>
            <button
              type="button"
              className={`legend__item${filters.overdue ? "" : " is-off"}`}
              onClick={() => toggle("overdue")}
              aria-pressed={filters.overdue}
              title="Toggle Overdue"
            >
              <span className="marker marker--overdue">🚗</span>
              <span className="legend__label">Overdue</span>
            </button>
            <button
              type="button"
              className={`legend__item${filters.stolen ? "" : " is-off"}`}
              onClick={() => toggle("stolen")}
              aria-pressed={filters.stolen}
              title="Toggle Issue"
            >
              <span className="marker marker--stolen">🚗</span>
              <span className="legend__label">Issue</span>
            </button>
            <button
              type="button"
              className={`legend__item${filters.other ? "" : " is-off"}`}
              onClick={() => toggle("other")}
              aria-pressed={filters.other}
              title="Toggle Other"
            >
              <span className="marker marker--car">🚗</span>
              <span className="legend__label">Other</span>
            </button>
            <button
              type="button"
              className={`legend__item legend__item--geo${filters.geofence ? "" : " is-off"}`}
              onClick={() => toggle("geofence")}
              aria-pressed={filters.geofence}
              title="Toggle Geofence"
            >
              <span className="marker marker--geo">🔒</span>
              <span className="legend__label">Geofence</span>
            </button>
          </div>
          <RentalsMap rentals={rentals} filters={filters} />
        </div>
      </div>
    </div>
  );
}
