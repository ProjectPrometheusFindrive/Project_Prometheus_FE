import React from "react";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalsMapPage() {
  return (
    <div className="page">
      <h1>Rental Map</h1>
      <div className="page-scroll">
        <div className="map-view">
          <div className="legend">
            <span className="legend__item"><span className="marker marker--active">A</span> Active</span>
            <span className="legend__item"><span className="marker marker--overdue">O</span> Overdue</span>
            <span className="legend__item"><span className="marker marker--stolen">S</span> Stolen</span>
            <span className="legend__item"><span className="marker marker--car">C</span> Other</span>
          </div>
          <RentalsMap rentals={rentals} />
        </div>
      </div>
    </div>
  );
}

