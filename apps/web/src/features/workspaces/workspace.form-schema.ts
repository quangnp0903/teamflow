import { z } from 'zod';

export const createWorkspaceFormSchema = z.object({
  name: z.string().trim().min(1, { error: 'Enter a workspace name' }).max(120, {
    error: 'Workspace name must not exceed 120 characters',
  }),
});

export type CreateWorkspaceFormValues = z.infer<
  typeof createWorkspaceFormSchema
>;
