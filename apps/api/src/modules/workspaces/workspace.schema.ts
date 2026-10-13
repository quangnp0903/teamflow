import { z } from 'zod';

export const createWorkspaceSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
