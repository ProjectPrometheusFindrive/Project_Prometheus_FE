import React, { useEffect, useState } from "react";
import Toast from "./Toast";
import { onToast } from "../utils/toast";

export default function GlobalToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const off = onToast((detail) => {
      setToast({
        message: detail?.message || "",
        type: detail?.type || "info",
        duration: typeof detail?.duration === "number" ? detail.duration : 3000
      });
    });
    return () => off && off();
  }, []);

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onClose={() => setToast(null)}
    />
  );
}

