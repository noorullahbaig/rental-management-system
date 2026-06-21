-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN "agentCommissionAmount" REAL;
ALTER TABLE "Tenancy" ADD COLUMN "specialClauses" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "emergencyContactName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "emergencyContactNumber" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "unitLabel" TEXT,
    "unitNumber" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "cityState" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ownership" TEXT NOT NULL,
    "spaPrice" REAL NOT NULL,
    "bookValue" REAL NOT NULL,
    "marketValue" REAL NOT NULL,
    "projectName" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "tenancyAgreementId" TEXT,
    "tenancyAgreementLabel" TEXT
);
INSERT INTO "new_Property" ("bookValue", "cityState", "developerName", "id", "kind", "marketValue", "ownership", "projectName", "serialNumber", "spaPrice", "streetAddress", "tenancyAgreementId", "tenancyAgreementLabel", "unitLabel", "unitNumber") SELECT "bookValue", "cityState", "developerName", "id", "kind", "marketValue", "ownership", "projectName", "serialNumber", "spaPrice", "streetAddress", "tenancyAgreementId", "tenancyAgreementLabel", "unitLabel", "unitNumber" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
CREATE UNIQUE INDEX "Property_serialNumber_key" ON "Property"("serialNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

