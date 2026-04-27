import React from "react";
import { ClientLayout } from "./client-layout";
import { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "PostBox",
  description: "Dashboard for your Social Media administration",
};

export default function AdminLayout({ children }: LayoutProps) {
  return <ClientLayout>{children}</ClientLayout>;
}
