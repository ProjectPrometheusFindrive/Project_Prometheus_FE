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
                // 4) Demo sample (restricted to explicit opt-in in dev)
                try {
                    const enableDemo = import.meta.env?.VITE_ENABLE_DEMO_FALLBACK === "true";
                    if (import.meta.env?.DEV && enableDemo && accidentData?.blackboxFileName === "blackbox_250922.mp4") {
                        if (!cancelled) setVideoSrc("/src/data/blackbox_250922.mp4");
                        return;
                    }
                } catch {}
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

    if (!accidentData) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            showFooter={false}
            ariaLabel="사고 정보 조회"
            size="large"
        >
            <div className="p-5 max-h-[80vh] overflow-auto">
                {/* 상단 경고 배너 */}
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-500 rounded-lg mb-6">
                    <FaExclamationTriangle size={24} color="#ff9800" />
                    <div>
                        <div className="font-semibold text-[1.1rem] text-[#e65100]">
                            사고 접수됨
                        </div>
                        <div className="text-[0.9rem] mt-1 text-[#f57c00]">
                            {accidentData.accidentDisplayTime} 발생 사고
                        </div>
                    </div>
                </div>

                <div className="grid [grid-template-columns:1fr_1fr] gap-6 mb-6">
                    {/* 사고 정보 */}
                    <div className="p-5 bg-gray-50 rounded-lg border border-[#dee2e6]">
                        <h3 className="m-0 mb-4 text-[1.1rem] text-gray-800 flex items-center gap-2">
                            <FaClock size={16} color="#ff9800" />
                            사고 발생 정보
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div>
                                <strong className="text-[0.9rem] text-gray-600">발생 일시:</strong>
                                <div className="text-[1rem] font-semibold text-gray-800 mt-1">
                                    {accidentData.accidentDisplayTime || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600">접수 일시:</strong>
                                <div className="text-[0.95rem] text-gray-800 mt-1">
                                    {accidentData.recordedAt ? new Date(accidentData.recordedAt).toLocaleString("ko-KR") : "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600">처리 담당자:</strong>
                                <div className="text-[1rem] font-semibold text-gray-800 mt-1 flex items-center gap-1.5">
                                    <FaUser size={14} color="#666" />
                                    {accidentData.handlerName || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600">블랙박스 영상:</strong>
                                <div className="text-[0.95rem] mt-1 flex items-center gap-1.5">
                                    {accidentData.blackboxFileName ? (
                                        <>
                                            <span className="text-emerald-600 font-medium">✓</span>
                                            <span className="text-gray-800">{accidentData.blackboxFileName}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-red-600 font-medium">✗</span>
                                            <span className="text-gray-600">영상 파일 없음</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 차량 정보 */}
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[#dee2e6] dark:border-gray-600">
                        <h3 className="m-0 mb-4 text-[1.1rem] text-gray-800 dark:text-gray-100">
                            차량 및 대여 정보
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div>
                                <strong className="text-[0.9rem] text-gray-600 dark:text-gray-400">차량번호:</strong>
                                <div className="text-[1rem] font-semibold text-gray-800 dark:text-gray-100 mt-1">
                                    {vehicleData?.plate || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600 dark:text-gray-400">차종:</strong>
                                <div className="text-[0.95rem] text-gray-800 dark:text-gray-100 mt-1">
                                    {vehicleData?.vehicleType || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600 dark:text-gray-400">대여자:</strong>
                                <div className="text-[0.95rem] text-gray-800 dark:text-gray-100 mt-1">
                                    {vehicleData?.renterName || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600 dark:text-gray-400">연락처:</strong>
                                <div className="text-[0.95rem] text-gray-800 dark:text-gray-100 mt-1">
                                    {vehicleData?.contactNumber || "-"}
                                </div>
                            </div>
                            <div>
                                <strong className="text-[0.9rem] text-gray-600 dark:text-gray-400">대여 기간:</strong>
                                <div className="text-[0.95rem] text-gray-800 dark:text-gray-100 mt-1">
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
                    <div className="bg-black rounded-lg overflow-hidden mb-4">
                        <div className="py-3 px-4 bg-zinc-900 text-white text-[1rem] font-semibold border-b border-[#333]">
                            🎥 블랙박스 영상 - {accidentData.blackboxFileName}
                        </div>

                        <div className="relative">
                            <video
                                ref={videoRef}
                                className="w-full h-[60vh] object-contain bg-black"
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
                        <div className="py-3 px-4 bg-zinc-900 text-white flex items-center gap-3">
                            {/* 재생/일시정지 버튼 */}
                            <button onClick={handlePlayPause} className="p-2 rounded hover:bg-zinc-800" type="button">
                                {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} />}
                            </button>

                            {/* 정지 버튼 */}
                            <button onClick={handleStop} className="p-2 rounded hover:bg-zinc-800" type="button">
                                <FaStop size={16} />
                            </button>

                            {/* 진행바 */}
                            <div className="flex-1 flex items-center gap-2">
                                <span className="text-[0.85rem] min-w-10">
                                    {formatTime(currentTime)}
                                </span>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={duration ? (currentTime / duration) * 100 : 0}
                                    onChange={handleSeek}
                                    className="flex-1 h-1 bg-zinc-800 cursor-pointer"
                                />
                                <span className="text-[0.85rem] min-w-10">
                                    {formatTime(duration)}
                                </span>
                            </div>

                            {/* 볼륨 컨트롤 */}
                            <div className="flex items-center gap-1.5">
                                <FaVolumeDown size={14} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 h-1 bg-zinc-800 cursor-pointer"
                                />
                                <FaVolumeUp size={14} />
                            </div>

                            {/* 전체화면 버튼 */}
                            <button onClick={handleFullscreen} className="p-2 rounded hover:bg-zinc-800" type="button">
                                <FaExpand size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 영상이 있지만 파일을 찾을 수 없을 때 */}
                {!videoSrc && accidentData.blackboxFileName && (
                    <div className="p-5 bg-amber-50 border-2 border-dashed border-[#ff9800] rounded-lg text-center mb-4">
                        <div className="text-[1rem] mb-2 font-semibold text-[#e65100]">
                            📹 블랙박스 영상 파일 누락
                        </div>
                        <div className="text-[0.9rem] text-[#f57c00]">
                            등록된 파일: {accidentData.blackboxFileName}
                        </div>
                        <div className="text-[0.85rem] mt-2 text-[#ff9800]">
                            영상 파일을 찾을 수 없거나 지원하지 않는 형식입니다.
                        </div>
                    </div>
                )}

                {/* 영상이 아예 없을 때 */}
                {!videoSrc && !accidentData.blackboxFileName && (
                    <div className="p-6 bg-gray-50 border-2 border-dashed rounded-lg text-center mb-4">
                        <div className="text-3xl mb-3">📋</div>
                        <div className="text-[1.1rem] text-gray-700 mb-2 font-semibold">
                            사고 정보만 등록됨
                        </div>
                        <div className="text-[0.9rem] text-gray-600 leading-relaxed">
                            블랙박스 영상은 등록되지 않았습니다.<br />
                            사고 발생 시각과 담당자 정보를 확인하세요.
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    );
};

export default AccidentInfoModal;
