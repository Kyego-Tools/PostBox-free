"use client";

import { useState, useRef } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useAuthActions } from "@convex-dev/auth/react";
import { Check, X, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Contains a number", test: (p) => /\d/.test(p) },
  { label: "Contains special character", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface SignUpFormProps {
  redirectTo?: string | null;
  prefillEmail?: string | null;
}

export function SignUpForm({ redirectTo, prefillEmail }: SignUpFormProps) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  
  // Form step: "signup" or { email: string } for verification
  const [step, setStep] = useState<"signup" | { email: string }>("signup");
  
  const [isPending, setIsPending] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification code
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passedRequirements = passwordRequirements.filter((req) =>
    req.test(password)
  );
  const passwordStrength = passedRequirements.length;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allRequirementsMet = passwordStrength === passwordRequirements.length;

  function getStrengthColor() {
    if (passwordStrength <= 2) return "bg-destructive";
    if (passwordStrength <= 3) return "bg-orange-500";
    if (passwordStrength <= 4) return "bg-yellow-500";
    return "bg-green-500";
  }

  function getStrengthLabel() {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  }

  // Handle sign-up form submission
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsPending(true);
    
    try {
      // Use .then() pattern as recommended by Convex Auth docs
      await signIn("password", {
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        flow: "signUp",
      });
      
      // Email was sent, show verification form
      setStep({ email });
      toast.success("Verification code sent!", {
        description: `Check your inbox at ${email}`,
      });
    } catch (err) {
      console.error("Sign up error:", err);
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      setError(message);
      toast.error("Sign up failed", { description: message });
    } finally {
      setIsPending(false);
    }
  }

  // Handle verification code submission
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (step === "signup") return;
    
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setError(null);
    setIsPending(true);
    
    try {
      await signIn("password", {
        email: step.email,
        code,
        flow: "email-verification",
        redirectTo: redirectTo || "/onboarding",
      });
      
      // Store names for the onboarding page to pick up
      // (auth session isn't available yet for mutations right after signIn)
      if (firstName || lastName) {
        localStorage.setItem("vizento_signup_names", JSON.stringify({ firstName, lastName }));
      }

      // Success! User is now signed in
      toast.success("Email verified!", {
        description: "Welcome to Vizento! Let's set up your account.",
      });

      // Redirect to onboarding
      router.push(redirectTo || "/onboarding");
    } catch (err) {
      console.error("Verification error:", err);
      const message = err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(message);
      toast.error("Verification failed", { description: message });
      setIsPending(false);
    }
  }

  // Handle verification code input
  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // Only take last digit
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...verificationCode];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setVerificationCode(newCode);
    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(c => !c);
    codeInputRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
  }

  // Resend verification code
  async function handleResendCode() {
    if (step === "signup") return;
    
    setError(null);
    setIsPending(true);
    
    try {
      await signIn("password", {
        email: step.email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        flow: "signUp",
      });
      
      toast.success("Code resent!", {
        description: `Check your inbox at ${step.email}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
      toast.error("Failed to resend", { description: message });
    } finally {
      setIsPending(false);
    }
  }

  // Verification code step
  if (step !== "signup") {
    return (
      <div className="w-full space-y-6">
        <button
          type="button"
          onClick={() => setStep("signup")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign up
        </button>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Verify your email</h3>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{step.email}</span>
          </p>
        </div>

        {error && (
          <div className={cn(
            "w-full rounded-md p-3 text-sm",
            error.includes("resent") 
              ? "bg-green-500/10 text-green-600" 
              : "bg-destructive/10 text-destructive"
          )}>
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="flex justify-center gap-2">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { codeInputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                onPaste={handleCodePaste}
                disabled={isPending}
                className="h-12 w-12 text-center text-lg font-semibold"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button
            type="submit"
            className="h-11 w-full"
            disabled={isPending || verificationCode.join("").length !== 6}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify email"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isPending}
            className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            Didn&apos;t receive the code? <span className="text-primary">Resend</span>
          </button>
        </div>
      </div>
    );
  }

  // Sign-up form
  return (
    <form onSubmit={handleSignUp} className="w-full space-y-4">
      {error && (
        <div className="w-full rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={isPending}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={isPending}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            required
            disabled={isPending}
            className="h-11 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowRequirements(true)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-300", getStrengthColor())}
                  style={{ width: `${(passwordStrength / passwordRequirements.length) * 100}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-medium",
                passwordStrength <= 2 && "text-destructive",
                passwordStrength === 3 && "text-orange-500",
                passwordStrength === 4 && "text-yellow-600",
                passwordStrength === 5 && "text-green-600"
              )}>
                {getStrengthLabel()}
              </span>
            </div>
          </div>
        )}

        {/* Password requirements */}
        {showRequirements && password.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {passwordRequirements.map((req, index) => {
              const passed = req.test(password);
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    passed ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  {passed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            required
            disabled={isPending}
            className={cn(
              "h-11 pr-10",
              confirmPassword.length > 0 && (
                passwordsMatch 
                  ? "border-green-500 focus-visible:ring-green-500" 
                  : "border-destructive focus-visible:ring-destructive"
              )
            )}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-destructive">Passwords do not match</p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Passwords match
          </p>
        )}
      </div>

      <Button 
        type="submit" 
        className="h-11 w-full"
        disabled={isPending || !allRequirementsMet || !passwordsMatch}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
