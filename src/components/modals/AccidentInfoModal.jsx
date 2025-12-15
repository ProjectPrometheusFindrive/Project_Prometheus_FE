import { useEffect, useState, useRef } from "react";
import { getSignedDownloadUrl } from "../../utils/gcsApi";
import { formatDisplayDate } from "../../utils/date";
import { formatYyMmDdHhMmSs } from "../../utils/datetime";
import "./AccidentInfoModal.css";

const CarIcon = () => (
    <svg width="66" height="43" viewBox="0 0 66 43" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.0868 0.0145657H34.2905V42.0792H7.85562C4.8345 42.0792 4.49881 39.976 4.49881 38.2934V23.5708C4.49881 21.2151 6.73669 18.6632 7.85562 17.6817H3.24C-0.452495 17.3452 -0.956067 12.2133 1.56159 12.2133H6.59681C8.27521 12.2133 8.69482 15.0176 8.69482 16.4198C9.25428 14.4568 10.625 9.43705 11.632 5.06232C12.6391 0.6876 15.6882 -0.12565 17.0868 0.0145657Z" fill="url(#paint0_car)"/>
        <path d="M48.5567 0.014559H31.3531V42.0792H57.7879C60.8091 42.0792 61.1448 39.976 61.1448 38.2934V23.5708C61.1448 21.2151 58.9069 18.6632 57.7879 17.6817H62.4036C66.0961 17.3452 66.5996 12.2133 64.082 12.2133H59.0468C57.3683 12.2133 56.9487 15.0176 56.9487 16.4198C56.3893 14.4568 55.0186 9.43704 54.0115 5.06232C53.0045 0.687593 49.9554 -0.125657 48.5567 0.014559Z" fill="url(#paint1_car)"/>
        <defs>
            <linearGradient id="paint0_car" x1="32.8218" y1="29.4598" x2="32.8218" y2="42.0792" gradientUnits="userSpaceOnUse">
                <stop stopColor="#168DEB"/>
                <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
            <linearGradient id="paint1_car" x1="32.8218" y1="29.4598" x2="32.8218" y2="42.0792" gradientUnits="userSpaceOnUse">
                <stop stopColor="#168DEB"/>
                <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
        </defs>
    </svg>
);

const WarningIcon = () => (
    <svg width="30" height="27" viewBox="0 0 30 27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.6207 1.21344C13.5571 -0.404485 15.8983 -0.40448 16.8348 1.21345L29.1259 22.4488C30.0623 24.0667 28.8917 26.0891 27.0188 26.0891H2.43663C0.563701 26.0891 -0.606872 24.0667 0.329592 22.4488L12.6207 1.21344Z" fill="url(#paint_warning)"/>
        <text x="15" y="20" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
        <defs>
            <linearGradient id="paint_warning" x1="23.0658" y1="9.85083" x2="-1.1102" y2="28.1278" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFBB00"/>
                <stop offset="0.870994" stopColor="#FF9500"/>
            </linearGradient>
        </defs>
    </svg>
);

const AccidentInfoModal = ({ isOpen, onClose, accidentData, vehicleData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef(null);
    const [videoSrc, setVideoSrc] = useState(null);

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (!videoRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const seekTime = percent * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            } else if (videoRef.current.webkitRequestFullscreen) {
                videoRef.current.webkitRequestFullscreen();
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                if (accidentData?.blackboxFile instanceof File) {
                    const url = URL.createObjectURL(accidentData.blackboxFile);
                    if (!cancelled) setVideoSrc(url);
                    return;
                }
                if (accidentData?.blackboxGcsObjectName) {
                    const url = await getSignedDownloadUrl(accidentData.blackboxGcsObjectName);
                    if (!cancelled) setVideoSrc(url);
                    return;
                }
                if (accidentData?.blackboxFileUrl) {
                    if (!cancelled) setVideoSrc(accidentData.blackboxFileUrl);
                    return;
                }
                if (!cancelled) setVideoSrc(null);
            } catch {
                if (!cancelled) setVideoSrc(null);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [accidentData?.blackboxFile, accidentData?.blackboxGcsObjectName, accidentData?.blackboxFileUrl]);

    useEffect(() => {
        if (!isOpen) {
            setIsPlaying(false);
            setCurrentTime(0);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isOpen]);

    if (!isOpen || !accidentData) return null;

    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className="accident-modal-overlay" onClick={onClose}>
            <div className="accident-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="accident-modal-header">
                    <div className="accident-modal-header__left">
                        <h3 className="accident-modal-title">사고 정보 조회</h3>
                        {vehicleData?.plate && (
                            <span className="accident-modal-plate-badge">{vehicleData.plate}</span>
                        )}
                    </div>
                    <button className="accident-modal-close" onClick={onClose}>
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                            <path d="M25.6154 9C25.9977 8.61765 26.6176 8.61765 27 9C27.3824 9.38235 27.3824 10.0023 27 10.3846L10.3846 27C10.0023 27.3824 9.38235 27.3824 9 27C8.61765 26.6177 8.61765 25.9977 9 25.6154L25.6154 9Z" fill="#1C1C1C"/>
                            <path d="M27 25.6154C27.3824 25.9977 27.3824 26.6177 27 27C26.6176 27.3824 25.9977 27.3824 25.6154 27L9 10.3846C8.61765 10.0023 8.61765 9.38235 9 9C9.38235 8.61765 10.0023 8.61765 10.3846 9L27 25.6154Z" fill="#1C1C1C"/>
                        </svg>
                    </button>
                </div>

                {/* Status Box */}
                <div className="accident-modal-status-box">
                    <div className="accident-modal-status-icon">
                        <CarIcon />
                        <div className="accident-modal-status-warning">
                            <WarningIcon />
                        </div>
                    </div>
                    <div className="accident-modal-status-text">
                        <div className="accident-modal-status-title">사고 접수됨</div>
                        <div className="accident-modal-status-time">{accidentData.accidentDisplayTime || "-"} 발생</div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="accident-modal-info-grid">
                    {/* Left Column - 사고 발생 정보 */}
                    <div className="accident-modal-info-section">
                        <h4 className="accident-modal-section-title">사고 발생 정보</h4>
                        <div className="accident-modal-info-rows">
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">발생 일시</span>
                                <div className="accident-modal-info-value-box">
                                    {accidentData.accidentDisplayTime || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">접수 일시</span>
                                <div className="accident-modal-info-value-box">
                                    {accidentData.recordedAt ? formatYyMmDdHhMmSs(accidentData.recordedAt) : "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">처리 담당자</span>
                                <div className="accident-modal-info-value-box">
                                    {accidentData.handlerName || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">블랙박스 영상</span>
                                <div className="accident-modal-info-value-box">
                                    {accidentData.blackboxFileName || "-"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="accident-modal-info-divider" />

                    {/* Right Column - 차량 및 대여정보 */}
                    <div className="accident-modal-info-section">
                        <h4 className="accident-modal-section-title">차량 및 대여정보</h4>
                        <div className="accident-modal-info-rows">
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">차량번호</span>
                                <div className="accident-modal-info-value-box">
                                    {vehicleData?.plate || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">차종</span>
                                <div className="accident-modal-info-value-box">
                                    {vehicleData?.vehicleType || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">대여자</span>
                                <div className="accident-modal-info-value-box">
                                    {vehicleData?.renterName || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">연락처</span>
                                <div className="accident-modal-info-value-box">
                                    {vehicleData?.contactNumber || "-"}
                                </div>
                            </div>
                            <div className="accident-modal-info-row">
                                <span className="accident-modal-info-label">대여기간</span>
                                <div className="accident-modal-info-value-box">
                                    {vehicleData?.rentalPeriod?.start && vehicleData?.rentalPeriod?.end
                                        ? `${formatDisplayDate(vehicleData.rentalPeriod.start)} ~ ${formatDisplayDate(vehicleData.rentalPeriod.end)}`
                                        : "-"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Video Section */}
                {videoSrc && (
                    <div className="accident-modal-video-section">
                        <h4 className="accident-modal-section-title">블랙박스영상</h4>
                        <div className="accident-modal-video-container">
                            <video
                                ref={videoRef}
                                className="accident-modal-video"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onClick={handlePlayPause}
                            >
                                <source src={videoSrc} type="video/mp4" />
                            </video>

                            {/* Video Controls Overlay */}
                            <div className="accident-modal-video-controls">
                                <div className="accident-modal-video-controls-top">
                                    <button className="accident-modal-video-btn" onClick={handlePlayPause}>
                                        {isPlaying ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                <path d="M8 5v14l11-7L8 5z"/>
                                            </svg>
                                        )}
                                    </button>
                                    <span className="accident-modal-video-time">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </div>
                                <div className="accident-modal-video-controls-right">
                                    <button className="accident-modal-video-btn" onClick={toggleMute}>
                                        {isMuted ? (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                            </svg>
                                        ) : (
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                            </svg>
                                        )}
                                    </button>
                                    <button className="accident-modal-video-btn" onClick={handleFullscreen}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                            <path d="M4 18c0 1.1.9 2 2 2h4v-2H6v-4H4v4zm16-8V6c0-1.1-.9-2-2-2h-4v2h4v4h2zM6 6h4V4H6c-1.1 0-2 .9-2 2v4h2V6zm14 12v-4h-2v4h-4v2h4c1.1 0 2-.9 2-2z"/>
                                        </svg>
                                    </button>
                                </div>
                                {/* Progress Bar */}
                                <div className="accident-modal-video-progress" onClick={handleSeek}>
                                    <div
                                        className="accident-modal-video-progress-bar"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                    <div
                                        className="accident-modal-video-progress-handle"
                                        style={{ left: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="accident-modal-footer">
                    <div className="accident-modal-footer-divider" />
                    <button className="accident-modal-close-btn" onClick={onClose}>
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccidentInfoModal;
