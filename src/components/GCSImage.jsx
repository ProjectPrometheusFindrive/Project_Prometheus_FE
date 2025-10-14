import React, { useEffect, useState } from "react";
import { getSignedDownloadUrl } from "../utils/gcsApi";

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

        // Backward compatibility: if full URL is provided, use as-is (may 403 if private)
        if (typeof objectName === "string" && /^(https?:)?\/\//i.test(objectName)) {
          if (!cancelled) {
            setSignedUrl(objectName);
            setLoading(false);
          }
          return;
        }

        const url = await getSignedDownloadUrl(objectName);
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

