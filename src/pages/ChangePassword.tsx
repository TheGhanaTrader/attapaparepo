import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function ChangePassword() {
  const [password, setPassword] = useState("");

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;

    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user?.id);

    alert("Password updated successfully");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Change Password</h2>

      <input
        type="password"
        placeholder="New Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={updatePassword}>Update Password</button>
    </div>
  );
}
