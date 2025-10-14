import React, { useEffect, useState, useRef } from "react";
import Modal from "./Modal";
import { FaPlay, FaPause, FaStop, FaVolumeUp, FaVolumeDown, FaExpand, FaClock, FaUser, FaExclamationTriangle } from "react-icons/fa";
import { getSignedDownloadUrl } from "../utils/gcsApi";

const AccidentInfoModal = ({ isOpen, onClose, accidentData, vehicleData, title = "사고 정보 조회" }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef(null);
    const [videoSrc, setVideoSrc] = useState(null);

    if (!accidentData) return null;

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleStop = () => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
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
        const seekTime = (e.target.value / 100) * duration;
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            } else if (videoRef.current.webkitRequestFullscreen) {
                videoRef.current.webkitRequestFullscreen();
            } else if (videoRef.current.mozRequestFullScreen) {
                videoRef.current.mozRequestFullScreen();
            }
        }
    };

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                // 1) Local File object preview
                if (accidentData?.blackboxFile instanceof File) {
                    const url = URL.createObjectURL(accidentData.blackboxFile);
                    if (!cancelled) setVideoSrc(url);
                    return;
                }
                // 2) Prefer private object with signed URL
                if (accidentData?.blackboxGcsObjectName) {
                    const url = await getSignedDownloadUrl(accidentData.blackboxGcsObjectName);
                    if (!cancelled) setVideoSrc(url);
                    return;
                }
                // 3) Fallback to legacy public URL (may 403 if bucket is private)
                if (accidentData?.blackboxFileUrl) {
                    if (!cancelled) setVideoSrc(accidentData.blackboxFileUrl);
                    return;
                }
                // 4) Demo sample
                if (accidentData?.blackboxFileName === "blackbox_250922.mp4") {
                    if (!cancelled) setVideoSrc("/src/data/blackbox_250922.mp4");
                    return;
                }
                if (!cancelled) setVideoSrc(null);
            } catch (e) {
                if (!cancelled) setVideoSrc(null);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [accidentData?.blackboxFile, accidentData?.blackboxGcsObjectName, accidentData?.blackboxFileUrl, accidentData?.blackboxFileName]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            showFooter={false}
            ariaLabel="사고 정보 조회"
            size="large"
        >
            <div style={{ padding: "20px", maxHeight: "80vh", overflow: "auto" }}>
                {/* 상단 경고 배너 */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px",
                        backgroundColor: "#fff3e0",
                        border: "1px solid #ff9800",
                        borderRadius: "8px",
                        marginBottom: "24px",
                    }}
                >
                    <FaExclamationTriangle size={24} color="#ff9800" />
                    <div>
                        <div style={{ fontWeight: "600", color: "#e65100", fontSize: "1.1rem" }}>
                            사고 접수됨
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#f57c00", marginTop: "4px" }}>
                            {accidentData.accidentDisplayTime} 발생 사고
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                    {/* 사고 정보 */}
                    <div
                        style={{
                            padding: "20px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px",
                            border: "1px solid #dee2e6",
                        }}
                    >
                        <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FaClock size={16} color="#ff9800" />
                            사고 발생 정보
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>발생 일시:</strong>
                                <div style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginTop: "4px" }}>
                                    {accidentData.accidentDisplayTime || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>접수 일시:</strong>
                                <div style={{ fontSize: "0.95rem", color: "#333", marginTop: "4px" }}>
                                    {accidentData.recordedAt ? new Date(accidentData.recordedAt).toLocaleString("ko-KR") : "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>처리 담당자:</strong>
                                <div style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FaUser size={14} color="#666" />
                                    {accidentData.handlerName || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>블랙박스 영상:</strong>
                                <div style={{ fontSize: "0.95rem", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    {accidentData.blackboxFileName ? (
                                        <>
                                            <span style={{ color: "#28a745", fontWeight: "500" }}>✓</span>
                                            <span style={{ color: "#333" }}>{accidentData.blackboxFileName}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: "#dc3545", fontWeight: "500" }}>✗</span>
                                            <span style={{ color: "#666" }}>영상 파일 없음</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 차량 정보 */}
                    <div
                        style={{
                            padding: "20px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px",
                            border: "1px solid #dee2e6",
                        }}
                    >
                        <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", color: "#333" }}>
                            차량 및 대여 정보
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>차량번호:</strong>
                                <div style={{ fontSize: "1rem", fontWeight: "600", color: "#333", marginTop: "4px" }}>
                                    {vehicleData?.plate || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>차종:</strong>
                                <div style={{ fontSize: "0.95rem", color: "#333", marginTop: "4px" }}>
                                    {vehicleData?.vehicleType || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>대여자:</strong>
                                <div style={{ fontSize: "0.95rem", color: "#333", marginTop: "4px" }}>
                                    {vehicleData?.renterName || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>연락처:</strong>
                                <div style={{ fontSize: "0.95rem", color: "#333", marginTop: "4px" }}>
                                    {vehicleData?.contactNumber || "-"}
                                </div>
                            </div>
                            <div>
                                <strong style={{ color: "#666", fontSize: "0.9rem" }}>대여 기간:</strong>
                                <div style={{ fontSize: "0.95rem", color: "#333", marginTop: "4px" }}>
                                    {vehicleData?.rentalPeriod?.start && vehicleData?.rentalPeriod?.end
                                        ? `${new Date(vehicleData.rentalPeriod.start).toLocaleDateString()} ~ ${new Date(vehicleData.rentalPeriod.end).toLocaleDateString()}`
                                        : "-"
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 블랙박스 영상 재생 */}
                {videoSrc && (
                    <div
                        style={{
                            backgroundColor: "#000",
                            borderRadius: "8px",
                            overflow: "hidden",
                            marginBottom: "16px",
                        }}
                    >
                        <div
                            style={{
                                padding: "12px 16px",
                                backgroundColor: "#1a1a1a",
                                color: "white",
                                fontSize: "1rem",
                                fontWeight: "600",
                                borderBottom: "1px solid #333",
                            }}
                        >
                            🎥 블랙박스 영상 - {accidentData.blackboxFileName}
                        </div>

                        <div style={{ position: "relative" }}>
                            <video
                                ref={videoRef}
                                style={{
                                    width: "100%",
                                    height: "400px",
                                    objectFit: "contain",
                                    backgroundColor: "#000",
                                }}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                controls={false}
                            >
                                <source src={videoSrc} type="video/mp4" />
                                브라우저가 비디오 재생을 지원하지 않습니다.
                            </video>
                        </div>

                        {/* 비디오 컨트롤 */}
                        <div
                            style={{
                                padding: "12px 16px",
                                backgroundColor: "#1a1a1a",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            {/* 재생/일시정지 버튼 */}
                            <button
                                onClick={handlePlayPause}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = "#333"}
                                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                            </button>

                            {/* 정지 버튼 */}
                            <button
                                onClick={handleStop}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = "#333"}
                                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                <FaStop size={16} />
                            </button>

                            {/* 진행바 */}
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.85rem", minWidth: "40px" }}>
                                    {formatTime(currentTime)}
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={duration ? (currentTime / duration) * 100 : 0}
                                    onChange={handleSeek}
                                    style={{
                                        flex: 1,
                                        height: "4px",
                                        background: "#333",
                                        outline: "none",
                                        cursor: "pointer",
                                    }}
                                />
                                <span style={{ fontSize: "0.85rem", minWidth: "40px" }}>
                                    {formatTime(duration)}
                                </span>
                            </div>

                            {/* 볼륨 컨트롤 */}
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <FaVolumeDown size={14} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    style={{
                                        width: "80px",
                                        height: "4px",
                                        background: "#333",
                                        outline: "none",
                                        cursor: "pointer",
                                    }}
                                />
                                <FaVolumeUp size={14} />
                            </div>

                            {/* 전체화면 버튼 */}
                            <button
                                onClick={handleFullscreen}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = "#333"}
                                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
                            >
                                <FaExpand size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 영상이 있지만 파일을 찾을 수 없을 때 */}
                {!videoSrc && accidentData.blackboxFileName && (
                    <div
                        style={{
                            padding: "20px",
                            backgroundColor: "#fff3e0",
                            border: "2px dashed #ff9800",
                            borderRadius: "8px",
                            textAlign: "center",
                            marginBottom: "16px",
                        }}
                    >
                        <div style={{ fontSize: "1rem", color: "#e65100", marginBottom: "8px", fontWeight: "600" }}>
                            📹 블랙박스 영상 파일 누락
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#f57c00" }}>
                            등록된 파일: {accidentData.blackboxFileName}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#ff9800", marginTop: "8px" }}>
                            영상 파일을 찾을 수 없거나 지원하지 않는 형식입니다.
                        </div>
                    </div>
                )}

                {/* 영상이 아예 없을 때 */}
                {!videoSrc && !accidentData.blackboxFileName && (
                    <div
                        style={{
                            padding: "24px",
                            backgroundColor: "#f8f9fa",
                            border: "2px dashed #dee2e6",
                            borderRadius: "8px",
                            textAlign: "center",
                            marginBottom: "16px",
                        }}
                    >
                        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📋</div>
                        <div style={{ fontSize: "1.1rem", color: "#495057", marginBottom: "8px", fontWeight: "600" }}>
                            사고 정보만 등록됨
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#6c757d", lineHeight: "1.5" }}>
                            블랙박스 영상은 등록되지 않았습니다.<br />
                            사고 발생 시각과 담당자 정보를 확인하세요.
                        </div>
                    </div>
                )}

                {/* 하단 액션 버튼 */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "16px", borderTop: "1px solid #dee2e6" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#5a6268"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "#6c757d"}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AccidentInfoModal;
