import { z } from 'zod';

import type {
  RenameWorkspaceInput,
  AddWorkspaceMemberInput,
} from '@teamflow/contracts/workspaces';
import { emailSchema } from '../../lib/validation/email.schema.ts';

const workspaceNameSchema = z.string().trim().min(1).max(120);

export const createWorkspaceSchema = z.strictObject({
  name: workspaceNameSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const renameWorkspaceSchema = z.strictObject({
  name: workspaceNameSchema,
}) satisfies z.ZodType<RenameWorkspaceInput>;

export const listWorkspacesQuerySchema = z.strictObject({});

export const workspaceParamsSchema = z.strictObject({
  workspaceId: z.uuid(),
});

export const listWorkspaceMembersQuerySchema = z.strictObject({});

export const addWorkspaceMemberSchema = z.strictObject({
  email: emailSchema,
}) satisfies z.ZodType<AddWorkspaceMemberInput>;
