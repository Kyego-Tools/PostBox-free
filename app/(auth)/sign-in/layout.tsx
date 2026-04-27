import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "PostBox Sign In",
  description: "Sign in to your PostBox account",
};
export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
