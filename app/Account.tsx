import { supabase } from "./supabaseClient";
import { Layout, Table, Button } from "antd";
import { useNames, useVotes } from "./hooks/useSupabase";

export default function Account() {
  const { data: names = [], isLoading: isLoadingNames } = useNames();

  const { data: votes = [], isLoading: isLoadingVotes } = useVotes();

  const nameColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  const voteColumns = [
    {
      title: "Name ID",
      dataIndex: "name_id",
      key: "name_id",
    },
    {
      title: "User ID",
      dataIndex: "user_id",
      key: "user_id",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <Layout>
      <Layout.Content className="p-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Names</h2>
            <Table
              dataSource={names}
              columns={nameColumns}
              loading={isLoadingNames}
              rowKey="id"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Votes</h2>
            <Table
              dataSource={votes}
              columns={voteColumns}
              loading={isLoadingVotes}
              rowKey="id"
            />
          </div>
        </div>
      </Layout.Content>
      <Layout.Footer>
        <Button onClick={() => supabase.auth.signOut()}>Sign Out</Button>
      </Layout.Footer>
    </Layout>
  );
}
