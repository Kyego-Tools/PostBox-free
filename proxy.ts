import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"

import { api } from "@/convex/_generated/api"
import { fetchQuery } from "convex/nextjs"

const isSignInPage = createRouteMatcher(["/sign-in", "/setup"])
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // 1. First-run: no admin → send to setup (skip if already there)
  if ((await fetchQuery(api.setup.hasAdmin)) === false && !isSignInPage(request)) {
    return nextjsMiddlewareRedirect(request, "/setup")
  }

  const isAuthenticated = await convexAuth.isAuthenticated()

  console.log(isAuthenticated, "Authenticated:", request.url)

  // 2. Protected routes require auth
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/sign-in")
  }

  // 3. Signed-in users shouldn't see sign-in/setup pages
  if (isSignInPage(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard")
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
