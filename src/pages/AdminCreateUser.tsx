import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function AdminCreateUser() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createUser = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("profiles").insert([
      {
        id: data.user?.id,
        email: email,
        role: "staff",
        must_change_password: true,
      },
    ]);

    alert("User created successfully");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Staff User</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Temporary Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={createUser}>Create User</button>
    </div>
  );
}
