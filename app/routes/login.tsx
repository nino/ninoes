import { getSupabaseServerClient } from "~/supabase/supabase.server";
import {
  redirect,
  type ActionFunctionArgs,
  useActionData,
  useSubmit,
} from "react-router";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useToast } from "~/components/ui/Toast";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export async function action({
  request,
}: ActionFunctionArgs): Promise<
  Response | { error: string } | { error: AuthError }
> {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  const parsedData = LoginSchema.safeParse(data);
  if (!parsedData.success) {
    return { error: "Invalid input" };
  }

  const { email, password } = parsedData.data;
  const headersToSet = new Headers();
  const { supabase, headers } = getSupabaseServerClient(request, headersToSet);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error };
  }

  return redirect("/", {
    headers,
  });
}

export default function LoginPage(): ReactNode {
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = (values: LoginFormData): void => {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    void submit(formData, { method: "post" });
  };

  const errorMessage =
    actionData?.error != null
      ? typeof actionData.error === "string"
        ? actionData.error
        : actionData.error.message || "Login failed. Please try again."
      : null;

  if (errorMessage) {
    showToast("error", errorMessage);
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="bg-white p-8 rounded-lg shadow">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
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
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
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
