import React, { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ChangePasswordModal from "./modals/ChangePasswordModal";

export default function ForcePasswordChange() {
  const { user } = useAuth();
  const must = useMemo(() => Boolean(user && user.mustChangePassword), [user]);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    if (must) setOpen(true);
    else setOpen(false);
  }, [must]);

  if (!must) return null;
  return (
    <ChangePasswordModal
      open={open}
      onClose={() => setOpen(false)}
      onChanged={() => setOpen(false)}
    />
  );
}

