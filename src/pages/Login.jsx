import React from "react";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="page">
      <h1>Login</h1>
      <Link to="/dashboard">Enter</Link>
    </div>
  );
}
