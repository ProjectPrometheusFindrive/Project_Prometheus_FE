import React from 'react';
import './DiagnosticHero.css';

const DiagnosticHero = ({ vehicleName }) => {
  return (
    <div className="diagnostic-hero">
      <div className="diagnostic-hero-bg" />
      
      <div className="diagnostic-hero-content">
        <div className="diagnostic-hero-title">전체진단</div>
        <div className="diagnostic-hero-subtitle">{vehicleName || '차량 정보 없음'}</div>
      </div>

      {/* Car Graphic */}
      <div className="diagnostic-hero-graphic">
        <svg width="52" height="34" viewBox="0 0 52 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.45508 26.3247C3.45508 26.0087 3.71288 25.7524 4.0309 25.7524H9.78911C10.1071 25.7524 10.3649 26.0087 10.3649 26.3247V31.4752C10.3649 31.7913 10.1071 32.0475 9.78911 32.0475H4.0309C3.71288 32.0475 3.45508 31.7913 3.45508 31.4752V26.3247Z" fill="url(#paint0_linear_614_1012)"/>
          <path d="M34.5494 26.3247C34.5494 26.0087 34.8072 25.7524 35.1252 25.7524H40.8834C41.2014 25.7524 41.4592 26.0087 41.4592 26.3247V31.4752C41.4592 31.7913 41.2014 32.0475 40.8834 32.0475H35.1252C34.8072 32.0475 34.5494 31.7913 34.5494 31.4752V26.3247Z" fill="url(#paint1_linear_614_1012)"/>
          <path d="M11.691 0.00990469H23.4619V28.6138H5.3749C3.30782 28.6138 3.07813 27.1836 3.07813 26.0395V16.0281C3.07813 14.4263 4.60931 12.691 5.3749 12.0236H2.21684C-0.309602 11.7947 -0.654151 8.30504 1.06846 8.30504H4.51361C5.66199 8.30504 5.94908 10.212 5.94908 11.1654C6.33188 9.83058 7.26972 6.41718 7.95875 3.44238C8.64778 0.467568 10.734 -0.0854417 11.691 0.00990469Z" fill="url(#paint2_linear_614_1012)"/>
          <path d="M33.223 0.00990009H21.4521V28.6138H39.5391C41.6062 28.6138 41.8359 27.1836 41.8359 26.0395V16.0281C41.8359 14.4263 40.3047 12.691 39.5391 12.0235H42.6972C45.2236 11.7947 45.5682 8.30504 43.8456 8.30504H40.4004C39.252 8.30504 38.9649 10.212 38.9649 11.1654C38.5821 9.83058 37.6443 6.41718 36.9553 3.44237C36.2662 0.467563 34.18 -0.0854463 33.223 0.00990009Z" fill="url(#paint3_linear_614_1012)"/>
          <path d="M14.3949 20.0297H31.0938L29.3197 23.9967C28.9978 24.7167 28.2827 25.1802 27.494 25.1802H17.7754C16.9521 25.1802 16.2129 24.6757 15.9129 23.909L14.3949 20.0297Z" fill="#0978D1"/>
          <g opacity="0.5">
            <path d="M11.5164 18.0267C11.5164 19.449 10.3563 20.602 8.92518 20.602C7.4941 20.602 6.33398 19.449 6.33398 18.0267C6.33398 16.6045 7.4941 15.4515 8.92518 15.4515C10.3563 15.4515 11.5164 16.6045 11.5164 18.0267Z" fill="url(#paint4_linear_614_1012)"/>
            <path d="M38.5799 18.0267C38.5799 19.449 37.4198 20.602 35.9888 20.602C34.5577 20.602 33.3976 19.449 33.3976 18.0267C33.3976 16.6045 34.5577 15.4515 35.9888 15.4515C37.4198 15.4515 38.5799 16.6045 38.5799 18.0267Z" fill="url(#paint5_linear_614_1012)"/>
          </g>
          <path d="M11.804 2.00299H23.0325V12.0178H7.48535C7.86923 10.4918 8.80974 6.86734 9.50072 4.57824C9.93259 3.14754 10.3645 2.00299 11.804 2.00299Z" fill="#2072BE"/>
          <path d="M33.1094 2.00299H21.8809V12.0178H37.428C37.0441 10.4918 36.1036 6.86734 35.4127 4.57824C34.9808 3.14754 34.5489 2.00299 33.1094 2.00299Z" fill="#2072BE"/>
          <path d="M36.9473 17.5823C40.312 17.7647 43.3299 15.9481 44.4736 14.96V34C41.1531 31.7198 39.6036 30.6176 37.9434 29.0975C37.1465 28.3678 36.9473 26.7412 36.9473 26.1332V17.5823Z" fill="url(#paint6_radial_614_1012)"/>
          <path d="M51.9999 17.5823C48.6352 17.7647 45.6173 15.9481 44.4736 14.96V34C47.794 31.7198 49.3436 30.6176 51.0038 29.0975C51.8007 28.3678 51.9999 26.7412 51.9999 26.1332V17.5823Z" fill="url(#paint7_radial_614_1012)"/>
          <g filter="url(#filter0_d_614_1012)">
            <path d="M40.3682 24.4538L43.496 27.1738L48.2366 22.0739" stroke="url(#paint8_linear_614_1012)" strokeWidth="1.8" strokeLinecap="round"/>
          </g>
          <defs>
            <filter id="filter0_d_614_1012" x="38.4678" y="20.1738" width="11.6689" height="9.25049" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset/>
              <feGaussianBlur stdDeviation="0.5"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0.996078 0 0 0 0 0.466667 0 0 0 0 0.0117647 0 0 0 1 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_614_1012"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_614_1012" result="shape"/>
            </filter>
            <linearGradient id="paint0_linear_614_1012" x1="23.3209" y1="32.6198" x2="23.3209" y2="28.6138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#434343"/>
              <stop offset="1"/>
            </linearGradient>
            <linearGradient id="paint1_linear_614_1012" x1="23.3209" y1="32.6198" x2="23.3209" y2="28.6138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#434343"/>
              <stop offset="1"/>
            </linearGradient>
            <linearGradient id="paint2_linear_614_1012" x1="22.457" y1="20.0327" x2="22.457" y2="28.6138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#168DEB"/>
              <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
            <linearGradient id="paint3_linear_614_1012" x1="22.457" y1="20.0327" x2="22.457" y2="28.6138" gradientUnits="userSpaceOnUse">
              <stop stopColor="#168DEB"/>
              <stop offset="1" stopColor="#006BC0"/>
            </linearGradient>
            <linearGradient id="paint4_linear_614_1012" x1="21.3053" y1="20.3158" x2="21.3053" y2="16.0238" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ABDAFF"/>
              <stop offset="1" stopColor="white"/>
            </linearGradient>
            <linearGradient id="paint5_linear_614_1012" x1="21.3053" y1="20.3158" x2="21.3053" y2="16.0238" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ABDAFF"/>
              <stop offset="1" stopColor="white"/>
            </linearGradient>
            <radialGradient id="paint6_radial_614_1012" cx="0" cy="0" r="1" gradientTransform="matrix(-0.0440537 19.04 -15.0526 -0.0557233 44.5176 14.96)" gradientUnits="userSpaceOnUse">
              <stop offset="0.312169" stopColor="#FAC027"/>
              <stop offset="1" stopColor="#FF7301"/>
            </radialGradient>
            <radialGradient id="paint7_radial_614_1012" cx="0" cy="0" r="1" gradientTransform="matrix(-0.0440537 19.04 -15.0526 -0.0557233 44.5176 14.96)" gradientUnits="userSpaceOnUse">
              <stop offset="0.312169" stopColor="#FAC027"/>
              <stop offset="1" stopColor="#FF7301"/>
            </radialGradient>
            <linearGradient id="paint8_linear_614_1012" x1="43.727" y1="22.1872" x2="43.727" y2="32.1605" gradientUnits="userSpaceOnUse">
              <stop stopColor="white"/>
              <stop offset="1" stopColor="#FBAA1C"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default DiagnosticHero;