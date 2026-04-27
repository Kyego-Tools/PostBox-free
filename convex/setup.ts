import { query } from "./_generated/server";

// Check if any user exists in the system (for first-run detection)
export const hasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const firstUser = await ctx.db.query("users").first();
    return firstUser !== null;
  },
});
