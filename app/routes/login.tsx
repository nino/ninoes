import { getSupabaseServerClient } from "~/supabase/supabase.server";
import {
  redirect,
  type ActionFunctionArgs,
  useActionData,
  useSubmit,
} from "react-router";
import { z } from "zod";
import { Form, Input, Button, Alert, Card } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function action({ request }: ActionFunctionArgs) {
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

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const onFinish = (values: { email: string; password: string }) => {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    submit(formData, { method: "post" });
  };

  const errorMessage = actionData?.error
    ? typeof actionData.error === "string"
      ? actionData.error
      : actionData.error.message || "Login failed. Please try again."
    : null;

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <Card>
          {errorMessage && (
            <Alert
              message="Error"
              description={errorMessage}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                {
                  type: "email",
                  message: "Please enter a valid email address",
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please input your password!" },
                { min: 8, message: "Password must be at least 8 characters" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" size="large" block>
                Sign in
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
