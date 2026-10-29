import { z } from 'zod';

import type { RenameWorkspaceInput } from './workspace.types';

const workspaceNameFieldSchema = z
  .string()
  .trim()
  .min(1, {
    error: 'Enter a workspace name',
  })
  .max(120, {
    error: 'Workspace name must not exceed 120 characters',
  });

export const createWorkspaceFormSchema = z.object({
  name: workspaceNameFieldSchema,
});

export type CreateWorkspaceFormValues = z.infer<
  typeof createWorkspaceFormSchema
>;

export const renameWorkspaceFormSchema = z.object({
  name: workspaceNameFieldSchema,
}) satisfies z.ZodType<RenameWorkspaceInput>;

export type RenameWorkspaceFormValues = z.infer<
  typeof renameWorkspaceFormSchema
>;
