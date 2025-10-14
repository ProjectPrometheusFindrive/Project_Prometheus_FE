import React, { useEffect, useState } from "react";
import { getSignedDownloadUrl, deriveObjectName } from "../utils/gcsApi";

function GCSImage({ objectName, alt = "", ...props }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!objectName) {
          setSignedUrl(null);
          setLoading(false);
          return;
        }

        // If full GCS URL is provided, derive objectName to sign; otherwise allow full URL as-is
        let candidate = objectName;
        if (typeof objectName === "string" && /^(https?:)?\/\//i.test(objectName)) {
          const derived = deriveObjectName(objectName);
          if (derived) candidate = derived;
          else {
            if (!cancelled) {
              setSignedUrl(objectName);
              setLoading(false);
            }
            return;
          }
        }

        const url = await getSignedDownloadUrl(candidate);
        if (!cancelled) {
          setSignedUrl(url);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [objectName]);

  if (loading) return <div className="spinner" aria-label="Loading" />;
  if (error) return <div className="error-message">Failed to load image</div>;
  if (!signedUrl) return null;
  return <img src={signedUrl} alt={alt} {...props} />;
}

export default GCSImage;
