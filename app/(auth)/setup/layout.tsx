import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "PostBox Setup",
  description: "Set up your PostBox account",
};
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
