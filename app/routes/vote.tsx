import { Button, Space, message } from "antd";
import { useRandomNames, useCreateVote } from "~/hooks/useSupabase";
import { useSession } from "~/hooks/useSession";
import { VOTE_TYPE } from "~/model/types";

export default function Vote() {
  const session = useSession();
  const { data: names, isLoading, refetch } = useRandomNames();
  const createVote = useCreateVote();

  if (!session) {
    return null;
  }

  if (isLoading || !names) {
    return <div>Loading names…</div>;
  }

  const handleVote = async (selectedNameIndex: number) => {
    if (!names || names.length !== 2) return;

    try {
      createVote.mutate({
        nameId: names[selectedNameIndex].id,
        userId: session.user.id,
        voteType: VOTE_TYPE.UP,
      });

      createVote.mutate({
        nameId: names[1 - selectedNameIndex].id,
        userId: session.user.id,
        voteType: VOTE_TYPE.DOWN,
      });

      message.success("Votes recorded successfully!");
      refetch();
    } catch (error) {
      message.error("Failed to record votes");
      console.error(error);
    }
  };

  const handleBan = (nameIndexes: number[]) => {
    if (!names) return;

    try {
      nameIndexes.forEach((index) => {
        createVote.mutate({
          nameId: names[index].id,
          userId: session.user.id,
          voteType: VOTE_TYPE.BAN,
        });
      });

      message.success("Ban votes recorded successfully!");
      refetch();
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
      <Space size="large">
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
