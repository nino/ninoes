import { useState } from "react";
import { supabase } from "./supabaseClient";
import { Button, Form, Input, Layout, Menu, message } from "antd";

type LoginForm = {
  email: string;
  password: string;
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginForm>();

  const handleLogin = async (data: LoginForm) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        message.error(error.message);
      } else {
        message.success("Logged in successfully!");
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Layout.Header>
        <Menu
          items={[
            { key: "1", title: "Yo", label: "Dunno" },
            { key: "2", title: "Yo2", label: "Dunno again" },
          ]}
          mode="horizontal"
          theme="dark"
        />
      </Layout.Header>
      <Layout.Content className="p-8">
        <div>
          <h1 className="header">Supabase + React</h1>
          <p className="description">
            Sign in using your email and password below
          </p>
          <Form
            form={form}
            onFinish={handleLogin}
            layout="vertical"
            className="flex flex-col gap-2 m-4"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input type="email" />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: "Please input your password!" },
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item className="flex justify-center mt-4">
              <Button type="primary" htmlType="submit" loading={loading}>
                Sign in
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Layout.Content>
    </Layout>
  );
}
