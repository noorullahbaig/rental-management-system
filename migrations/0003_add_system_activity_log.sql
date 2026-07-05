-- CreateTable
CREATE TABLE "SystemActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL
);
