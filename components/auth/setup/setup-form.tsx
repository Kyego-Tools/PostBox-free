"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useAuthActions } from "@convex-dev/auth/react";
import { Check, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
];

export default function SetupForm() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = requirements.filter((r) => r.test(password));
  const strength = passed.length;
  const allMet = strength === requirements.length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const strengthColor = strength <= 1 ? "bg-destructive" : "bg-green-500";
  const strengthLabel = strength <= 1 ? "Weak" : "Strong";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allMet) return setError("Please meet all password requirements");
    if (!passwordsMatch) return setError("Passwords do not match");

    setIsPending(true);
    try {
      await signIn("password", { email, password, name, flow: "signUp" });
      toast.success("Admin account created!", {
        description: "Welcome to your social media scheduler.",
      });
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create account.";
      setError(msg);
      toast.error("Setup failed", { description: msg });
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
          className="h-11"
          autoFocus
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="h-11"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
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
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {password.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300", strengthColor)}
                  style={{ width: `${(strength / requirements.length) * 100}%` }}
                />
              </div>
              <span className={cn("text-xs font-medium", strength <= 1 ? "text-destructive" : "text-green-600")}>
                {strengthLabel}
              </span>
            </div>
            <div className="space-y-1 pt-1">
              {requirements.map((req, i) => (
                <div key={i} className={cn("flex items-center gap-1.5 text-xs", req.test(password) ? "text-green-600" : "text-muted-foreground")}>
                  {req.test(password) ? <Check className="size-3" /> : <X className="size-3" />}
                  {req.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
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
              confirmPassword.length > 0 && (passwordsMatch ? "border-green-500" : "border-destructive"),
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="size-3" /> Passwords match
          </p>
        )}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={isPending || !allMet || !passwordsMatch}>
        {isPending ? (
          <><Loader2 className="mr-2 size-4 animate-spin" /> Creating account...</>
        ) : (
          "Create admin account"
        )}
      </Button>
    </form>
  );
}
