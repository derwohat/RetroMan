-- CreateTable
CREATE TABLE "MailAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "userId" TEXT,

    CONSTRAINT "MailAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailAttempt_createdAt_idx" ON "MailAttempt"("createdAt");
