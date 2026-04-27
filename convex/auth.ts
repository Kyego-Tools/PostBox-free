import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Simple email/password — no email verification needed for self-hosted
    Password(),
  ],
})

// Re-export for use in other files
export { getAuthUserId }
