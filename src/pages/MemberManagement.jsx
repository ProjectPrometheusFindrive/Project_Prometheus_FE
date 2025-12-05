import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ROLES, isRoleAtLeast } from "../constants/auth";
import { fetchAllMembers, fetchPendingMembers, approveMember, rejectMember, changeMemberRole, withdrawMember, restoreMember } from "../api";
import { emitToast } from "../utils/toast";
import ErrorBoundary from "../components/ErrorBoundary";
import Table from "../components/Table";
import { CompanyCell } from "../components/cells";
import "./MemberManagement.css";
import RoleChangeModal from "../components/modals/RoleChangeModal";
import { formatDisplayDate } from "../utils/date";
import { useConfirm } from "../contexts/ConfirmContext";
import useTableSelection from "../hooks/useTableSelection";

/**
 * MemberManagement page - Admin/Super Admin only
 *
 * Features:
 * - Unified table: pending highlighted at top with approve action
 * - Approve/Reject pending members with confirmation
 * - Change member roles (admin <-> member for super_admin)
 * - Reload list after actions
 */
function MemberManagement() {
    const { user } = useAuth();
    const [allMembers, setAllMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [loadingPending, setLoadingPending] = useState(true);
    const [errorAll, setErrorAll] = useState(null);
    const [errorPending, setErrorPending] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // userId being acted upon
    const [selectedMember, setSelectedMember] = useState(null); // For role change modal
    const [newRole, setNewRole] = useState('');
    const [highlightUserId, setHighlightUserId] = useState('');
    const [batchWorking, setBatchWorking] = useState(false);
    const [batchRole, setBatchRole] = useState('');

    // Permission check: Only admin or super_admin can access
    const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);
    const isSuperAdmin = user && user.role === ROLES.SUPER_ADMIN;
    const isAdmin = user && user.role === ROLES.ADMIN;
    const confirm = useConfirm();

    useEffect(() => {
        loadPendingMembers();
        loadAllMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Normalize
    const allRows = useMemo(() => allMembers.map((m) => ({ ...m, id: m.userId })), [allMembers]);
    const pendingRows = useMemo(() => pendingMembers.map((m) => ({ ...m, id: m.userId })), [pendingMembers]);

    // Build unified rows: pending first, then approved, then withdrawn
    const unifiedRows = useMemo(() => {
        const mapAll = allRows.map((m) => ({ ...m, _pending: false, displayRole: m.role || ROLES.MEMBER }));
        const idsInAll = new Set(mapAll.map((m) => m.userId));
        const mapPending = pendingRows
            .filter((p) => !idsInAll.has(p.userId))
            .map((p) => ({
                ...p,
                _pending: true,
                // Derive role from signup if present, else use role field fallback
                displayRole: p.requestedRole || p.signupRole || p.role || ROLES.MEMBER,
                membershipStatus: 'pending',
            }));
        const approved = mapAll.filter((m) => m.membershipStatus !== 'withdrawn');
        const withdrawn = mapAll.filter((m) => m.membershipStatus === 'withdrawn');
        // Light sorting inside groups
        mapPending.sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return da - db;
        });
        approved.sort((a, b) => String(a.userId).localeCompare(String(b.userId)));
        withdrawn.sort((a, b) => String(a.userId).localeCompare(String(b.userId)));
        return [...mapPending, ...approved, ...withdrawn];
    }, [allRows, pendingRows]);

    // Single selection across unified table
    const selection = useTableSelection(unifiedRows, 'id');
    const selectedPendingCount = useMemo(() => selection.selectedItems.filter((r) => r && r._pending).length, [selection.selectedItems]);
    const selectedWithdrawEligibleCount = useMemo(
        () => selection.selectedItems.filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && canManageMember(r)).length,
        [selection.selectedItems]
    );
    const selectedRoleChangeEligibleCount = useMemo(
        () => selection.selectedItems.filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && r.role !== ROLES.SUPER_ADMIN && canManageMember(r)).length,
        [selection.selectedItems]
    );

    // Unified columns (pending + all members in one table)
    const columns = useMemo(() => {
        const cols = [
            // 회사 컬럼을 가장 왼쪽으로 이동, super-admin은 CI + 회사명 노출
            {
                key: 'company',
                label: '회사',
                sortAccessor: (r) => r.company || r.companyId || '',
                render: (r) => (isSuperAdmin ? (<CompanyCell row={r} />) : (r.company || r.companyId || '-')),
            },
            { key: 'userId', label: '사용자 ID' },
            { key: 'bizRegNo', label: '사업자등록번호', render: (r) => r.bizRegNo || '-' },
            { key: 'position', label: '직책', render: (r) => r.position || '-' },
            { key: 'name', label: '이름', render: (r) => r.name || '-' },
            { key: 'phone', label: '전화번호', render: (r) => r.phone || '-' },
            { key: 'role', label: '역할', render: (r) => (
                <span className={`role-badge role-${r.displayRole}`}>
                    {r.displayRole || 'member'}
                </span>
            ) },
            { key: 'status', label: '상태', sortAccessor: (r) => (r._pending ? '0' : (r.membershipStatus === 'withdrawn' ? '2' : '1')), render: (r) => (
                r._pending ? '대기' : (r.membershipStatus === 'withdrawn' ? '탈퇴됨' : '정상')
            ) },
            { key: 'createdAt', label: '가입일', render: (r) => (r.createdAt ? formatDisplayDate(r.createdAt, 'ko-KR') : '-') },
        ];
        if (isSuperAdmin || isAdmin) {
            cols.push({
                key: 'actions',
                label: '관리',
                sortable: false,
                render: (r) => (
                    r.role === ROLES.SUPER_ADMIN ? (
                        <span className="text-muted">변경 불가</span>
                    ) : r._pending ? (
                        canManageMember(r) ? (
                            <button
                                className="btn-approve"
                                id={`approve-btn-${encodeURIComponent(r.userId)}`}
                                onClick={() => handleApprove(r.userId)}
                                disabled={actionLoading === r.userId}
                            >
                                {actionLoading === r.userId ? '처리 중...' : '승인'}
                            </button>
                        ) : (
                            <span className="text-muted">권한 없음</span>
                        )
                    ) : r.membershipStatus === 'withdrawn' ? (
                        canManageMember(r) ? (
                            <button
                                className="btn-approve"
                                onClick={() => handleRestore(r)}
                                disabled={actionLoading === r.userId}
                            >
                                {actionLoading === r.userId ? '처리 중...' : '복원'}
                            </button>
                        ) : (
                            <span className="text-muted">권한 없음</span>
                        )
                    ) : (
                        <div className="action-buttons">
                            <button
                                className="btn-role-change"
                                onClick={() => openRoleChangeModal(r)}
                                disabled={actionLoading === r.userId}
                            >
                                역할 변경
                            </button>
                        </div>
                    )
                ),
            });
        }
        return cols;
    }, [isSuperAdmin, isAdmin, actionLoading]);

    // Listen for global refresh signal and consume focus intent stored by dashboard
    useEffect(() => {
        function onRefresh() {
            loadPendingMembers();
        }
        window.addEventListener('app:refresh-pending-members', onRefresh);
        // One-time check for focus intent
        try {
            const raw = localStorage.getItem('approveUserFocus');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && parsed.userId) {
                setHighlightUserId(parsed.userId);
                localStorage.removeItem('approveUserFocus');
            }
        } catch {}
        return () => window.removeEventListener('app:refresh-pending-members', onRefresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadAllMembers() {
        if (!canManageMembers) {
            setErrorAll('접근 권한이 없습니다.');
            setLoadingAll(false);
            return;
        }

        try {
            setLoadingAll(true);
            setErrorAll(null);
            const data = await fetchAllMembers();
            let list = Array.isArray(data) ? data : [];
            // If viewer is admin (not super_admin), show only same-company admin/member
            if (isAdmin && user && user.companyId) {
                list = list.filter((m) => (
                    m && m.companyId === user.companyId && (m.role === ROLES.ADMIN || m.role === ROLES.MEMBER)
                ));
            }
            // Order: approved first, then withdrawn
            list.sort((a, b) => {
                const sa = a?.membershipStatus === 'withdrawn' ? 1 : 0;
                const sb = b?.membershipStatus === 'withdrawn' ? 1 : 0;
                if (sa !== sb) return sa - sb;
                // Keep stable otherwise
                return String(a.userId).localeCompare(String(b.userId));
            });
            setAllMembers(list);
        } catch (err) {
            console.error('Failed to fetch all members:', err);
            setErrorAll(err.message || '회원 목록을 불러오는데 실패했습니다.');
            emitToast('회원 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoadingAll(false);
        }
    }

    async function loadPendingMembers() {
        if (!canManageMembers) {
            setErrorPending('접근 권한이 없습니다.');
            setLoadingPending(false);
            return;
        }

        try {
            setLoadingPending(true);
            setErrorPending(null);
            const data = await fetchPendingMembers();
            const list = Array.isArray(data) ? data : [];
            setPendingMembers(list);
            // Attempt to focus the highlighted user's approve button
            if (highlightUserId) {
                setTimeout(() => {
                    const id = `approve-btn-${encodeURIComponent(highlightUserId)}`;
                    const el = document.getElementById(id);
                    if (el && typeof el.focus === 'function') {
                        try { el.focus(); } catch {}
                    }
                }, 0);
            }
        } catch (err) {
            console.error('Failed to fetch pending members:', err);
            setErrorPending(err.message || '대기 회원 목록을 불러오는데 실패했습니다.');
            emitToast('대기 회원 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoadingPending(false);
        }
    }

    async function handleApprove(userId) {
        if (!window.confirm(`${userId} 사용자를 승인하시겠습니까?`)) {
            return;
        }

        try {
            setActionLoading(userId);
            const success = await approveMember(userId);
            if (success) {
                emitToast('회원이 승인되었습니다.', 'success');
                // Reload lists
                await loadPendingMembers();
                await loadAllMembers();
            } else {
                emitToast('회원 승인에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Failed to approve member:', err);
            emitToast(err.message || '회원 승인에 실패했습니다.', 'error');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(userId) {
        const reason = window.prompt(`${userId} 사용자를 거절합니다. 사유를 입력하세요 (선택):`, '');
        if (reason === null) {
            // User cancelled
            return;
        }

        try {
            setActionLoading(userId);
            const success = await rejectMember(userId, reason || null);
            if (success) {
                emitToast('회원이 거절되었습니다.', 'success');
                // Reload list
                await loadPendingMembers();
            } else {
                emitToast('회원 거절에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Failed to reject member:', err);
            emitToast(err.message || '회원 거절에 실패했습니다.', 'error');
        } finally {
            setActionLoading(null);
        }
    }

    function openRoleChangeModal(member) {
        setSelectedMember(member);
        setNewRole(member.role || ROLES.MEMBER);
    }

    function closeRoleChangeModal() {
        setSelectedMember(null);
        setNewRole('');
    }

    async function handleRoleChange() {
        if (!selectedMember || !newRole) {
            return;
        }

        // Permission: super_admin can change any (except super_admin target via UI).
        // Admin can change roles only within same company, between admin/member (not super_admin), and not for withdrawn users.
        const canChange = (
            isSuperAdmin || (
                isAdmin &&
                canManageMember(selectedMember) &&
                selectedMember.role !== ROLES.SUPER_ADMIN &&
                newRole !== ROLES.SUPER_ADMIN &&
                selectedMember.membershipStatus !== 'withdrawn'
            )
        );
        if (!canChange) {
            emitToast('역할 변경 권한이 없습니다.', 'error');
            return;
        }

        // Check if role is same
        if (newRole === selectedMember.role) {
            emitToast('현재 역할과 동일합니다.', 'warning');
            return;
        }

        if (!window.confirm(`${selectedMember.userId}의 역할을 "${newRole}"로 변경하시겠습니까?\n\n대상 사용자는 재로그인이 필요합니다.`)) {
            return;
        }

        try {
            setActionLoading(selectedMember.userId);
            const success = await changeMemberRole(selectedMember.userId, newRole);
            if (success) {
                emitToast('역할이 변경되었습니다. 대상 사용자는 재로그인이 필요합니다.', 'success', 5000);
                closeRoleChangeModal();
                // Reload list to show updated data
                await loadAllMembers();
            } else {
                emitToast('역할 변경에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Failed to change role:', err);
            emitToast(err.message || '역할 변경에 실패했습니다.', 'error');
        } finally {
            setActionLoading(null);
        }
    }

    // Helper: Can this admin/super_admin manage this member?
    function canManageMember(member) {
        if (isSuperAdmin) {
            return true;
        }
        // Admin can only manage users from their own company
        return member.companyId === user.companyId;
    }

    async function refreshMembersForWarning() {
        try {
            const data = await fetchAllMembers();
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    }

    async function ensureNotLastAdmin(target) {
        if (!target || target.role !== ROLES.ADMIN) return true;
        const latest = await refreshMembersForWarning();
        const companyId = target.companyId;
        const adminCount = latest.filter((m) => m && m.companyId === companyId && m.role === ROLES.ADMIN && m.membershipStatus !== 'withdrawn').length;
        if (adminCount <= 1) {
            const ok = await confirm({
                title: '마지막 관리자 경고',
                message: '해당 사용자는 해당 회사의 마지막 관리자입니다. 탈퇴 시 회사 관리 권한이 사라집니다. 계속 진행하시겠습니까?',
                confirmText: '계속',
                cancelText: '취소'
            });
            return !!ok;
        }
        return true;
    }

    async function handleWithdraw(member) {
        if (!member) return;
        if (!canManageMember(member)) {
            emitToast('권한이 없습니다.', 'error');
            return;
        }
        // Freshness and last-admin warning
        const proceed = await ensureNotLastAdmin(member);
        if (!proceed) return;

        const ok = await confirm({ title: '회원 탈퇴', message: `${member.userId} 사용자를 탈퇴 처리하시겠습니까?`, confirmText: '탈퇴', cancelText: '취소' });
        if (!ok) return;
        try {
            setActionLoading(member.userId);
            const success = await withdrawMember(member.userId);
            if (success) {
                emitToast('탈퇴 처리되었습니다.', 'success');
                await loadAllMembers();
            } else {
                emitToast('탈퇴 처리에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Failed to withdraw member:', err);
            emitToast(err.message || '탈퇴 처리에 실패했습니다.', 'error');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRestore(member) {
        if (!member) return;
        if (!canManageMember(member)) {
            emitToast('권한이 없습니다.', 'error');
            return;
        }
        const ok = await confirm({ title: '회원 복원', message: `${member.userId} 사용자를 복원하시겠습니까?`, confirmText: '복원', cancelText: '취소' });
        if (!ok) return;
        try {
            setActionLoading(member.userId);
            const success = await restoreMember(member.userId);
            if (success) {
                emitToast('복원되었습니다.', 'success');
                await loadAllMembers();
            } else {
                emitToast('복원에 실패했습니다.', 'error');
            }
        } catch (err) {
            console.error('Failed to restore member:', err);
            emitToast(err.message || '복원에 실패했습니다.', 'error');
        } finally {
            setActionLoading(null);
        }
    }

    // Bulk actions for unified table
    async function handleBulkApprove() {
        const ids = selection.selectedIds;
        const targets = ids.map((id) => unifiedRows.find((r) => r.id === id)).filter((r) => r && r._pending && canManageMember(r));
        if (!targets.length) return emitToast('선택된 대기 회원이 없습니다.', 'warning');
        const ok = await confirm({ title: '일괄 승인', message: `${targets.length}명의 대기 회원을 승인하시겠습니까?`, confirmText: '승인', cancelText: '취소' });
        if (!ok) return;
        try {
            setBatchWorking(true);
            let successCount = 0;
            for (const row of targets) {
                try {
                    const ok = await approveMember(row.id);
                    if (ok) successCount += 1;
                } catch {}
            }
            emitToast(`승인 완료: ${successCount}/${targets.length}`, successCount === targets.length ? 'success' : successCount > 0 ? 'warning' : 'error');
            await loadPendingMembers();
            await loadAllMembers();
            selection.clearSelection();
        } finally {
            setBatchWorking(false);
        }
    }

    async function handleBulkReject() {
        const ids = selection.selectedIds;
        const targets = ids.map((id) => unifiedRows.find((r) => r.id === id)).filter((r) => r && r._pending && canManageMember(r));
        if (!targets.length) return emitToast('선택된 대기 회원이 없습니다.', 'warning');
        const reason = window.prompt(`${targets.length}명의 대기 회원을 거절합니다. 사유를 입력하세요 (선택):`, '');
        if (reason === null) return; // cancelled
        try {
            setBatchWorking(true);
            let successCount = 0;
            for (const row of targets) {
                try {
                    const ok = await rejectMember(row.id, reason || null);
                    if (ok) successCount += 1;
                } catch {}
            }
            emitToast(`거절 완료: ${successCount}/${targets.length}`, successCount === targets.length ? 'success' : successCount > 0 ? 'warning' : 'error');
            await loadPendingMembers();
            selection.clearSelection();
        } finally {
            setBatchWorking(false);
        }
    }

    async function handleBulkWithdraw() {
        const ids = selection.selectedIds;
        const targets = ids.map((id) => unifiedRows.find((r) => r.id === id)).filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && canManageMember(r));
        if (!targets.length) return emitToast('선택된 회원이 없습니다.', 'warning');
        const ok = await confirm({ title: '일괄 탈퇴', message: `${targets.length}명의 회원을 탈퇴 처리하시겠습니까?`, confirmText: '탈퇴', cancelText: '취소' });
        if (!ok) return;
        try {
            setBatchWorking(true);
            let successCount = 0;
            for (const member of targets) {
                try {
                    const proceed = await ensureNotLastAdmin(member);
                    if (!proceed) continue;
                    const ok = await withdrawMember(member.id);
                    if (ok) successCount += 1;
                } catch {}
            }
            emitToast(`탈퇴 처리 완료: ${successCount}/${targets.length}`, successCount === targets.length ? 'success' : successCount > 0 ? 'warning' : 'error');
            await loadAllMembers();
            selection.clearSelection();
        } finally {
            setBatchWorking(false);
        }
    }

    async function handleBulkRoleChange() {
        if (!isSuperAdmin) return emitToast('역할 변경은 super_admin만 가능합니다.', 'error');
        const ids = selection.selectedIds;
        const targets = ids.map((id) => unifiedRows.find((r) => r.id === id)).filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && r.role !== ROLES.SUPER_ADMIN && canManageMember(r));
        if (!targets.length) return emitToast('선택된 회원이 없습니다.', 'warning');
        if (!batchRole || (batchRole !== ROLES.ADMIN && batchRole !== ROLES.MEMBER)) {
            return emitToast('변경할 역할을 선택하세요 (admin/member).', 'warning');
        }
        const ok = await confirm({ title: '일괄 역할 변경', message: `${targets.length}명의 역할을 \"${batchRole}\"로 변경하시겠습니까?\n\n대상 사용자는 재로그인이 필요합니다.`, confirmText: '변경', cancelText: '취소' });
        if (!ok) return;
        try {
            setBatchWorking(true);
            let successCount = 0;
            for (const member of targets) {
                try {
                    if (member.role === batchRole) continue; // no-op
                    const ok = await changeMemberRole(member.id, batchRole);
                    if (ok) successCount += 1;
                } catch {}
            }
            emitToast(`역할 변경 완료: ${successCount}/${targets.length}`, successCount === targets.length ? 'success' : successCount > 0 ? 'warning' : 'error');
            await loadAllMembers();
            selection.clearSelection();
        } finally {
            setBatchWorking(false);
        }
    }

    if (!canManageMembers) {
        return (
            <div className="page page--data member-management-page space-y-4">
                <div className="page-scroll space-y-4">
                    <div className="error-message">
                        접근 권한이 없습니다. 관리자 권한이 필요합니다.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="page page--data member-management-page space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">회원 관리</h1>
                <div className="page-scroll space-y-4">
                    {(errorAll || errorPending) && (
                        <div className="error-banner">{errorAll || errorPending}</div>
                    )}

                        <div className="table-toolbar">
                            <div className="flex-1"></div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="form-button form-button--neutral"
                                    onClick={() => { loadPendingMembers(); loadAllMembers(); }}
                                    disabled={batchWorking || loadingAll || loadingPending}
                                >
                                    {(loadingAll || loadingPending) ? '로딩 중...' : '새로고침'}
                                </button>
                                <button
                                    type="button"
                                    className="form-button"
                                    onClick={handleBulkApprove}
                                    disabled={batchWorking || selectedPendingCount === 0}
                                >
                                    일괄 승인
                                </button>
                                <button
                                    type="button"
                                    className="form-button form-button--danger"
                                    onClick={handleBulkWithdraw}
                                    disabled={batchWorking || selectedWithdrawEligibleCount === 0}
                                >
                                    일괄 탈퇴
                                </button>
                                {isSuperAdmin && (
                                    <>
                                        <select
                                            className="form-input"
                                            aria-label="일괄 역할 선택"
                                            value={batchRole}
                                            onChange={(e) => setBatchRole(e.target.value)}
                                            disabled={batchWorking}
                                        >
                                            <option value="">역할 선택</option>
                                            <option value={ROLES.ADMIN}>admin</option>
                                            <option value={ROLES.MEMBER}>member</option>
                                        </select>
                                        <button
                                            type="button"
                                            className="form-button"
                                            onClick={handleBulkRoleChange}
                                            disabled={batchWorking || !batchRole || selectedRoleChangeEligibleCount === 0}
                                        >
                                            일괄 역할 변경
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        {((loadingAll || loadingPending) && unifiedRows.length === 0) ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>로딩 중...</p>
                            </div>
                        ) : (
                            <Table
                                stickyHeader
                                columns={columns}
                                data={unifiedRows}
                                selection={{
                                    selected: selection.selected,
                                    toggleSelect: selection.toggleSelect,
                                    toggleSelectAllVisible: selection.toggleSelectAllVisible,
                                    allVisibleSelected: selection.allVisibleSelected,
                                }}
                                rowClassName={(row) => {
                                    const classes = [];
                                    if (actionLoading === row.userId) classes.push('disabled-row');
                                    if (row._pending) classes.push('pending-row');
                                    if (row.membershipStatus === 'withdrawn') classes.push('withdrawn-row');
                                    if (highlightUserId === row.userId) classes.push('highlight-row');
                                    return classes.join(' ') || undefined;
                                }}
                                emptyMessage="회원이 없습니다."
                            />
                        )}
                    </div>

                    {/* Role Change Modal */}
                    {selectedMember && (
                        <RoleChangeModal
                            member={selectedMember}
                            newRole={newRole}
                            setNewRole={setNewRole}
                            onClose={closeRoleChangeModal}
                            onConfirm={handleRoleChange}
                            onWithdraw={canManageMember(selectedMember) ? handleWithdraw : undefined}
                            canChangeRole={
                              !!selectedMember && (
                                isSuperAdmin || (
                                  isAdmin &&
                                  canManageMember(selectedMember) &&
                                  selectedMember.role !== ROLES.SUPER_ADMIN &&
                                  selectedMember.membershipStatus !== 'withdrawn'
                                )
                              )
                            }
                            loading={actionLoading === selectedMember.userId}
                        />
                    )}
                </div>
        </ErrorBoundary>
    );
}

export default MemberManagement;
