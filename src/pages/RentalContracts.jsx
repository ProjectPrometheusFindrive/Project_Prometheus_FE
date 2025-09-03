import React from "react";
import { rentals } from "../data/rentals";
import RentalsMap from "../components/RentalsMap";

export default function RentalContracts() {
  return (
    <div className="page">
      <h1>Rentals</h1>
      <div className="page-scroll">
        <RentalsMap rentals={rentals} />
      </div>
    </div>
  );
}
