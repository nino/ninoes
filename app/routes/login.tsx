import { getSupabaseServerClient } from "~/supabase/supabase.server";
import {
   type ActionFunctionArgs,
   redirect,
   useActionData,
   useSubmit,
} from "react-router";
import { z } from "zod";
import { AuthError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useToast } from "~/components/ui/Toast";
import { cardClass } from "~/components/ui/styles";

const LoginSchema = z.object({ email: z.email(), password: z.string().min(8) });

type LoginFormData = z.infer<typeof LoginSchema>;

export async function action({
   request,
}: ActionFunctionArgs): Promise<Response | { error: AuthError }> {
   const formData = await request.formData();
   const data = Object.fromEntries(formData);
   const parsedData = LoginSchema.safeParse(data);
   if (!parsedData.success) {
      return { error: new AuthError("Invalid input") };
   }

   const { email, password } = parsedData.data;
   const headersToSet = new Headers();
   const { supabase, headers } = getSupabaseServerClient(request, headersToSet);
   const { error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) {
      return { error };
   }

   return redirect("/", { headers });
}

export default function LoginPage(): ReactNode {
   const actionData = useActionData<typeof action>();
   const submit = useSubmit();
   const { showToast } = useToast();

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<LoginFormData>({ resolver: zodResolver(LoginSchema) });

   const onSubmit = (values: LoginFormData): void => {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);
      void submit(formData, { method: "post" });
   };

   const errorMessage = actionData?.error != null ? actionData.error.message : null;

   if (errorMessage) {
      showToast("error", errorMessage);
   }

   return (
      <div className="flex justify-center py-4 sm:py-12">
         <div className={`w-full max-w-sm ${cardClass}`}>
            <div className="p-6 pb-0">
               <h1 className="font-title text-2xl">Sign in to your account</h1>
            </div>
            <div className="p-6">
               <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <div>
                     <label htmlFor="email" className="text-sm font-medium">
                        Email
                     </label>
                     <div className="mt-2">
                        <Input
                           id="email"
                           type="email"
                           autoComplete="email"
                           {...register("email")}
                           error={errors.email?.message}
                        />
                     </div>
                  </div>

                  <div>
                     <label htmlFor="password" className="text-sm font-medium">
                        Password
                     </label>
                     <div className="mt-2">
                        <Input
                           id="password"
                           type="password"
                           autoComplete="current-password"
                           {...register("password")}
                           error={errors.password?.message}
                        />
                     </div>
                  </div>

                  <div>
                     <Button type="submit" className="w-full">
                        Sign in
                     </Button>
                  </div>
               </form>
            </div>
         </div>
      </div>
   );
}
