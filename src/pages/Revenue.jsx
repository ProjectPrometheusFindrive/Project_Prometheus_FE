import React, { useEffect, useState } from "react";
import { fetchRentalsSummary } from "../api";
import "./Revenue.css";

// 아이콘 컴포넌트
const TrendUpIcon = () => (
    <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const CalendarIcon = () => (
    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const ChartIcon = () => (
    <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const CurrencyIcon = () => (
    <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

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
        return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
    };

    const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}.${day}`;
    };

    const formatDateRange = (start, end) => {
        return `${formatDate(start)} ~ ${formatDate(end)}`;
    };

    const ranges = getDateRanges();
    const weekTitle = formatDateRange(ranges.week.start, ranges.week.end);
    const monthTitle = formatDateRange(ranges.month.start, ranges.month.end);
    const yearTitle = ranges.year.start.getFullYear().toString();

    // 총 매출 계산
    const totalRevenue = revenueData.year;

    // 카드 설정
    const cards = [
        {
            period: "이번주",
            dateRange: weekTitle,
            amount: animatedValues.week,
            gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            theme: "blue",
        },
        {
            period: "이번달",
            dateRange: monthTitle,
            amount: animatedValues.month,
            gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            theme: "green",
        },
        {
            period: "올해",
            dateRange: yearTitle,
            amount: animatedValues.year,
            gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
            theme: "purple",
        }
    ];

    // 총 매출 요약 카드
    const SummaryCard = () => (
        <div className="revenue-summary">
            {/* 배경 장식 */}
            <div className="revenue-summary__decoration revenue-summary__decoration--1" />
            <div className="revenue-summary__decoration revenue-summary__decoration--2" />
            <div className="revenue-summary__decoration revenue-summary__decoration--3" />

            <div className="revenue-summary__content">
                <div className="revenue-summary__main">
                    <div className="revenue-summary__header">
                        <div className="revenue-summary__icon">
                            <CurrencyIcon />
                        </div>
                        <div>
                            <p className="revenue-summary__title">
                                {new Date().getFullYear()}년 총 매출
                            </p>
                            <p className="revenue-summary__subtitle">
                                Annual Revenue
                            </p>
                        </div>
                    </div>
                    <div className="revenue-summary__amount-row">
                        <span className="revenue-summary__amount">
                            {formatCurrency(animatedValues.year)}
                        </span>
                        <span className="revenue-summary__amount-unit">원</span>
                    </div>
                </div>
                <div className="revenue-summary__badge">
                    <TrendUpIcon />
                    <span>운영 중</span>
                </div>
            </div>

            {/* 하단 통계 */}
            <div className="revenue-summary__stats">
                <div>
                    <p className="revenue-summary__stat-label">이번주 매출</p>
                    <p className="revenue-summary__stat-value">
                        {formatCurrency(animatedValues.week)}원
                    </p>
                </div>
                <div>
                    <p className="revenue-summary__stat-label">이번달 매출</p>
                    <p className="revenue-summary__stat-value">
                        {formatCurrency(animatedValues.month)}원
                    </p>
                </div>
                <div>
                    <p className="revenue-summary__stat-label">미수금</p>
                    <p className="revenue-summary__stat-value revenue-summary__stat-value--pending">지원 예정</p>
                </div>
            </div>
        </div>
    );

    // 개별 매출 카드
    const RevenueCard = ({ period, dateRange, amount, gradient, theme, index }) => (
        <div
            className={`revenue-card revenue-card--${theme}`}
            style={{
                animation: `slideUp 0.5s ease-out ${index * 0.1}s backwards`,
            }}
        >
            {/* 상단 그라데이션 바 */}
            <div style={{ height: 4, background: gradient }} />

            <div className="revenue-card__body">
                {/* 헤더 */}
                <div className="revenue-card__header">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="revenue-card__icon">
                            <ChartIcon />
                        </div>
                        <div>
                            <h3 className="revenue-card__title">{period}</h3>
                            <div className="revenue-card__date">
                                <CalendarIcon />
                                <span>{dateRange}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 금액 */}
                <div className="revenue-card__amount-box">
                    <p className="revenue-card__amount-label">매출액</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span className="revenue-card__amount">{formatCurrency(amount)}</span>
                        <span className="revenue-card__amount-unit">원</span>
                    </div>
                </div>

                {/* 하단 */}
                <div className="revenue-card__footer">
                    <span className="revenue-card__footer-label">미수금</span>
                    <span className="revenue-card__footer-badge">지원 예정</span>
                </div>
            </div>
        </div>
    );

    // 로딩 스피너
    const LoadingSpinner = () => (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 400,
                gap: 16,
            }}
        >
            <div
                style={{
                    width: 48,
                    height: 48,
                    border: "3px solid #e5e7eb",
                    borderTopColor: "#3b82f6",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }}
            />
            <p style={{ color: "#6b7280", fontSize: 14 }}>데이터를 불러오는 중...</p>
        </div>
    );

    return (
        <div className="page page--data">
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>

            <div className="page-scroll revenue-page">
                {/* 헤더 */}
                <div className="revenue-header">
                    <h1 className="revenue-title">매출 관리</h1>
                </div>

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {/* 총 매출 요약 */}
                        <SummaryCard />

                        {/* 기간별 매출 카드 */}
                        <div className="revenue-cards">
                            {cards.map((card, index) => (
                                <RevenueCard key={card.period} {...card} index={index} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
