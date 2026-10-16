import { formatCode, isValidCode, normalizeCode } from "@gambit/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OnlineGame } from "./OnlineGame";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: `Sala ${formatCode(code)} · Gambit` };
}

export default async function RoomPage({ params }: Props) {
  const code = normalizeCode((await params).code);
  if (!isValidCode(code)) notFound();
  return <OnlineGame code={code} />;
}
