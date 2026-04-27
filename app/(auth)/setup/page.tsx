import { CalendarClock } from "lucide-react";
import SetupForm from "@/components/auth/setup/setup-form";
import SetupShowcase from "@/components/auth/setup/setup-showcase";

export default function SetupPage() {
  return (
    <div className="flex min-h-dvh">
      {/* Left — form */}
      <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="size-5 text-primary" />
          </div>
          <span className="text-base font-semibold">Social Scheduler</span>
        </div>

        {/* Form area */}
        <div className="mx-auto w-full max-w-sm py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Create an Account
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Set up your admin account to get started.
            </p>
          </div>

          <SetupForm />
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          This is a one-time setup. After creating your account, you&apos;ll
          sign in with these credentials.
        </p>
      </div>

      {/* Right — showcase (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 p-4">
        <SetupShowcase />
      </div>
    </div>
  );
}
