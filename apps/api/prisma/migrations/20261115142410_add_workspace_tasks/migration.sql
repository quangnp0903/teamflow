-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "workspace_id" UUID;

-- CreateIndex
CREATE INDEX "tasks_workspace_id_created_at_id_idx" ON "tasks"("workspace_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
