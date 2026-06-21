-- CreateTable
CREATE TABLE "Property" (
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
    "tenancyAgreementLabel" TEXT,
    "tenancyAgreementFileName" TEXT,
    "tenancyAgreementUploadedAt" TEXT,
    "tenancyAgreementNotes" TEXT
);

-- CreateTable
CREATE TABLE "RenovationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "amountPaid" REAL NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "depreciationPeriod" INTEGER NOT NULL,
    "attachmentName" TEXT,
    CONSTRAINT "RenovationItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nricPassport" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalDeposit" REAL NOT NULL,
    "surcharge" REAL NOT NULL,
    "monthlyGross" REAL NOT NULL,
    "dateOfCollection" TEXT NOT NULL,
    "serviceFeeDeduction" REAL NOT NULL,
    "monthlyNet" REAL NOT NULL,
    "dateOfNetRemitted" TEXT NOT NULL,
    "cumulativeGross" REAL NOT NULL,
    "cumulativeNet" REAL NOT NULL,
    "lateCollectionFlag" BOOLEAN NOT NULL,
    "maintenanceCharges" REAL NOT NULL,
    "quitRent" REAL NOT NULL,
    "assessment" REAL NOT NULL,
    "utilityCharges" REAL NOT NULL,
    "fireInsurancePremium" REAL NOT NULL,
    "sinkingFundPayment" REAL NOT NULL,
    "miscellaneousCharges" REAL NOT NULL,
    "bankCostOfFunds" REAL NOT NULL,
    "depreciationCost" REAL NOT NULL,
    "commencementDate" TEXT NOT NULL,
    "keyCollectionDate" TEXT NOT NULL,
    "moveInDate" TEXT NOT NULL,
    "expirationDate" TEXT NOT NULL,
    "tenure" TEXT NOT NULL,
    "airSelangorAccount" TEXT NOT NULL,
    "tnbAccount" TEXT NOT NULL,
    "tmAccount" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "closedEarly" BOOLEAN NOT NULL,
    CONSTRAINT "Tenancy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tenancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "groupType" TEXT NOT NULL,
    "isNonCash" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "MonthlyRentalIncome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "grossRentalAmount" REAL NOT NULL,
    CONSTRAINT "MonthlyRentalIncome_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyExpenseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "expenseCategoryId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "MonthlyExpenseEntry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyExpenseEntry_expenseCategoryId_fkey" FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentCollectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "expectedCollectionDate" TEXT NOT NULL,
    "actualCollectionDate" TEXT,
    "amountCollected" REAL NOT NULL,
    "serviceAdminFee" REAL NOT NULL,
    "sst" REAL NOT NULL,
    "dateRemitted" TEXT,
    "expectedAmount" REAL,
    "notes" TEXT,
    CONSTRAINT "RentCollectionRecord_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepositTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "DepositTransaction_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT,
    "propertyId" TEXT NOT NULL,
    "datePaid" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "invoiceNumber" TEXT,
    "description" TEXT,
    CONSTRAINT "ExpenseTransaction_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseTransaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TenantActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenancyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "TenantActivity_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_serialNumber_key" ON "Property"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyRentalIncome_propertyId_periodMonth_key" ON "MonthlyRentalIncome"("propertyId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyExpenseEntry_propertyId_periodMonth_expenseCategoryId_key" ON "MonthlyExpenseEntry"("propertyId", "periodMonth", "expenseCategoryId");

