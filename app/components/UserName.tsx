import { useUser } from "../hooks/useSupabase";

export function UserName({ userId }: { userId: string }) {
  const { data: user } = useUser(userId);
  return <span>{user?.name}</span>;
}
