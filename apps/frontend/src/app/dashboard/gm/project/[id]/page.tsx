import { redirect } from "next/navigation";

export default async function LegacyGMProjectDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/project/${id}`);
}
