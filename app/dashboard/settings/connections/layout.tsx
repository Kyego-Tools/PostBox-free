import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Integrations for your workspace on  Social Scheduler",
};
const IntegrationsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default IntegrationsLayout;
