import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { assets } from "../data/assets";

export default function AssetStatus() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [onlyToggleable, setOnlyToggleable] = useState(false);
    // Work on a local copy so we can toggle status inline
    const [rows, setRows] = useState(() => assets.map((a) => ({ ...a })));

    const setStatusFor = (id, nextStatus) => {
        setRows((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
    };

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return rows.filter((a) => {
            const matchesTerm = term
                ? [
                      a.id,
                      a.type,
                      a.make,
                      a.model,
                      String(a.year),
                      a.status,
                      a.fuelType,
                      a.insuranceName,
                      a.insuranceCoverage,
                      String(a.insuranceAge),
                      a.deviceId,
                      a.registrationDate,
                      String(a.price),
                      String(a.odometer),
                  ]
                      .join(" ")
                      .toLowerCase()
                      .includes(term)
                : true;
            const matchesStatus = status === "all" ? true : a.status === status;
            const matchesToggleable = !onlyToggleable ? true : a.status !== "Rented";
            return matchesTerm && matchesStatus && matchesToggleable;
        });
    }, [q, status, onlyToggleable, rows]);

    return (
        <div className="page">
            <h1>자산 현황</h1>

            <div className="asset-toolbar">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색(ID, 제조사, 모델, 위치...)" className="asset-search" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="asset-filter">
                    <option value="all">전체 상태</option>
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                    <option value="Maintenance">Maintenance</option>
                </select>
                <label className="asset-filter" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                    <input type="checkbox" checked={onlyToggleable} onChange={(e) => setOnlyToggleable(e.target.checked)} />
                    대여 중 제외
                </label>
            </div>

            <div className="table-wrap">
                <table className="asset-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Make/Model</th>
                            <th>Year</th>
                            <th>Fuel</th>
                            <th>Status</th>
                            <th>Price</th>
                            <th>Insurance Name</th>
                            <th>Coverage</th>
                            <th>Insurance Age</th>
                            <th>Device ID</th>
                            <th>Registration Date</th>
                            <th>Odometer</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((a) => (
                            <tr key={a.id}>
                                <td>
                                    <Link to={`/detail/asset/${a.id}`}>{a.id}</Link>
                                </td>
                                <td>
                                    {a.make} {a.model}
                                </td>
                                <td>{a.year}</td>
                                <td>{a.fuelType}</td>
                                <td>
                                    <span className={`badge badge--${a.status.toLowerCase()}`}>{a.status}</span>
                                    <div className="status-toggle" title={a.status === "Rented" ? "대여 중에는 상태를 변경할 수 없습니다" : undefined}>
                                        <button
                                            className={`toggle-btn ${a.status === "Available" ? "is-active" : ""}`}
                                            onClick={() => setStatusFor(a.id, "Available")}
                                            disabled={a.status === "Rented"}
                                        >
                                            대여 가능
                                        </button>
                                        <button
                                            className={`toggle-btn ${a.status === "Maintenance" ? "is-active" : ""}`}
                                            onClick={() => setStatusFor(a.id, "Maintenance")}
                                            disabled={a.status === "Rented"}
                                        >
                                            점검 중
                                        </button>
                                    </div>
                                </td>
                                <td>{a.price.toLocaleString()}</td>
                                <td>{a.insuranceName}</td>
                                <td>{a.insuranceCoverage}</td>
                                <td>{a.insuranceAge}+</td>
                                <td>{a.deviceId}</td>
                                <td>{new Date(a.registrationDate).toLocaleDateString()}</td>
                                <td>{a.odometer.toLocaleString()} km</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <div className="empty">조건에 맞는 자산이 없습니다.</div>}
            </div>
        </div>
    );
}
