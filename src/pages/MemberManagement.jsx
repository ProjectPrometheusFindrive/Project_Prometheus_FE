import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, isRoleAtLeast } from '../constants/auth';
import { fetchAllMembers, fetchPendingMembers, approveMember, rejectMember, changeMemberRole } from '../api/api';
import { emitToast } from '../utils/toast';
import ErrorBoundary from '../components/ErrorBoundary';
import './MemberManagement.css';

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

    // Permission check: Only admin or super_admin can access
    const canManageMembers = user && isRoleAtLeast(user.role, ROLES.ADMIN);
    const isSuperAdmin = user && user.role === ROLES.SUPER_ADMIN;

    useEffect(() => {
        if (activeTab === 'all') {
            loadAllMembers();
        } else {
            loadPendingMembers();
        }
    }, [activeTab]);

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
            setAllMembers(Array.isArray(data) ? data : []);
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
            setPendingMembers(Array.isArray(data) ? data : []);
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
            <div className="member-management-page">
                <div className="error-message">
                    접근 권한이 없습니다. 관리자 권한이 필요합니다.
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="member-management-page">
                <div className="page-header">
                    <h1>회원 관리</h1>
                    <p className="page-subtitle">전체 회원을 조회하고 역할을 변경하거나, 가입 대기중인 회원을 승인/거절할 수 있습니다.</p>
                </div>

                {error && (
                    <div className="error-banner">
                        {error}
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="tab-navigation">
                    <button
                        className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        전체 회원
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        승인 대기
                    </button>
                </div>

                {/* All Members Tab */}
                {activeTab === 'all' && (
                    <div className="content-section">
                        <div className="section-header">
                            <h2>전체 회원</h2>
                            <button
                                className="btn-secondary"
                                onClick={loadAllMembers}
                                disabled={loading}
                            >
                                {loading ? '로딩 중...' : '새로고침'}
                            </button>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>로딩 중...</p>
                            </div>
                        ) : allMembers.length === 0 ? (
                            <div className="empty-state">
                                <p>회원이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="members-table-container">
                                <table className="members-table">
                                    <thead>
                                        <tr>
                                            <th>사용자 ID</th>
                                            <th>이름</th>
                                            <th>이메일</th>
                                            <th>회사</th>
                                            <th>직책</th>
                                            <th>전화번호</th>
                                            <th>역할</th>
                                            <th>가입일</th>
                                            {isSuperAdmin && <th>작업</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allMembers.map((member) => {
                                            const disabled = actionLoading === member.userId;

                                            return (
                                                <tr key={member.userId} className={disabled ? 'disabled-row' : ''}>
                                                    <td>{member.userId}</td>
                                                    <td>{member.name || '-'}</td>
                                                    <td>{member.email || member.userId}</td>
                                                    <td>{member.company || member.companyId || '-'}</td>
                                                    <td>{member.position || '-'}</td>
                                                    <td>{member.phone || '-'}</td>
                                                    <td>
                                                        <span className={`role-badge role-${member.role}`}>
                                                            {member.role || 'member'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {member.createdAt
                                                            ? new Date(member.createdAt).toLocaleDateString('ko-KR')
                                                            : '-'}
                                                    </td>
                                                    {isSuperAdmin && (
                                                        <td className="action-cell">
                                                            {member.role === ROLES.SUPER_ADMIN ? (
                                                                <span className="text-muted">변경 불가</span>
                                                            ) : (
                                                                <button
                                                                    className="btn-role-change"
                                                                    onClick={() => openRoleChangeModal(member)}
                                                                    disabled={disabled}
                                                                >
                                                                    역할 변경
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending Members Tab */}
                {activeTab === 'pending' && (
                    <div className="content-section">
                        <div className="section-header">
                            <h2>승인 대기 회원</h2>
                            <button
                                className="btn-secondary"
                                onClick={loadPendingMembers}
                                disabled={loading}
                            >
                                {loading ? '로딩 중...' : '새로고침'}
                            </button>
                        </div>

                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner"></div>
                                <p>로딩 중...</p>
                            </div>
                        ) : pendingMembers.length === 0 ? (
                            <div className="empty-state">
                                <p>승인 대기중인 회원이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="members-table-container">
                                <table className="members-table">
                                    <thead>
                                        <tr>
                                            <th>사용자 ID</th>
                                            <th>이름</th>
                                            <th>이메일</th>
                                            <th>회사</th>
                                            <th>직책</th>
                                            <th>전화번호</th>
                                            <th>가입일</th>
                                            <th>작업</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingMembers.map((member) => {
                                            const disabled = actionLoading === member.userId || !canManageMember(member);
                                            const isOtherCompany = !isSuperAdmin && member.companyId !== user.companyId;

                                            return (
                                                <tr key={member.userId} className={disabled ? 'disabled-row' : ''}>
                                                    <td>{member.userId}</td>
                                                    <td>{member.name || '-'}</td>
                                                    <td>{member.email || member.userId}</td>
                                                    <td>
                                                        {member.company || member.companyId || '-'}
                                                        {isOtherCompany && <span className="badge badge-warning">타사</span>}
                                                    </td>
                                                    <td>{member.position || '-'}</td>
                                                    <td>{member.phone || '-'}</td>
                                                    <td>
                                                        {member.createdAt
                                                            ? new Date(member.createdAt).toLocaleDateString('ko-KR')
                                                            : '-'}
                                                    </td>
                                                    <td className="action-cell">
                                                        {!canManageMember(member) ? (
                                                            <span className="text-muted">권한 없음</span>
                                                        ) : (
                                                            <div className="action-buttons">
                                                                <button
                                                                    className="btn-approve"
                                                                    onClick={() => handleApprove(member.userId)}
                                                                    disabled={disabled}
                                                                >
                                                                    {actionLoading === member.userId ? '처리 중...' : '승인'}
                                                                </button>
                                                                <button
                                                                    className="btn-reject"
                                                                    onClick={() => handleReject(member.userId)}
                                                                    disabled={disabled}
                                                                >
                                                                    거절
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Role Change Modal */}
                {selectedMember && (
                    <div className="modal-overlay" onClick={closeRoleChangeModal}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>역할 변경</h3>
                                <button className="close-btn" onClick={closeRoleChangeModal}>
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>사용자 ID</label>
                                    <input
                                        type="text"
                                        value={selectedMember.userId}
                                        disabled
                                        className="input-disabled"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>이름</label>
                                    <input
                                        type="text"
                                        value={selectedMember.name}
                                        disabled
                                        className="input-disabled"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>현재 역할</label>
                                    <input
                                        type="text"
                                        value={selectedMember.role}
                                        disabled
                                        className="input-disabled"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="newRole">새로운 역할 (admin ↔ member만 변경 가능)</label>
                                    <select
                                        id="newRole"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        className="select-input"
                                    >
                                        <option value={ROLES.MEMBER}>member</option>
                                        <option value={ROLES.ADMIN}>admin</option>
                                    </select>
                                </div>
                                <div className="info-box">
                                    <strong>주의:</strong> 역할 변경 시 대상 사용자의 토큰이 무효화되어 재로그인이 필요합니다.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn-secondary"
                                    onClick={closeRoleChangeModal}
                                    disabled={actionLoading === selectedMember.userId}
                                >
                                    취소
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleRoleChange}
                                    disabled={actionLoading === selectedMember.userId || newRole === selectedMember.role}
                                >
                                    {actionLoading === selectedMember.userId ? '처리 중...' : '변경'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}

export default MemberManagement;
