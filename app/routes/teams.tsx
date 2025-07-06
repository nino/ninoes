import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
   useCreateTeam,
   useDeleteTeam,
   useJoinTeam,
   useLeaveTeam,
   useTeamMemberships,
   useTeams,
} from "~/hooks/useSupabase";
import type { Team, TeamMembershipWithTeam } from "~/model/types";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { User } from "@supabase/supabase-js";
import { requireUser } from "~/server/guards.server";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Table } from "~/components/ui/Table";
import { useToast } from "~/components/ui/Toast";
import type { ColumnDef } from "@tanstack/react-table";

const createTeamSchema = z.object({
   name: z.string().min(1, "Team name is required"),
});

const joinTeamSchema = z.object({
   teamId: z.string().min(1, "Team ID is required"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;
type JoinTeamFormData = z.infer<typeof joinTeamSchema>;

export const loader = async ({
   request,
}: LoaderFunctionArgs): Promise<{ user: User }> => {
   const { user } = await requireUser(request);
   return { user };
};

export default function Teams(): React.ReactNode {
   const { user } = useLoaderData<typeof loader>();
   const { showToast } = useToast();
   const { data: teamsData, isLoading } = useTeams({ page, pageSize });
   const { data: membershipsData, isLoading: isMembershipsLoading } =
      useTeamMemberships({
         page: membershipPage,
         pageSize: membershipPageSize,
      });
   const createTeam = useCreateTeam();
   const deleteTeam = useDeleteTeam();
   const joinTeam = useJoinTeam();
   const leaveTeam = useLeaveTeam();

   const createTeamForm = useForm<CreateTeamFormData>({
      resolver: zodResolver(createTeamSchema),
   });

   const joinTeamForm = useForm<JoinTeamFormData>({
      resolver: zodResolver(joinTeamSchema),
   });

   const columns: Array<ColumnDef<Team>> = [
      {
         accessorKey: "name",
         header: "Name",
      },
      {
         accessorKey: "created_at",
         header: "Created At",
         cell: ({ row }) => row.original.created_at.toLocaleDateString(),
      },
      {
         id: "actions",
         header: "Actions",
         cell: ({ row }) => (
            <div className="flex gap-2">
               <Button
                  variant="ghost"
                  onClick={async () => {
                     try {
                        await navigator.clipboard.writeText(row.original.id);
                        showToast("success", "Team ID copied to clipboard");
                     } catch (error) {
                        console.error("Failed to copy team ID", error);
                        showToast("error", "Failed to copy team ID");
                     }
                  }}
               >
                  Copy ID
               </Button>
               <Button
                  variant="danger"
                  onClick={async () => {
                     if (
                        window.confirm(
                           "Are you sure you want to delete this team?"
                        )
                     ) {
                        try {
                           await deleteTeam.mutateAsync(row.original.id);
                           showToast("success", "Team deleted successfully");
                        } catch (error) {
                           console.error("Failed to delete team", error);
                           showToast("error", "Failed to delete team");
                        }
                     }
                  }}
                  isLoading={deleteTeam.isPending}
               >
                  Delete
               </Button>
            </div>
         ),
      },
   ];

   const membershipColumns: Array<ColumnDef<TeamMembershipWithTeam>> = [
      {
         accessorKey: "team.name",
         header: "Team Name",
      },
      {
         accessorKey: "team.created_at",
         header: "Created At",
         cell: ({ row }) => row.original.team.created_at.toLocaleDateString(),
      },
      {
         id: "actions",
         header: "Actions",
         cell: ({ row }) => (
            <Button
               variant="danger"
               onClick={async () => {
                  if (
                     window.confirm("Are you sure you want to leave this team?")
                  ) {
                     try {
                        await leaveTeam.mutateAsync(row.original.id);
                        showToast("success", "Left team successfully");
                     } catch (error) {
                        console.error("Failed to leave team", error);
                        showToast("error", "Failed to leave team");
                     }
                  }
               }}
               isLoading={leaveTeam.isPending}
            >
               Leave
            </Button>
         ),
      },
   ];

   const handleCreateTeam = async (
      values: CreateTeamFormData
   ): Promise<void> => {
      try {
         await createTeam.mutateAsync({
            name: values.name,
            creator: user.id,
         });
         createTeamForm.reset();
         showToast("success", "Team created successfully");
      } catch (error) {
         console.error("Failed to create team", error);
         showToast("error", "Failed to create team");
      }
   };

   const handleJoinTeam = async (values: JoinTeamFormData): Promise<void> => {
      try {
         await joinTeam.mutateAsync({ teamId: values.teamId });
         joinTeamForm.reset();
         showToast("success", "Joined team successfully");
      } catch (error) {
         console.error("Failed to join team", error);
         showToast("error", "Failed to join team");
      }
   };

   return (
      <main className="p-4">
         <h1 className="text-3xl font-bold mb-8">Teams I created</h1>

         <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Team</h2>
            <form
               onSubmit={createTeamForm.handleSubmit(handleCreateTeam)}
               className="flex gap-4"
            >
               <Input
                  {...createTeamForm.register("name")}
                  placeholder="Team Name"
                  error={createTeamForm.formState.errors.name?.message}
               />
               <Button type="submit" isLoading={createTeam.isPending}>
                  Create Team
               </Button>
            </form>
         </div>

         <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Join Team</h2>
            <form
               onSubmit={joinTeamForm.handleSubmit(handleJoinTeam)}
               className="flex gap-4"
            >
               <Input
                  {...joinTeamForm.register("teamId")}
                  placeholder="Team ID"
                  error={joinTeamForm.formState.errors.teamId?.message}
               />
               <Button type="submit" isLoading={joinTeam.isPending}>
                  Join Team
               </Button>
            </form>
         </div>

         <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">My Teams</h2>
            <Table data={teamsData?.data ?? []} columns={columns} />
         </div>

         <div>
            <h2 className="text-xl font-semibold mb-4">
               Teams I&rsquo;m a member of
            </h2>
            <Table
               data={membershipsData?.data ?? []}
               columns={membershipColumns}
            />
         </div>
      </main>
   );
}
