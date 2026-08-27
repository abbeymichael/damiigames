import { redirect } from "next/navigation";

export default async function RoomRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  redirect(`/arena?room=${cleanCode}`);
}
