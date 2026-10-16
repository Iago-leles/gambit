import type { Metadata } from "next";
import { LocalGame } from "./LocalGame";

export const metadata: Metadata = {
  title: "Partida local · Gambit",
};

export default function LocalPage() {
  return <LocalGame />;
}
