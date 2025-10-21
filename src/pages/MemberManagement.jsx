import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, isRoleAtLeast } from '../constants/auth';
import { fetchAllMembers, fetchPendingMembers, approveMember, rejectMember, changeMemberRole } from '../api';
import { emitToast } from '../utils/toast';
import ErrorBoundary from '../components/ErrorBoundary';
import Table from "../components/Table";
import './MemberManagement.css';
import RoleChangeModal from "../components/RoleChangeModal";

/**
 * MemberManagement page - Admin/Super Admin only
 *
 * Features:
 * - List all members and pending members (tabbed view)
 * - Approve/Reject pending members with confirmation
 * - Change member roles (admin <-> member for super_admin)
 * - Reload list after actions
 */
function MemberManagement() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'pending'
    const [allMembers, setAllMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // userId being acted upon
    const [selectedMember, setSelectedMember] = useState(null); // For role change modal
    const [newRole, setNewRole] = useState('');
    const [highlightUserId, setHighlightUserId] = useState('');

    // Permission check: Only admin or super_admin can access
    const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);
    const isSuperAdmin = user && user.role === ROLES.SUPER_ADMIN;
    const isAdmin = user && user.role === ROLES.ADMIN;

    useEffect(() => {
        if (activeTab === 'all') {
            loadAllMembers();
        } else {
            loadPendingMembers();
        }
    }, [activeTab]);

    // Unified data with id field for Table
    const allRows = useMemo(() => allMembers.map((m) => ({ ...m, id: m.userId })), [allMembers]);
    const pendingRows = useMemo(() => pendingMembers.map((m) => ({ ...m, id: m.userId })), [pendingMembers]);

    // Columns for All Members tab
    const allColumns = useMemo(() => {
        const cols = [
            { key: 'userId', label: '사용자 ID' },
            { key: 'bizRegNo', label: '사업자등록번호', render: (r) => r.bizRegNo || '-' },
            { key: 'company', label: '회사', render: (r) => r.company || r.companyId || '-', sortAccessor: (r) => r.company || r.companyId || '' },
            { key: 'position', label: '직책', render: (r) => r.position || '-' },
            { key: 'name', label: '이름', render: (r) => r.name || '-' },
            { key: 'phone', label: '전화번호', render: (r) => r.phone || '-' },
            { key: 'role', label: '역할', render: (r) => (
                <span className={`role-badge role-${r.role}`}>
                    {r.role || 'member'}
                </span>
            ) },
            { key: 'createdAt', label: '가입일', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '-') },
        ];
        if (isSuperAdmin) {
            cols.push({
                key: 'actions',
                label: '역할 변경',
                sortable: false,
                render: (r) => (
                    r.role === ROLES.SUPER_ADMIN ? (
                        <span className="text-muted">변경 불가</span>
                    ) : (
                        <button
                            className="btn-role-change"
                            onClick={() => openRoleChangeModal(r)}
                            disabled={actionLoading === r.userId}
                        >
                            역할 변경
                        </button>
                    )
                ),
            });
        }
        return cols;
    }, [isSuperAdmin, actionLoading]);

    // Columns for Pending Members tab
    const pendingColumns = useMemo(() => [
        { key: 'userId', label: '사용자 ID' },
        { key: 'bizRegNo', label: '사업자등록번호', render: (r) => r.bizRegNo || '-' },
        { key: 'company', label: '회사', sortAccessor: (r) => r.company || r.companyId || '', render: (r) => {
            const isOtherCompany = !isSuperAdmin && r.companyId !== user.companyId;
            return (
                <>
                    {r.company || r.companyId || '-'}
                    {isOtherCompany && <span className="badge badge-warning">타사</span>}
                </>
            );
        } },
        { key: 'position', label: '직책', render: (r) => r.position || '-' },
        { key: 'name', label: '이름', render: (r) => r.name || '-' },
        { key: 'phone', label: '전화번호', render: (r) => r.phone || '-' },
        { key: 'createdAt', label: '가입일', render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('ko-KR') : '-') },
        {
            key: 'actions',
            label: '승인 여부',
            sortable: false,
            render: (r) => (
                !canManageMember(r) ? (
                    <span className="text-muted">권한 없음</span>
                ) : (
                    <div className="action-buttons">
                        <button
                            className="btn-approve"
                            id={`approve-btn-${encodeURIComponent(r.userId)}`}
                            onClick={() => handleApprove(r.userId)}
                            disabled={actionLoading === r.userId}
                        >
                            {actionLoading === r.userId ? '처리 중...' : '승인'}
                        </button>
                        <button
                            className="btn-reject"
                            onClick={() => handleReject(r.userId)}
                            disabled={actionLoading === r.userId}
                        >
                            거절
                        </button>
                    </div>
                )
            ),
        },
    ], [isSuperAdmin, user?.companyId, actionLoading]);

    // Listen for global refresh signal and consume focus intent stored by dashboard
    useEffect(() => {
        function onRefresh() {
            if (activeTab === 'pending') {
                loadPendingMembers();
            }
        }
        window.addEventListener('app:refresh-pending-members', onRefresh);
        // One-time check for focus intent
        try {
            const raw = localStorage.getItem('approveUserFocus');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && parsed.userId) {
                setActiveTab('pending');
                setHighlightUserId(parsed.userId);
                localStorage.removeItem('approveUserFocus');
            }
        } catch {}
        return () => window.removeEventListener('app:refresh-pending-members', onRefresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadAllMembers() {
        if (!canManageMembers) {
            setError('접근 권한이 없습니다.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await fetchAllMembers();
            let list = Array.isArray(data) ? data : [];
            // If viewer is admin (not super_admin), show only same-company admin/member
            if (isAdmin && user && user.companyId) {
                list = list.filter((m) => (
                    m && m.companyId === user.companyId && (m.role === ROLES.ADMIN || m.role === ROLES.MEMBER)
                ));
            }
            setAllMembers(list);
        } catch (err) {
            console.error('Failed to fetch all members:', err);
            setError(err.message || '회원 목록을 불러오는데 실패했습니다.');
            emitToast('회원 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function loadPendingMembers() {
        if (!canManageMembers) {
            setError('접근 권한이 없습니다.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
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
            setError(err.message || '대기 회원 목록을 불러오는데 실패했습니다.');
            emitToast('대기 회원 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoading(false);
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
                // Reload list
                await loadPendingMembers();
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

        // Only super_admin can change roles in all members tab
        if (!isSuperAdmin) {
            emitToast('역할 변경은 super_admin만 가능합니다.', 'error');
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
                if (activeTab === 'all') {
                    await loadAllMembers();
                } else {
                    await loadPendingMembers();
                }
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

    if (!canManageMembers) {
        return (
            <div className="page member-management-page space-y-4">
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
            <div className="page member-management-page space-y-4">
                <h1 className="text-2xl font-semibold text-gray-900">회원 관리</h1>
                <div className="page-scroll space-y-4">
                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    {/* Toolbar: Right-aligned tab toggles + Refresh */}
                    <div className="asset-toolbar">
                        <div className="flex items-center gap-8" style={{ width: '100%' }}>
                            <div className="flex-1" />
                            <div className="asset-actions">
                                <button
                                    type="button"
                                    className={['form-button', activeTab === 'all' ? '' : 'form-button--neutral'].filter(Boolean).join(' ')}
                                    onClick={() => setActiveTab('all')}
                                    aria-pressed={activeTab === 'all'}
                                >
                                    {isAdmin ? '멤버' : '전체 회원'}
                                </button>
                                <button
                                    type="button"
                                    className={['form-button', activeTab === 'pending' ? '' : 'form-button--neutral'].filter(Boolean).join(' ')}
                                    onClick={() => setActiveTab('pending')}
                                    aria-pressed={activeTab === 'pending'}
                                >
                                    승인 대기
                                </button>
                                <button
                                    type="button"
                                    className="form-button form-button--neutral"
                                    onClick={() => (activeTab === 'all' ? loadAllMembers() : loadPendingMembers())}
                                    disabled={loading}
                                >
                                    {loading ? '로딩 중...' : '새로고침'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* All Members Tab */}
                    {activeTab === 'all' && (
                        <div className="content-section">

                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>로딩 중...</p>
                                </div>
                            ) : (
                                <Table
                                    stickyHeader
                                    columns={allColumns}
                                    data={allRows}
                                    rowClassName={(row) => {
                                        const classes = [];
                                        if (actionLoading === row.userId) classes.push('disabled-row');
                                        if (highlightUserId === row.userId) classes.push('highlight-row');
                                        return classes.join(' ') || undefined;
                                    }}
                                    emptyMessage="회원이 없습니다."
                                />
                            )}
                        </div>
                    )}

                {/* Pending Members Tab */}
                    {activeTab === 'pending' && (
                        <div className="content-section">

                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>로딩 중...</p>
                                </div>
                            ) : (
                                <Table
                                    stickyHeader
                                    columns={pendingColumns}
                                    data={pendingRows}
                                    rowClassName={(row) => {
                                        const disabled = actionLoading === row.userId || !canManageMember(row);
                                        return disabled ? 'disabled-row' : undefined;
                                    }}
                                    emptyMessage="승인 대기중인 회원이 없습니다."
                                />
                            )}
                        </div>
                    )}

                {/* Role Change Modal */}
                {selectedMember && (
                  <RoleChangeModal
                    member={selectedMember}
                    newRole={newRole}
                    setNewRole={setNewRole}
                    onClose={closeRoleChangeModal}
                    onConfirm={handleRoleChange}
                    loading={actionLoading === selectedMember.userId}
                  />
                )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default MemberManagement;
