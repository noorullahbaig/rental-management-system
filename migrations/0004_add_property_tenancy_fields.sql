ALTER TABLE "Property" ADD COLUMN "numberOfRooms" INTEGER;
ALTER TABLE "Property" ADD COLUMN "carParks" INTEGER;
ALTER TABLE "Property" ADD COLUMN "squareFeet" REAL;
ALTER TABLE "Property" ADD COLUMN "otherAppliances" TEXT;
ALTER TABLE "Property" ADD COLUMN "ceilingFans" INTEGER;

ALTER TABLE "Tenancy" ADD COLUMN "signedAgreementUrl" TEXT;
ALTER TABLE "Tenancy" ADD COLUMN "moveInPicturesUrl" TEXT;
ALTER TABLE "Tenancy" ADD COLUMN "moveOutPicturesUrl" TEXT;
