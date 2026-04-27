import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "PostBox Change Password",
  description: "Change your PostBox password",
};
export default function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
