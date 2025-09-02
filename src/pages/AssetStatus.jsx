import React, { useMemo, useState } from "react";
import { assets } from "../data/assets";

export default function AssetStatus() {
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return assets.filter((a) => {
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
            return matchesTerm && matchesStatus;
        });
    }, [q, status]);

    return (
        <div className="page">
            <h1>자산 현황</h1>

            <div className="asset-toolbar">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색 (ID, 제조사, 모델, 위치...)" className="asset-search" />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="asset-filter">
                    <option value="all">전체 상태</option>
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                    <option value="Maintenance">Maintenance</option>
                </select>
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
                                <td>{a.id}</td>
                                <td>
                                    {a.make} {a.model}
                                </td>
                                <td>{a.year}</td>
                                <td>{a.fuelType}</td>
                                <td>
                                    <span className={`badge badge--${a.status.toLowerCase()}`}>{a.status}</span>
                                </td>
                                <td>{a.price.toLocaleString()} ₩</td>
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
