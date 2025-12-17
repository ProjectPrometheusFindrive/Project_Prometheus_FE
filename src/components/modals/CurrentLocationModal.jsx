import React, { useEffect, useRef } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import KakaoMap from "../KakaoMap";
import "./CurrentLocationModal.css";

// Car icon SVG component (from img_current_location.svg)
const CarIcon = () => (
    <svg width="65" height="47" viewBox="0 0 65 47" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 38.6071C5 38.1436 5.3731 37.7679 5.83333 37.7679H14.1667C14.6269 37.7679 15 38.1436 15 38.6071V46.1607C15 46.6242 14.6269 47 14.1667 47H5.83333C5.3731 47 5 46.6242 5 46.1607V38.6071Z" fill="url(#paint0_linear_784_1282)"/>
        <path d="M50 38.6071C50 38.1436 50.3731 37.7679 50.8333 37.7679H59.1667C59.6269 37.7679 60 38.1436 60 38.6071V46.1607C60 46.6242 59.6269 47 59.1667 47H50.8333C50.3731 47 50 46.6242 50 46.1607V38.6071Z" fill="url(#paint1_linear_784_1282)"/>
        <path d="M16.9193 0.014526H33.9543V41.9643H7.77861C4.7871 41.9643 4.45471 39.8668 4.45471 38.1888V23.5064C4.45471 21.1572 6.67064 18.6122 7.77861 17.6334H3.20823C-0.448059 17.2978 -0.946694 12.18 1.54628 12.18H6.53213C8.19409 12.18 8.60957 14.9766 8.60957 16.3749C9.16356 14.4173 10.5208 9.41127 11.518 5.0485C12.5152 0.685722 15.5344 -0.125307 16.9193 0.014526Z" fill="url(#paint2_linear_784_1282)"/>
        <path d="M48.0807 0.0145192H31.0457V41.9643H57.2214C60.2129 41.9643 60.5453 39.8668 60.5453 38.1888V23.5064C60.5453 21.1572 58.3294 18.6122 57.2214 17.6334H61.7918C65.4481 17.2978 65.9467 12.1799 63.4537 12.1799H58.4679C56.8059 12.1799 56.3904 14.9766 56.3904 16.3749C55.8364 14.4173 54.4792 9.41126 53.482 5.04849C52.4848 0.685716 49.4656 -0.125313 48.0807 0.0145192Z" fill="url(#paint3_linear_784_1282)"/>
        <path d="M20.8333 29.375H45L42.1929 35.736C41.8731 36.4609 41.1555 36.9286 40.3632 36.9286H25.1217C24.2951 36.9286 23.5537 36.4201 23.2559 35.649L20.8333 29.375Z" fill="#0978D1"/>
        <g opacity="0.5">
            <path d="M16.6665 26.4375C16.6665 28.5234 14.9876 30.2143 12.9165 30.2143C10.8454 30.2143 9.1665 28.5234 9.1665 26.4375C9.1665 24.3516 10.8454 22.6607 12.9165 22.6607C14.9876 22.6607 16.6665 24.3516 16.6665 26.4375Z" fill="url(#paint4_linear_784_1282)"/>
            <path d="M55.8332 26.4375C55.8332 28.5234 54.1542 30.2143 52.0832 30.2143C50.0121 30.2143 48.3332 28.5234 48.3332 26.4375C48.3332 24.3516 50.0121 22.6607 52.0832 22.6607C54.1542 22.6607 55.8332 24.3516 55.8332 26.4375Z" fill="url(#paint5_linear_784_1282)"/>
        </g>
        <path d="M17.083 2.9375H33.333V17.625H10.833C11.3886 15.3869 12.7497 10.0714 13.7497 6.71429C14.3747 4.61607 14.9997 2.9375 17.083 2.9375Z" fill="#2072BE"/>
        <path d="M47.9163 2.9375H31.6663V17.625H54.1663C53.6108 15.3869 52.2497 10.0714 51.2497 6.71429C50.6247 4.61607 49.9997 2.9375 47.9163 2.9375Z" fill="#2072BE"/>
        <defs>
            <linearGradient id="paint0_linear_784_1282" x1="33.75" y1="47.8393" x2="33.75" y2="41.9643" gradientUnits="userSpaceOnUse">
                <stop stopColor="#434343"/>
                <stop offset="1"/>
            </linearGradient>
            <linearGradient id="paint1_linear_784_1282" x1="33.75" y1="47.8393" x2="33.75" y2="41.9643" gradientUnits="userSpaceOnUse">
                <stop stopColor="#434343"/>
                <stop offset="1"/>
            </linearGradient>
            <linearGradient id="paint2_linear_784_1282" x1="32.5" y1="29.3794" x2="32.5" y2="41.9643" gradientUnits="userSpaceOnUse">
                <stop stopColor="#168DEB"/>
                <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
            <linearGradient id="paint3_linear_784_1282" x1="32.5" y1="29.3794" x2="32.5" y2="41.9643" gradientUnits="userSpaceOnUse">
                <stop stopColor="#168DEB"/>
                <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
            <linearGradient id="paint4_linear_784_1282" x1="30.8332" y1="29.7946" x2="30.8332" y2="23.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ABDAFF"/>
                <stop offset="1" stopColor="white"/>
            </linearGradient>
            <linearGradient id="paint5_linear_784_1282" x1="30.8332" y1="29.7946" x2="30.8332" y2="23.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ABDAFF"/>
                <stop offset="1" stopColor="white"/>
            </linearGradient>
        </defs>
    </svg>
);

// Back arrow icon SVG component
const BackArrowIcon = () => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 4L7 11L14 18" stroke="#1C1C1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const CurrentLocationModal = ({
    isOpen,
    onClose,
    onBackToDetail,
    contract,
    trackingDateKeys = [],
    trackingDateFilters = [],
    onTrackingDateFilterChange,
    filteredTrackingData = [],
    mapLastUpdateTime,
    speedLegendItems = [],
    hasSelectedTrackingData = false,
    isLoadingLocation = false,
    onLoadMoreTrail,
    onAddressResolved,
    formatTrackingDateLabel,
}) => {
    const containerRef = useRef(null);
    const previousActiveElementRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        previousActiveElementRef.current = document.activeElement;

        const onKey = (e) => {
            if (e.key === "Escape") {
                try {
                    onCloseRef.current && onCloseRef.current();
                } catch {}
            }
        };
        document.addEventListener("keydown", onKey);

        setTimeout(() => {
            try {
                containerRef.current && containerRef.current.focus();
            } catch {}
        }, 0);

        return () => {
            document.removeEventListener("keydown", onKey);
            setTimeout(() => {
                try {
                    if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
                        previousActiveElementRef.current.focus();
                    }
                } catch {}
            }, 0);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleDateToggle = (key) => {
        if (onTrackingDateFilterChange) {
            const wasActive = Array.isArray(trackingDateFilters) && trackingDateFilters.includes(key);
            const nextFilters = wasActive
                ? trackingDateFilters.filter((k) => k !== key)
                : [...(trackingDateFilters || []), key];
            onTrackingDateFilterChange(nextFilters);
        }
    };

    const renterInfo = [
        contract?.renterName,
        contract?.contactNumber,
        contract?.address,
    ]
        .filter(Boolean)
        .join(" \u00B7 ");

    return (
        <div
            className="location-modal-overlay"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Current Location Map"
        >
            <div
                className="location-modal"
                onClick={(e) => e.stopPropagation()}
                ref={containerRef}
                tabIndex={-1}
            >
                {/* Header */}
                <div className="location-modal-header">
                    <div className="location-modal-header__left">
                        {onBackToDetail && (
                            <button
                                type="button"
                                className="location-modal-back-btn"
                                onClick={onBackToDetail}
                                aria-label="Back to detail"
                            >
                                <BackArrowIcon />
                            </button>
                        )}
                        <h2 className="location-modal-title">현재위치</h2>
                    </div>
                </div>

                {contract && (
                    <>
                        {/* Vehicle Info Box */}
                        <div className="location-modal-vehicle-box">
                            <div className="location-modal-vehicle-icon">
                                <CarIcon />
                            </div>
                            <div className="location-modal-vehicle-info">
                                <div className="location-modal-vehicle-title">
                                    {contract.plate} / {contract.vehicleType}
                                </div>
                                <div className="location-modal-vehicle-renter">
                                    <span className="location-modal-vehicle-renter-label">대여자</span>
                                    <div className="location-modal-vehicle-renter-divider" />
                                    <span className="location-modal-vehicle-renter-value">
                                        {renterInfo || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Map Controls - Speed Legend & Date Filters */}
                        {trackingDateKeys.length > 0 && (
                            <div className="location-modal-map-controls">
                                {hasSelectedTrackingData && (
                                    <div className="location-modal-speed-legend">
                                        <span className="location-modal-speed-legend-label">속도 범례:</span>
                                        {speedLegendItems.map((item) => (
                                            <div
                                                key={item.key}
                                                className="location-modal-speed-item"
                                                style={{ backgroundColor: item.bg }}
                                            >
                                                <div
                                                    className="location-modal-speed-bar"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span style={{ color: item.color }}>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="location-modal-controls-right">
                                    {trackingDateKeys.length > 1 && (
                                        <div className="location-modal-date-filter">
                                            <span className="location-modal-date-label">일자:</span>
                                            {trackingDateKeys.map((key) => {
                                                const isActive = Array.isArray(trackingDateFilters) && trackingDateFilters.includes(key);
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => handleDateToggle(key)}
                                                        className={`location-modal-date-btn ${isActive ? "location-modal-date-btn--active" : ""}`}
                                                    >
                                                        {formatTrackingDateLabel ? formatTrackingDateLabel(key) : key}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onLoadMoreTrail}
                                        disabled={isLoadingLocation}
                                        className="location-modal-more-btn"
                                    >
                                        이동경로 더보기
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Map Area */}
                        <div className="location-modal-map-container">
                            {contract.currentLocation ? (
                                <KakaoMap
                                    latitude={contract.currentLocation.lat}
                                    longitude={contract.currentLocation.lng}
                                    vehicleNumber={contract.plate}
                                    lastUpdateTime={mapLastUpdateTime}
                                    markerTitle={`${contract.plate} (${contract.vehicleType})`}
                                    width="100%"
                                    height="100%"
                                    renterName={contract.renterName}
                                    engineOn={contract.engineOn}
                                    isOnline={!!contract.currentLocation}
                                    trackingData={filteredTrackingData}
                                    showSpeedLegend={false}
                                    showStatusOverlay={false}
                                    onAddressResolved={onAddressResolved}
                                />
                            ) : (
                                <div className="location-modal-no-location">
                                    <FaMapMarkerAlt size={48} className="location-modal-no-location-icon" />
                                    <div className="location-modal-no-location-title">위치 정보 없음</div>
                                    <div className="location-modal-no-location-text">
                                        현재 차량의 위치 정보를 받을 수 없습니다.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="location-modal-footer">
                            <div className="location-modal-footer-divider" />
                            <button
                                type="button"
                                className="location-modal-close-btn"
                                onClick={onClose}
                            >
                                닫기
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CurrentLocationModal;
