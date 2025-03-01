import { Button, Space, App, Spin } from "antd";
import { useRandomNames, useCreateVote } from "~/hooks/useSupabase";
import { VOTE_TYPE } from "~/model/types";
import { requireUser } from "~/server/guards.server";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<{ user: User }> => {
  const { user } = await requireUser(request);
  return { user };
};

export default function Vote(): ReactNode {
  const { user } = useLoaderData<typeof loader>();
  const { data: names, isLoading, refetch } = useRandomNames();
  const createVote = useCreateVote();
  const { message } = App.useApp();

  if (isLoading || !names) {
    return <Spin />;
  }

  const handleVote = async (selectedNameIndex: number): Promise<void> => {
    if (names.length !== 2) return;

    try {
      createVote.mutate({
        nameId: names[selectedNameIndex].id,
        userId: user.id,
        voteType: VOTE_TYPE.UP,
      });

      createVote.mutate({
        nameId: names[1 - selectedNameIndex].id,
        userId: user.id,
        voteType: VOTE_TYPE.DOWN,
      });

      message.success("Votes recorded successfully!");
      void refetch();
    } catch (error) {
      message.error("Failed to record votes");
      console.error(error);
    }
  };

  const handleBan = (nameIndexes: Array<number>): void => {
    try {
      nameIndexes.forEach((index) => {
        createVote.mutate({
          nameId: names[index].id,
          userId: user.id,
          voteType: VOTE_TYPE.BAN,
        });
      });

      message.success("Ban votes recorded successfully!");
      void refetch();
    } catch (error) {
      message.error("Failed to record ban votes");
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <h1 className="text-2xl font-bold">Choose a name</h1>
      <Space size="large">
        {names.map((name, index) => (
          <Button
            key={name.id}
            size="large"
            type="primary"
            onClick={() => handleVote(index)}
            loading={createVote.isPending}
          >
            {name.name}
          </Button>
        ))}
      </Space>
      <Space size="large" wrap className="justify-center">
        <Button
          danger
          onClick={() => handleBan([0])}
          loading={createVote.isPending}
        >
          Ban {names[0].name}
        </Button>
        <Button
          danger
          onClick={() => handleBan([1])}
          loading={createVote.isPending}
        >
          Ban {names[1].name}
        </Button>
        <Button
          danger
          onClick={() => handleBan([0, 1])}
          loading={createVote.isPending}
        >
          Ban both
        </Button>
      </Space>
    </div>
  );
}
