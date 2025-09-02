import React, { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalContracts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const viewParam = searchParams.get("view");
    const view = viewParam === "table" ? "table" : "map";
    const data = rentals;

    const columns = [
        { key: "rental_id", label: "Rental ID" },
        { key: "vin", label: "VIN" },
        { key: "renter_name", label: "Renter" },
        { key: "contact_number", label: "Contact" },
        { key: "address", label: "Address" },
        { key: "rental_period", label: "Period" },
        { key: "insurance_name", label: "Insurance" },
        { key: "rental_location", label: "Rent Loc" },
        { key: "return_location", label: "Return Loc" },
        { key: "current_location", label: "Current Loc" },
    ];

    const rows = useMemo(() => {
        return data.map((r) => ({
            ...r,
            rental_period_fmt: `${new Date(r.rental_period.start).toLocaleDateString()} ~ ${new Date(r.rental_period.end).toLocaleDateString()}`,
            rental_location_fmt: r.rental_location ? `${r.rental_location.lat.toFixed(4)}, ${r.rental_location.lng.toFixed(4)}` : "-",
            return_location_fmt: r.return_location ? `${r.return_location.lat.toFixed(4)}, ${r.return_location.lng.toFixed(4)}` : "-",
            current_location_fmt: r.current_location ? `${r.current_location.lat.toFixed(4)}, ${r.current_location.lng.toFixed(4)}` : "-",
        }));
    }, [data]);

    const setView = (next) =>
        setSearchParams((prev) => {
            const sp = new URLSearchParams(prev);
            sp.set("view", next);
            return sp;
        });

    return (
        <div className="page">
            <h1>Rental Contracts</h1>

            <div className="sticky-header">
                <div className="view-toggle" role="tablist" aria-label="View toggle">
                    <button type="button" className={`toggle-btn ${view === "table" ? "is-active" : ""}`} onClick={() => setView("table")} role="tab" aria-selected={view === "table"}>
                        Table
                    </button>
                    <button type="button" className={`toggle-btn ${view === "map" ? "is-active" : ""}`} onClick={() => setView("map")} role="tab" aria-selected={view === "map"}>
                        Map
                    </button>
                </div>
            </div>

            <div className="page-scroll">
                {view === "table" ? (
                    <div className="table-wrap">
                        <table className="asset-table">
                            <thead>
                                <tr>
                                    {columns.map((c) => (
                                        <th key={c.key}>{c.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.rental_id}>
                                    <td>
                                        <Link to={`/detail/rental/${r.rental_id}`}>{r.rental_id}</Link>
                                    </td>
                                        <td>{r.vin}</td>
                                        <td>{r.renter_name}</td>
                                        <td>{r.contact_number}</td>
                                        <td>{r.address}</td>
                                        <td>{r.rental_period_fmt}</td>
                                        <td>{r.insurance_name}</td>
                                        <td>{r.rental_location_fmt}</td>
                                        <td>{r.return_location_fmt}</td>
                                        <td>{r.current_location_fmt}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="map-view">
                        <div className="legend">
                            <span className="legend__item">
                                <span className="marker marker--active">🚗</span> Active
                            </span>
                            <span className="legend__item">
                                <span className="marker marker--overdue">🚗</span> Overdue
                            </span>
                            <span className="legend__item">
                                <span className="marker marker--stolen">🚗</span> Stolen
                            </span>
                            <span className="legend__item">
                                <span className="marker marker--car">🚗</span> Other
                            </span>
                        </div>
                        <RentalsMap rentals={data} />
                    </div>
                )}
            </div>
        </div>
    );
}
