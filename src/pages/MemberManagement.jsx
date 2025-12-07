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
import useTableFilters from "../hooks/useTableFilters";
import { applyColumnFilters } from "../utils/filtering";

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

    // Table filters
    const TABLE_COLUMN_FILTERS_ENABLED = true;
    const tableFilterState = useTableFilters();
    const { filters: columnFilters } = tableFilterState;

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

    // Unified columns (pending + all members in one table)
    const columns = useMemo(() => {
        const cols = [
            // 회사 컬럼을 가장 왼쪽으로 이동, super-admin은 CI + 회사명 노출
            {
                key: 'company',
                label: '회사',
                sortAccessor: (r) => r.company || r.companyId || '',
                filterType: 'select',
                filterAccessor: (r) => r.company || r.companyId || '',
                render: (r) => (isSuperAdmin ? (<CompanyCell row={r} />) : (r.company || r.companyId || '-')),
            },
            {
                key: 'userId',
                label: '사용자 ID',
                filterType: 'text',
            },
            {
                key: 'bizRegNo',
                label: '사업자등록번호',
                filterType: 'text',
                render: (r) => r.bizRegNo || '-',
            },
            {
                key: 'position',
                label: '직책',
                filterType: 'text',
                render: (r) => r.position || '-',
            },
            {
                key: 'name',
                label: '이름',
                filterType: 'text',
                render: (r) => r.name || '-',
            },
            {
                key: 'phone',
                label: '전화번호',
                filterType: 'text',
                render: (r) => r.phone || '-',
            },
            {
                key: 'role',
                label: '역할',
                filterType: 'multi-select',
                filterAllowAnd: false,
                filterHideHeader: true,
                filterAccessor: (r) => r.displayRole || 'member',
                filterOptions: [
                    { value: 'super_admin', label: 'Super Admin' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'member', label: 'Member' },
                ],
                render: (r) => (
                    <span className={`role-badge role-${r.displayRole}`}>
                        {r.displayRole || 'member'}
                    </span>
                ),
            },
            {
                key: 'status',
                label: '상태',
                filterType: 'multi-select',
                filterAllowAnd: false,
                filterHideHeader: true,
                filterAccessor: (r) => r._pending ? '대기' : (r.membershipStatus === 'withdrawn' ? '탈퇴됨' : '정상'),
                filterOptions: [
                    { value: '대기', label: '대기' },
                    { value: '정상', label: '정상' },
                    { value: '탈퇴됨', label: '탈퇴됨' },
                ],
                sortAccessor: (r) => (r._pending ? '0' : (r.membershipStatus === 'withdrawn' ? '2' : '1')),
                render: (r) => (
                    r._pending ? '대기' : (r.membershipStatus === 'withdrawn' ? '탈퇴됨' : '정상')
                ),
            },
            {
                key: 'createdAt',
                label: '가입일',
                filterType: 'date-range',
                filterAccessor: (r) => r.createdAt || '',
                render: (r) => (r.createdAt ? formatDisplayDate(r.createdAt, 'ko-KR') : '-'),
            },
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

    // Apply column filters
    const filteredRows = useMemo(
        () => applyColumnFilters(unifiedRows, columnFilters, columns),
        [unifiedRows, columnFilters, columns]
    );

    // Single selection across unified table
    const selection = useTableSelection(filteredRows, 'id');
    const selectedPendingCount = useMemo(() => selection.selectedItems.filter((r) => r && r._pending).length, [selection.selectedItems]);
    const selectedWithdrawEligibleCount = useMemo(
        () => selection.selectedItems.filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && canManageMember(r)).length,
        [selection.selectedItems]
    );
    const selectedRoleChangeEligibleCount = useMemo(
        () => selection.selectedItems.filter((r) => r && !r._pending && r.membershipStatus !== 'withdrawn' && r.role !== ROLES.SUPER_ADMIN && canManageMember(r)).length,
        [selection.selectedItems]
    );

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
                <h1 className="text-2xl font-semibold text-gray-900">회원관리</h1>
                {(errorAll || errorPending) && (
                    <div className="error-banner">{errorAll || errorPending}</div>
                )}

                <div className="table-toolbar">
                    <div className="flex-1"></div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { loadPendingMembers(); loadAllMembers(); }}
                            disabled={batchWorking || loadingAll || loadingPending}
                            className="toolbar-button"
                            style={{
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                paddingTop: '4px',
                                paddingBottom: '4px',
                                borderRadius: '6px',
                                outline: '1px rgba(0, 0, 0, 0.10) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                background: 'transparent',
                                border: 'none',
                                cursor: (batchWorking || loadingAll || loadingPending) ? 'not-allowed' : 'pointer',
                                opacity: (batchWorking || loadingAll || loadingPending) ? 0.5 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!batchWorking && !loadingAll && !loadingPending) {
                                    e.currentTarget.style.background = '#006CEC';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.outline = 'none';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!batchWorking && !loadingAll && !loadingPending) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#1C1C1C';
                                    e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                }
                            }}
                        >
                            {(loadingAll || loadingPending) ? '로딩 중...' : '새로고침'}
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkApprove}
                            disabled={batchWorking || selectedPendingCount === 0}
                            className="toolbar-button"
                            style={{
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                paddingTop: '4px',
                                paddingBottom: '4px',
                                borderRadius: '6px',
                                outline: '1px rgba(0, 0, 0, 0.10) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                background: 'transparent',
                                border: 'none',
                                cursor: (batchWorking || selectedPendingCount === 0) ? 'not-allowed' : 'pointer',
                                opacity: (batchWorking || selectedPendingCount === 0) ? 0.5 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!batchWorking && selectedPendingCount > 0) {
                                    e.currentTarget.style.background = '#006CEC';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.outline = 'none';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!batchWorking && selectedPendingCount > 0) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#1C1C1C';
                                    e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                }
                            }}
                        >
                            일괄승인
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkWithdraw}
                            disabled={batchWorking || selectedWithdrawEligibleCount === 0}
                            className="toolbar-button"
                            style={{
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                paddingTop: '4px',
                                paddingBottom: '4px',
                                borderRadius: '6px',
                                outline: '1px rgba(0, 0, 0, 0.10) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '10px',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                background: 'transparent',
                                border: 'none',
                                cursor: (batchWorking || selectedWithdrawEligibleCount === 0) ? 'not-allowed' : 'pointer',
                                opacity: (batchWorking || selectedWithdrawEligibleCount === 0) ? 0.5 : 1,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!batchWorking && selectedWithdrawEligibleCount > 0) {
                                    e.currentTarget.style.background = '#006CEC';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.outline = 'none';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!batchWorking && selectedWithdrawEligibleCount > 0) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#1C1C1C';
                                    e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                }
                            }}
                        >
                            일괄탈퇴
                        </button>
                        {isSuperAdmin && (
                            <>
                                <select
                                    className="form-input"
                                    aria-label="일괄 역할 선택"
                                    value={batchRole}
                                    onChange={(e) => setBatchRole(e.target.value)}
                                    disabled={batchWorking}
                                    style={{
                                        paddingLeft: '14px',
                                        paddingRight: '14px',
                                        paddingTop: '4px',
                                        paddingBottom: '4px',
                                        borderRadius: '6px',
                                        outline: '1px rgba(0, 0, 0, 0.10) solid',
                                        outlineOffset: '-1px',
                                        fontSize: '14px',
                                        fontFamily: 'Pretendard',
                                        fontWeight: 500,
                                        lineHeight: '24px',
                                        color: '#1C1C1C',
                                        border: 'none',
                                        background: 'white'
                                    }}
                                >
                                    <option value="">역할 선택</option>
                                    <option value={ROLES.ADMIN}>admin</option>
                                    <option value={ROLES.MEMBER}>member</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleBulkRoleChange}
                                    disabled={batchWorking || !batchRole || selectedRoleChangeEligibleCount === 0}
                                    className="toolbar-button"
                                    style={{
                                        paddingLeft: '14px',
                                        paddingRight: '14px',
                                        paddingTop: '4px',
                                        paddingBottom: '4px',
                                        borderRadius: '6px',
                                        outline: '1px rgba(0, 0, 0, 0.10) solid',
                                        outlineOffset: '-1px',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '10px',
                                        display: 'inline-flex',
                                        textAlign: 'center',
                                        color: '#1C1C1C',
                                        fontSize: '14px',
                                        fontFamily: 'Pretendard',
                                        fontWeight: 500,
                                        lineHeight: '24px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: (batchWorking || !batchRole || selectedRoleChangeEligibleCount === 0) ? 'not-allowed' : 'pointer',
                                        opacity: (batchWorking || !batchRole || selectedRoleChangeEligibleCount === 0) ? 0.5 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!batchWorking && batchRole && selectedRoleChangeEligibleCount > 0) {
                                            e.currentTarget.style.background = '#006CEC';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.outline = 'none';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!batchWorking && batchRole && selectedRoleChangeEligibleCount > 0) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#1C1C1C';
                                            e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                        }
                                    }}
                                >
                                    일괄역할변경
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={tableFilterState.clearAll}
                            title="모든 컬럼 필터 초기화"
                            className="toolbar-button"
                            style={{
                                width: '104px',
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                paddingTop: '4px',
                                paddingBottom: '4px',
                                borderRadius: '6px',
                                outline: '1px rgba(0, 0, 0, 0.10) solid',
                                outlineOffset: '-1px',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                display: 'inline-flex',
                                textAlign: 'center',
                                color: '#1C1C1C',
                                fontSize: '14px',
                                fontFamily: 'Pretendard',
                                fontWeight: 500,
                                lineHeight: '24px',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#006CEC';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.outline = 'none';
                                const svg = e.currentTarget.querySelector('svg path');
                                if (svg) svg.setAttribute('fill', 'white');
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#1C1C1C';
                                e.currentTarget.style.outline = '1px rgba(0, 0, 0, 0.10) solid';
                                const svg = e.currentTarget.querySelector('svg path');
                                if (svg) svg.setAttribute('fill', '#1C1C1C');
                            }}
                        >
                            필터초기화
                            <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.9998 6.97426C12.011 8.31822 11.5834 9.62682 10.7861 10.6886C9.98877 11.7504 8.86834 12.5033 7.60586 12.8256C6.34338 13.148 5.0126 13.0209 3.8286 12.4651C2.6446 11.9092 1.67654 10.957 1.08087 9.76225C1.03928 9.68491 1.01307 9.59975 1.00379 9.51179C0.994503 9.42383 1.00233 9.33484 1.0268 9.25005C1.05127 9.16526 1.0919 9.08638 1.14629 9.01805C1.20069 8.94972 1.26775 8.89332 1.34354 8.85217C1.41933 8.81101 1.50232 8.78593 1.58762 8.7784C1.67293 8.77087 1.75883 8.78104 1.84027 8.80831C1.92172 8.83559 1.99706 8.87942 2.06188 8.93722C2.1267 8.99502 2.17969 9.06564 2.21772 9.14491C2.48916 9.67189 2.85539 10.1405 3.29677 10.5256C3.96005 11.1093 4.77313 11.4813 5.63716 11.5963C6.50118 11.7114 7.37893 11.5645 8.16369 11.1736C8.94845 10.7826 9.60643 10.1645 10.0576 9.39432C10.5088 8.62413 10.7338 7.73506 10.7052 6.8352C10.6766 5.93534 10.3956 5.06344 9.8965 4.32552C9.39738 3.5876 8.70157 3.01543 7.89368 2.67858C7.08578 2.34173 6.2006 2.2547 5.34574 2.42809C4.49089 2.60147 3.70318 3.0278 3.07839 3.65523H4.29232C4.46266 3.65523 4.62603 3.72516 4.74648 3.84965C4.86694 3.97414 4.9346 4.14298 4.9346 4.31903C4.9346 4.49509 4.86694 4.66393 4.74648 4.78842C4.62603 4.9129 4.46266 4.98284 4.29232 4.98284H1.72316C1.55281 4.98284 1.38944 4.9129 1.26899 4.78842C1.14854 4.66393 1.08087 4.49509 1.08087 4.31903V1.66381C1.08087 1.48775 1.14854 1.31891 1.26899 1.19442C1.38944 1.06994 1.55281 1 1.72316 1C1.8935 1 2.05687 1.06994 2.17733 1.19442C2.29778 1.31891 2.36545 1.48775 2.36545 1.66381V2.52676C3.19686 1.75821 4.22566 1.25468 5.32778 1.0769C6.42989 0.899131 7.55823 1.05471 8.5767 1.52486C9.59517 1.99502 10.4603 2.75968 11.0677 3.72661C11.675 4.69354 11.9988 5.82144 11.9998 6.97426Z" fill="#1C1C1C"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="page-scroll space-y-4">
                        {((loadingAll || loadingPending) && unifiedRows.length === 0) ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>로딩 중...</p>
                            </div>
                        ) : (
                            <Table
                                stickyHeader
                                columns={columns}
                                data={filteredRows}
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
                                enableColumnFilters={TABLE_COLUMN_FILTERS_ENABLED}
                                filters={columnFilters}
                                onFiltersChange={(next) => tableFilterState.setFilters(next)}
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
