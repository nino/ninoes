import { type ReactNode, useState } from "react";
import { supabase } from "./supabaseClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { useToast } from "./components/ui/Toast";

const loginSchema = z.object({
   email: z.email("Please enter a valid email"),
   password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Auth(): ReactNode {
   const [loading, setLoading] = useState(false);
   const { showToast } = useToast();
   const form = useForm<LoginForm>({
      resolver: zodResolver(loginSchema),
   });

   const handleLogin = async (data: LoginForm): Promise<void> => {
      try {
         setLoading(true);
         const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
         });

         if (error) {
            showToast("error", error.message);
         } else {
            showToast("success", "Logged in successfully!");
         }
      } catch (error) {
         console.error("Login error:", error);
         showToast("error", "An error occurred during login");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
         <div className="max-w-md w-full space-y-8">
            <div>
               <h1 className="text-3xl font-bold text-center">Supabase + React</h1>
               <p className="mt-2 text-center text-gray-600">
                  Sign in using your email and password below
               </p>
            </div>
            <form onSubmit={form.handleSubmit(handleLogin)} className="mt-8 space-y-6">
               <div className="space-y-4">
                  <Input
                     {...form.register("email")}
                     type="email"
                     label="Email"
                     error={form.formState.errors.email?.message}
                  />

                  <Input
                     {...form.register("password")}
                     type="password"
                     label="Password"
                     error={form.formState.errors.password?.message}
                  />
               </div>

               <div className="flex justify-center">
                  <Button type="submit" isLoading={loading}>
                     Sign in
                  </Button>
               </div>
            </form>
         </div>
      </div>
   );
}
