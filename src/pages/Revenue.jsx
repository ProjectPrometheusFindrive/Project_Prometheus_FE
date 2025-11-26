import React, { useEffect, useState } from "react";
import { fetchRentalsSummary } from "../api";

export default function Revenue() {
    const [revenueData, setRevenueData] = useState({
        week: 0,
        month: 0,
        year: 0
    });
    const [loading, setLoading] = useState(true);
    const [animatedValues, setAnimatedValues] = useState({
        week: 0,
        month: 0,
        year: 0
    });

    // 날짜 범위 계산 헬퍼 함수
    const getDateRanges = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDay();

        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

        return {
            week: { start: weekStart, end: weekEnd },
            month: { start: monthStart, end: monthEnd },
            year: { start: yearStart, end: yearEnd }
        };
    };

    const getOverlapDays = (rangeStart, rangeEnd, contractStart, contractEnd) => {
        const start = Math.max(rangeStart.getTime(), contractStart.getTime());
        const end = Math.min(rangeEnd.getTime(), contractEnd.getTime());
        if (start > end) return 0;
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const data = await fetchRentalsSummary();
                if (!mounted) return;

                const rentals = Array.isArray(data) ? data : (data.rentals || []);
                const now = new Date();
                const activeRentals = rentals.filter(rental => {
                    if (rental.returnedAt) return false;
                    if (rental.contractStatus === "대여중") return true;
                    if (rental.rentalPeriod && rental.rentalPeriod.end) {
                        const endDate = rental.rentalPeriod.end instanceof Date
                            ? rental.rentalPeriod.end
                            : new Date(rental.rentalPeriod.end);
                        return endDate >= now;
                    }
                    return false;
                });

                const ranges = getDateRanges();
                let weeklyTotal = 0;
                let monthlyTotal = 0;
                let yearlyTotal = 0;

                activeRentals.forEach(rental => {
                    const startDate = rental.rentalPeriod?.start
                        ? (rental.rentalPeriod.start instanceof Date
                            ? rental.rentalPeriod.start
                            : new Date(rental.rentalPeriod.start))
                        : null;
                    const endDate = rental.rentalPeriod?.end
                        ? (rental.rentalPeriod.end instanceof Date
                            ? rental.rentalPeriod.end
                            : new Date(rental.rentalPeriod.end))
                        : null;

                    if (!startDate || !endDate) return;

                    const amount = rental.rentalAmount || 0;
                    const durationDays = rental.rentalDurationDays || 1;
                    const dailyRate = amount / durationDays;

                    const weekDays = getOverlapDays(ranges.week.start, ranges.week.end, startDate, endDate);
                    const monthDays = getOverlapDays(ranges.month.start, ranges.month.end, startDate, endDate);
                    const yearDays = getOverlapDays(ranges.year.start, ranges.year.end, startDate, endDate);

                    weeklyTotal += dailyRate * weekDays;
                    monthlyTotal += dailyRate * monthDays;
                    yearlyTotal += dailyRate * yearDays;
                });

                setRevenueData({
                    week: Math.max(weeklyTotal, 0),
                    month: Math.max(monthlyTotal, 0),
                    year: Math.max(yearlyTotal, 0)
                });
            } catch (e) {
                console.error("Failed to fetch revenue data", e);
                if (mounted) {
                    setRevenueData({ week: 0, month: 0, year: 0 });
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    // 숫자 애니메이션 효과
    useEffect(() => {
        if (loading) return;

        const duration = 1500;
        const steps = 60;
        const interval = duration / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);

            setAnimatedValues({
                week: revenueData.week * easeOutQuart,
                month: revenueData.month * easeOutQuart,
                year: revenueData.year * easeOutQuart
            });

            if (currentStep >= steps) {
                clearInterval(timer);
                setAnimatedValues(revenueData);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [loading, revenueData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(Math.round(amount));
    };

    const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}.${day}.`;
    };

    const formatDateRange = (start, end) => {
        const startMonth = start.getMonth();
        const endMonth = end.getMonth();
        const startStr = formatDate(start);

        if (startMonth === endMonth) {
            const endDay = String(end.getDate()).padStart(2, '0');
            return `${startStr} ~ ${endDay}.`;
        } else {
            const endStr = formatDate(end);
            return `${startStr} ~ ${endStr}`;
        }
    };

    const ranges = getDateRanges();
    const weekTitle = formatDateRange(ranges.week.start, ranges.week.end);
    const monthTitle = formatDateRange(ranges.month.start, ranges.month.end);
    const yearTitle = ranges.year.start.getFullYear().toString();

    const RevenueCard = ({ period, dateRange, amount, index, accentColor }) => (
        <div
            className="revenue-card"
            style={{
                animationDelay: `${index * 100}ms`,
                '--accent-color': accentColor
            }}
        >
            <div className="revenue-card-header">
                <div className="revenue-period">{period}</div>
                <div className="revenue-date">{dateRange}</div>
            </div>

            <div className="revenue-amount-section">
                <div className="revenue-label">매출</div>
                <div className="revenue-amount">
                    {formatCurrency(amount)}
                </div>
            </div>

            <div className="revenue-footer">
                <div className="revenue-unpaid-label">미수금</div>
                <div className="revenue-unpaid-status">지원 예정</div>
            </div>

            <div className="revenue-card-decoration"></div>
        </div>
    );

    return (
        <>
            <style>{`
                .revenue-container {
                    --color-cream: #faf9f7;
                    --color-ink: #1a1a1a;
                    --color-gold: #d4a574;
                    --color-gold-light: #e8c9a0;
                    --color-border: #e5e3df;
                    --color-muted: #6b6b6b;
                }

                .revenue-header {
                    margin-bottom: 2rem;
                    border-bottom: 2px solid var(--color-ink);
                    padding-bottom: 1.5rem;
                }

                .revenue-title {
                    font-size: 2rem;
                    font-weight: 600;
                    color: var(--color-ink);
                    letter-spacing: -0.025em;
                    margin-bottom: 0.5rem;
                }

                .revenue-subtitle {
                    font-size: 0.875rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .revenue-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 2rem;
                    margin-top: 2rem;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .revenue-card {
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: 0;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
                }

                .revenue-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, var(--accent-color), transparent);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .revenue-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
                    border-color: var(--accent-color);
                }

                .revenue-card:hover::before {
                    opacity: 1;
                }

                .revenue-card-decoration {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, transparent 50%, var(--accent-color) 50%);
                    opacity: 0.03;
                    transition: opacity 0.3s ease;
                }

                .revenue-card:hover .revenue-card-decoration {
                    opacity: 0.08;
                }

                .revenue-card-header {
                    margin-bottom: 2rem;
                    border-bottom: 1px solid var(--color-border);
                    padding-bottom: 1rem;
                }

                .revenue-period {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--color-ink);
                    margin-bottom: 0.25rem;
                }

                .revenue-date {
                    font-size: 0.8125rem;
                    color: var(--color-muted);
                    letter-spacing: 0.02em;
                }

                .revenue-amount-section {
                    margin-bottom: 1.5rem;
                }

                .revenue-label {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.5rem;
                }

                .revenue-amount {
                    font-size: 2.25rem;
                    font-weight: 700;
                    color: var(--color-ink);
                    line-height: 1;
                    letter-spacing: -0.02em;
                }

                .revenue-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 1rem;
                    border-top: 1px solid var(--color-border);
                }

                .revenue-unpaid-label {
                    font-size: 0.75rem;
                    color: var(--color-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .revenue-unpaid-status {
                    font-size: 0.8125rem;
                    color: var(--color-gold);
                    font-style: italic;
                    font-weight: 500;
                }

                .revenue-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    color: var(--color-muted);
                }

                .revenue-loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--color-border);
                    border-top-color: var(--color-gold);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 768px) {
                    .revenue-title {
                        font-size: 2rem;
                    }

                    .revenue-grid {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }

                    .revenue-card {
                        padding: 1.5rem;
                    }

                    .revenue-amount {
                        font-size: 1.75rem;
                    }
                }
            `}</style>

            <div className="page space-y-4 revenue-container">
                <div className="revenue-header">
                    <h1 className="revenue-title">매출 관리</h1>
                    <div className="revenue-subtitle">Revenue Management</div>
                </div>

                <div className="page-scroll">
                    {loading ? (
                        <div className="revenue-loading">
                            <div className="revenue-loading-spinner"></div>
                        </div>
                    ) : (
                        <div className="revenue-grid">
                            <RevenueCard
                                period="이번주"
                                dateRange={weekTitle}
                                amount={animatedValues.week}
                                index={0}
                                accentColor="#3b82f6"
                            />
                            <RevenueCard
                                period="이번달"
                                dateRange={monthTitle}
                                amount={animatedValues.month}
                                index={1}
                                accentColor="#10b981"
                            />
                            <RevenueCard
                                period="올해"
                                dateRange={yearTitle}
                                amount={animatedValues.year}
                                index={2}
                                accentColor="#8b5cf6"
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
