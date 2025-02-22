import { useState } from "react";
import { Typography, Table, Form, Input, Button, App, Popconfirm } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  useTeams,
  useCreateTeam,
  useDeleteTeam,
  useTeamMemberships,
  useJoinTeam,
  useLeaveTeam,
} from "~/hooks/useSupabase";
import { useSession } from "~/hooks/useSession";
import type { Team, TeamMembershipWithTeam } from "~/model/types";

type CreateTeamFormData = {
  name: string;
};

type JoinTeamFormData = {
  teamId: string;
};

export default function Teams() {
  const { message } = App.useApp();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [membershipPage, setMembershipPage] = useState(0);
  const [membershipPageSize, setMembershipPageSize] = useState(10);
  const session = useSession();
  const { data: teamsData, isLoading } = useTeams({ page, pageSize });
  const { data: membershipsData, isLoading: isMembershipsLoading } =
    useTeamMemberships({ page: membershipPage, pageSize: membershipPageSize });
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const joinTeam = useJoinTeam();
  const leaveTeam = useLeaveTeam();
  const [form] = Form.useForm<CreateTeamFormData>();
  const [joinForm] = Form.useForm<JoinTeamFormData>();

  const columns: ColumnsType<Team> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: Date) => date.toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<CopyOutlined />}
            title="Copy ID"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(record.id);
                message.success("Team ID copied to clipboard");
              } catch (error) {
                console.error("Failed to copy team ID", error);
                message.error("Failed to copy team ID");
              }
            }}
          />
          <Popconfirm
            title="Delete team"
            description="Are you sure you want to delete this team?"
            onConfirm={async () => {
              try {
                await deleteTeam.mutateAsync(record.id);
                message.success("Team deleted successfully");
              } catch (error) {
                console.error("Failed to delete team", error);
                message.error("Failed to delete team");
              }
            }}
            okText="Yes"
            cancelText="No"
          >
            <Button danger loading={deleteTeam.isPending}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const membershipColumns: ColumnsType<TeamMembershipWithTeam> = [
    {
      title: "Team Name",
      dataIndex: ["team", "name"],
      key: "name",
    },
    {
      title: "Created At",
      dataIndex: ["team", "created_at"],
      key: "created_at",
      render: (date: Date) => date.toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Leave team"
          description="Are you sure you want to leave this team?"
          onConfirm={async () => {
            try {
              await leaveTeam.mutateAsync(record.id);
              message.success("Left team successfully");
            } catch (error) {
              console.error("Failed to leave team", error);
              message.error("Failed to leave team");
            }
          }}
          okText="Yes"
          cancelText="No"
        >
          <Button danger loading={leaveTeam.isPending}>
            Leave
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleCreateTeam = async (values: CreateTeamFormData) => {
    if (!session?.user.id) {
      message.error("You must be logged in to create a team");
      return;
    }

    try {
      await createTeam.mutateAsync({
        name: values.name,
        creator: session.user.id,
      });
      message.success("Team created successfully");
      form.resetFields();
    } catch (error) {
      console.error("Failed to create team", error);
      message.error("Failed to create team");
    }
  };

  const handleJoinTeam = async (values: JoinTeamFormData) => {
    if (!session?.user.id) {
      message.error("You must be logged in to join a team");
      return;
    }

    try {
      await joinTeam.mutateAsync({ teamId: values.teamId });
      message.success("Joined team successfully");
      joinForm.resetFields();
    } catch (error) {
      console.error("Failed to join team", error);
      message.error("Failed to join team");
    }
  };

  return (
    <main className="p-4">
      <Typography.Title level={1}>Teams I created</Typography.Title>

      <div className="mb-8">
        <Typography.Title level={3}>Create New Team</Typography.Title>
        <Form form={form} onFinish={handleCreateTeam} layout="inline">
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Please input team name" }]}
          >
            <Input placeholder="Team Name" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createTeam.isPending}
            >
              Create Team
            </Button>
          </Form.Item>
        </Form>
      </div>

      <Table
        columns={columns}
        dataSource={teamsData?.data}
        rowKey="id"
        loading={isLoading}
        pagination={{
          total: teamsData?.total,
          pageSize,
          current: page + 1,
          onChange: (newPage, newPageSize) => {
            setPage(newPage - 1);
            setPageSize(newPageSize);
          },
        }}
      />

      <Typography.Title level={1} className="mt-8">
        Teams I’m a Member Of
      </Typography.Title>

      <div className="mb-8">
        <Typography.Title level={3}>Join Team</Typography.Title>
        <Form form={joinForm} onFinish={handleJoinTeam} layout="inline">
          <Form.Item
            name="teamId"
            rules={[{ required: true, message: "Please input team ID" }]}
          >
            <Input placeholder="Team ID" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={joinTeam.isPending}
            >
              Join Team
            </Button>
          </Form.Item>
        </Form>
      </div>

      <Table
        columns={membershipColumns}
        dataSource={membershipsData?.data}
        rowKey="id"
        loading={isMembershipsLoading}
        pagination={{
          total: membershipsData?.total,
          pageSize: membershipPageSize,
          current: membershipPage + 1,
          onChange: (newPage, newPageSize) => {
            setMembershipPage(newPage - 1);
            setMembershipPageSize(newPageSize);
          },
        }}
      />
    </main>
  );
}
