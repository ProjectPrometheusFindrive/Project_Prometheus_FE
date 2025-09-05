import React, { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FaCar } from "react-icons/fa";
import { FiAlertTriangle } from "react-icons/fi";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalsMapPage() {
    const [searchParams] = useSearchParams();
    const focusVin = searchParams.get("vin") || "";
    const [filters, setFilters] = useState({
        active: true,
        overdue: true,
        stolen: true,
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
                            <span className="marker marker--rented">
                                <FaCar aria-hidden className="map-icon-svg" />
                            </span>
                            <span className="legend__label">정상</span>
                        </button>

                        <button
                            type="button"
                            className={`legend__item${filters.overdue ? "" : " is-off"}`}
                            onClick={() => toggle("overdue")}
                            aria-pressed={filters.overdue}
                            title="Toggle Overdue"
                        >
                            <span className="marker marker--overdue">
                                <FaCar aria-hidden className="map-icon-svg" />
                            </span>
                            <span className="legend__label">반납 지연</span>
                        </button>

                        <button
                            type="button"
                            className={`legend__item${filters.stolen ? "" : " is-off"}`}
                            onClick={() => toggle("stolen")}
                            aria-pressed={filters.stolen}
                            title="Toggle Suspicious"
                        >
                            <span className="marker marker--suspicious">
                                <FiAlertTriangle aria-hidden className="map-icon-svg" />
                            </span>
                            <span className="legend__label">도난 의심</span>
                        </button>

                        <button
                            type="button"
                            className={`legend__item legend__item--geo${filters.geofence ? "" : " is-off"}`}
                            onClick={() => toggle("geofence")}
                            aria-pressed={filters.geofence}
                            title="Toggle Geofence"
                        >
                            <span className="marker marker--geo" aria-hidden />
                            <span className="legend__label">지오펜스</span>
                        </button>
                    </div>
                    <RentalsMap rentals={rentals} filters={filters} focusVin={focusVin} />
                </div>
            </div>
        </div>
    );
}
