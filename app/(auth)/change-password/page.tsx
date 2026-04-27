"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { Check, X, Eye, EyeOff, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import SetupShowcase from "@/components/auth/setup/setup-showcase";

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
];

export default function ChangePasswordPage() {
  const router = useRouter();
  const currentUser = useQuery(api.users.getMe);
  const changePassword = useAction(api.team.changePassword);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = requirements.filter((r) => r.test(password));
  const strength = passed.length;
  const allMet = strength === requirements.length;
  const passwordsMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const strengthColor = strength <= 1 ? "bg-destructive" : "bg-green-500";
  const strengthLabel = strength <= 1 ? "Weak" : "Strong";

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allMet) return setError("Please meet all password requirements");
    if (!passwordsMatch) return setError("Passwords do not match");

    setIsPending(true);
    try {
      await changePassword({
        email: currentUser!.email!,
        newPassword: password,
      });
      toast.success("Password changed!", {
        description: "You can now use your new password.",
      });
      router.push("/dashboard");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to change password.";
      setError(msg);
      toast.error("Failed", { description: msg });
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh">
      {/* Left — form */}
      <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarClock className="size-5 text-primary" />
          </div>
          <span className="text-base font-semibold">Social Scheduler</span>
        </div>

        <div className="mx-auto w-full max-w-sm py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Change your password
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your admin has created an account for you. Please set a new
              password to continue.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className="h-11 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          strengthColor,
                        )}
                        style={{
                          width: `${(strength / requirements.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        strength <= 1 ? "text-destructive" : "text-green-600",
                      )}
                    >
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1">
                    {requirements.map((req, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-1.5 text-xs",
                          req.test(password)
                            ? "text-green-600"
                            : "text-muted-foreground",
                        )}
                      >
                        {req.test(password) ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                  className={cn(
                    "h-11 pr-10",
                    confirmPassword.length > 0 &&
                      (passwordsMatch
                        ? "border-green-500"
                        : "border-destructive"),
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="size-3" /> Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={isPending || !allMet || !passwordsMatch}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Changing
                  password...
                </>
              ) : (
                "Set new password"
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground">
          Your data stays on your infrastructure. No third-party access.
        </p>
      </div>

      {/* Right — showcase */}
      <div className="hidden lg:block lg:w-1/2 p-4">
        <SetupShowcase />
      </div>
    </div>
  );
}
