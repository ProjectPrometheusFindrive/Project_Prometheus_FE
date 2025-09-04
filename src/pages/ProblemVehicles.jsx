import React, { useEffect, useState } from "react";
import IssueForm from "../components/forms/IssueForm";
import { fetchProblemVehicles, createIssueDraft } from "../api/fakeApi";

export default function ProblemVehicles() {
    const [problems, setProblems] = useState([]);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueInitial, setIssueInitial] = useState({});
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const list = await fetchProblemVehicles();
                if (mounted) setProblems(list || []);
            } catch (e) {
                console.error("Failed to fetch problem vehicles", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const openIssueModal = (prefill = {}) => {
        setIssueInitial(prefill || {});
        setShowIssueModal(true);
    };

    const handleIssueSubmit = async (data) => {
        await createIssueDraft(data);
        setShowIssueModal(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    return (
        <div className="page">
            <h1>반납지연/도난 현황</h1>

            <div className="asset-toolbar" style={{ marginTop: 8 }}>
                <div style={{ flex: 1 }} />
                <button type="button" className="form-button" onClick={() => openIssueModal({})}>
                    이슈차량 등록
                </button>
                {saved && (
                    <span className="saved-indicator" aria-live="polite">
                        Saved
                    </span>
                )}
            </div>

            <div className="table-wrap">
                <table className="asset-table">
                    <thead>
                        <tr>
                            <th>차량번호</th>
                            <th>차종</th>
                            <th>대여기간</th>
                            <th>대여자</th>
                            <th>연락처</th>
                            <th>이슈</th>
                        </tr>
                    </thead>
                    <tbody>
                        {problems.map((p) => (
                            <tr
                                key={p.rental_id}
                                onClick={() => openIssueModal({ vin: p.vin, type: (p.issue || "").includes("stolen") ? "stolen" : "overdue" })}
                                style={{ cursor: "pointer" }}
                                title="행을 클릭하면 이슈 등록 창이 열립니다."
                            >
                                <td>{p.plate || (p.asset ? p.asset.plate : "-")}</td>
                                <td>{p.vehicleType || (p.asset ? p.asset.vehicleType : "-")}</td>
                                <td>
                                    {p?.rental_period?.start ? new Date(p.rental_period.start).toLocaleDateString() : "-"} ~{" "}
                                    {p?.rental_period?.end ? new Date(p.rental_period.end).toLocaleDateString() : "-"}
                                </td>
                                <td>{p.renter_name || "-"}</td>
                                <td>{p.contact_number || "-"}</td>
                                <td>
                                    {(() => {
                                        const issue = String(p.issue || "");
                                        const isStolen = issue.indexOf("stolen") !== -1;
                                        const m = issue.match(/overdue\((\d+)d\)/);
                                        let text = "-";
                                        let cls = "";
                                        if (isStolen) {
                                            text = "도난 의심";
                                            cls = "badge--suspicious";
                                        } else if (m) {
                                            text = "연체 " + m[1] + "일";
                                            cls = "badge--overdue";
                                        }
                                        return text !== "-" ? <span className={"badge " + cls}>{text}</span> : "-";
                                    })()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {problems.length === 0 && <div className="empty">문제 차량이 없습니다.</div>}

            {showIssueModal && (
                <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="이슈차량 등록">
                    <div className="modal">
                        <div className="header-row" style={{ marginBottom: 8 }}>
                            <strong>이슈차량 등록</strong>
                            <div style={{ marginLeft: "auto" }}>
                                <button type="button" className="form-button" style={{ background: "#777" }} onClick={() => setShowIssueModal(false)}>
                                    닫기
                                </button>
                            </div>
                        </div>
                        <IssueForm initial={issueInitial} onSubmit={handleIssueSubmit} />
                    </div>
                </div>
            )}
        </div>
    );
}
