import SetupForm from "@/components/auth/setup/setup-form"
import SetupShowcase from "@/components/auth/setup/setup-showcase"
import Image from "next/image"

export default function SetupPage() {
  return (
    <div className="flex min-h-dvh">
      {/* Left — form */}
      <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="PostBox"
            width={36}
            height={36}
            className="size-9 text-primary"
          />
          <span className="text-base font-semibold">PostBox</span>
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
      <div className="hidden p-4 lg:block lg:w-1/2">
        <SetupShowcase />
      </div>
    </div>
  )
}
