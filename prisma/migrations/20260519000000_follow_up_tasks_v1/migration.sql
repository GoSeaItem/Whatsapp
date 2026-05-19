-- Upgrade the placeholder FollowUpTask table to the E-line V1 task model.
ALTER TABLE "FollowUpTask" ADD COLUMN "taskType" TEXT NOT NULL DEFAULT '普通提醒';
ALTER TABLE "FollowUpTask" ADD COLUMN "remindAt" TIMESTAMP(3);
ALTER TABLE "FollowUpTask" ADD COLUMN "recommendedScript" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FollowUpTask" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "FollowUpTask"
SET
  "taskType" = COALESCE(NULLIF("title", ''), '普通提醒'),
  "remindAt" = "dueAt",
  "recommendedScript" = COALESCE("note", ''),
  "completedAt" = CASE WHEN "status"::text = 'DONE' THEN "updatedAt" ELSE NULL END;

UPDATE "FollowUpTask"
SET "recommendedScript" = 'This is a follow-up draft. Please confirm price, stock, lead time, shipping, and payment details before sending.'
WHERE "recommendedScript" = '';

ALTER TABLE "FollowUpTask" ALTER COLUMN "remindAt" SET NOT NULL;

ALTER TABLE "FollowUpTask" ADD COLUMN "statusText" TEXT NOT NULL DEFAULT 'pending';
UPDATE "FollowUpTask"
SET "statusText" = CASE
  WHEN "status"::text = 'DONE' THEN 'completed'
  WHEN "status"::text = 'CANCELLED' THEN 'cancelled'
  ELSE 'pending'
END;

ALTER TABLE "FollowUpTask" DROP COLUMN "title";
ALTER TABLE "FollowUpTask" DROP COLUMN "dueAt";
ALTER TABLE "FollowUpTask" DROP COLUMN "note";
ALTER TABLE "FollowUpTask" DROP COLUMN "status";
ALTER TABLE "FollowUpTask" DROP COLUMN "updatedAt";
ALTER TABLE "FollowUpTask" RENAME COLUMN "statusText" TO "status";

DROP TYPE IF EXISTS "FollowUpStatus";

CREATE INDEX "FollowUpTask_remindAt_idx" ON "FollowUpTask"("remindAt");
