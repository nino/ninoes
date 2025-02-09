import { useState } from "react";
import { supabase } from "./supabaseClient";
import { Input } from "./components/Input";
import { useForm } from "react-hook-form";
import { Button } from "./components/Button";

type LoginForm = {
  email: string;
  password: string;
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const loginForm = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  const handleLogin = async (data: LoginForm) => {
    try {
      console.log({ data });
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        alert(error.message);
      } else {
        alert("Logged in successfully!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row flex flex-center">
      <div className="col-6 form-widget">
        <h1 className="header">Supabase + React</h1>
        <p className="description">
          Sign in using your email and password below
        </p>
        <form
          className="flex flex-col gap-2 m-4"
          onSubmit={loginForm.handleSubmit(handleLogin)}
        >
          <div>
            <Input
              {...loginForm.register("email", { required: true })}
              label="Email"
              type="email"
            />
          </div>
          <div>
            <Input
              {...loginForm.register("password", { required: true })}
              label="Password"
              type="password"
            />
          </div>
          <div className="flex justify-center mt-4">
            <Button type="submit" disabled={loading} loading={loading}>
              {loading ? <span>Loading</span> : <span>Sign in</span>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
