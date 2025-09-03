import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <nav className="grid">
        <Link to="/assets">Asset Status</Link>
        <Link to="/rentals">Rental Contracts</Link>
        <Link to="/returns">Return/Extension Status</Link>
        <Link to="/new-asset">Asset Register</Link>
        <Link to="/new-rental">Rental Register</Link>
        <Link to="/new-issue">Issue Register</Link>
      </nav>
      <Link to="/settings">Settings</Link>
    </div>
  );
}
