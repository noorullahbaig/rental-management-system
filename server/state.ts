const randomUUID = () => crypto.randomUUID()
import type { PrismaClient } from '@prisma/client'
import { buildMonthlyProfitLoss, buildMonthlyProfitLossPortfolioSummary } from '../src/reports.ts'
import { createStarterState } from '../src/starterData.ts'
import type {
  BootstrapResponse,
  MonthlyExpenseEntryInput,
  MonthlyRentalIncomeInput,
  Property,
  PropertyInput,
  RentCollectionInput,
  RenovationInput,
  RentalSystemState,
  Tenant,
  TenantActivityInput,
  TenantInput,
  Tenancy,
  TenancyInput,
} from '../src/types.ts'

type PrismaPropertyRow = Awaited<ReturnType<PrismaClient['property']['findMany']>>[number]
type PrismaRenovationRow = Awaited<ReturnType<PrismaClient['renovationItem']['findMany']>>[number]
type PrismaTenancyRow = Awaited<ReturnType<PrismaClient['tenancy']['findMany']>>[number]

const mapProperty = (property: PrismaPropertyRow, renovations: PrismaRenovationRow[]): Property => ({
  id: property.id,
  serialNumber: property.serialNumber,
  unitLabel: property.unitLabel || undefined,
  address: {
    unitNumber: property.unitNumber,
    streetAddress: property.streetAddress,
    cityState: property.cityState,
  },
  kind: property.kind as Property['kind'],
  ownership: property.ownership as Property['ownership'],
  spaPrice: property.spaPrice,
  bookValue: property.bookValue,
  marketValue: property.marketValue,
  projectName: property.projectName,
  developerName: property.developerName,
  tenancyAgreement: property.tenancyAgreementId
    ? {
        id: property.tenancyAgreementId,
        label: property.tenancyAgreementLabel || 'Tenancy Agreement',
        fileName: property.tenancyAgreementFileName || '',
        uploadedAt: property.tenancyAgreementUploadedAt || '',
        notes: property.tenancyAgreementNotes || undefined,
      }
    : undefined,
  renovations: renovations
    .filter((item) => item.propertyId === property.id)
    .map((item) => ({
      id: item.id,
      amountPaid: item.amountPaid,
      paymentDate: item.paymentDate,
      invoiceNumber: item.invoiceNumber,
      description: item.description,
      depreciationPeriod: item.depreciationPeriod as Property['renovations'][number]['depreciationPeriod'],
      attachmentName: item.attachmentName || undefined,
    })),
})

const mapTenancy = (tenancy: PrismaTenancyRow): Tenancy => ({
  id: tenancy.id,
  propertyId: tenancy.propertyId,
  tenantId: tenancy.tenantId,
  rentalTerms: {
    rentalDeposit: tenancy.rentalDeposit,
    surcharge: tenancy.surcharge,
    monthlyGross: tenancy.monthlyGross,
    dateOfCollection: tenancy.dateOfCollection,
    serviceFeeDeduction: tenancy.serviceFeeDeduction,
    monthlyNet: tenancy.monthlyNet,
    dateOfNetRemitted: tenancy.dateOfNetRemitted,
    cumulativeGross: tenancy.cumulativeGross,
    cumulativeNet: tenancy.cumulativeNet,
    lateCollectionFlag: tenancy.lateCollectionFlag,
  },
  deductions: {
    maintenanceCharges: tenancy.maintenanceCharges,
    quitRent: tenancy.quitRent,
    assessment: tenancy.assessment,
    utilityCharges: tenancy.utilityCharges,
    fireInsurancePremium: tenancy.fireInsurancePremium,
    sinkingFundPayment: tenancy.sinkingFundPayment,
    miscellaneousCharges: tenancy.miscellaneousCharges,
    bankCostOfFunds: tenancy.bankCostOfFunds,
    depreciationCost: tenancy.depreciationCost,
  },
  commencementDate: tenancy.commencementDate,
  keyCollectionDate: tenancy.keyCollectionDate,
  moveInDate: tenancy.moveInDate,
  expirationDate: tenancy.expirationDate,
  tenure: tenancy.tenure,
  airSelangorAccount: tenancy.airSelangorAccount,
  tnbAccount: tenancy.tnbAccount,
  tmAccount: tenancy.tmAccount,
  status: tenancy.status as Tenancy['status'],
  closedEarly: tenancy.closedEarly,
})

export const buildState = async (prisma: PrismaClient): Promise<RentalSystemState> => {
  const [
    properties,
    renovations,
    tenants,
    tenancies,
    rentCollections,
    depositTransactions,
    expenseTransactions,
    expenseCategories,
    monthlyRentalIncomes,
    monthlyExpenseEntries,
    tenantActivities,
  ] = await prisma.$transaction([
    prisma.property.findMany({ orderBy: { serialNumber: 'asc' } }),
    prisma.renovationItem.findMany({ orderBy: { paymentDate: 'asc' } }),
    prisma.tenant.findMany({ orderBy: { name: 'asc' } }),
    prisma.tenancy.findMany({ orderBy: { commencementDate: 'asc' } }),
    prisma.rentCollectionRecord.findMany({ orderBy: { expectedCollectionDate: 'asc' } }),
    prisma.depositTransaction.findMany({ orderBy: { date: 'asc' } }),
    prisma.expenseTransaction.findMany({ orderBy: { datePaid: 'asc' } }),
    prisma.expenseCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.monthlyRentalIncome.findMany({ orderBy: [{ periodMonth: 'asc' }, { propertyId: 'asc' }] }),
    prisma.monthlyExpenseEntry.findMany({ orderBy: [{ periodMonth: 'asc' }, { propertyId: 'asc' }] }),
    prisma.tenantActivity.findMany({ orderBy: { date: 'asc' } }),
  ])

  return {
    properties: properties.map((property) => mapProperty(property, renovations)),
    tenants: tenants.map(
      (tenant): Tenant => ({
        id: tenant.id,
        name: tenant.name,
        nricPassport: tenant.nricPassport,
        email: tenant.email,
        mobile: tenant.mobile,
      }),
    ),
    tenancies: tenancies.map(mapTenancy),
    rentCollections: rentCollections.map((item) => ({
      id: item.id,
      tenancyId: item.tenancyId,
      expectedCollectionDate: item.expectedCollectionDate,
      actualCollectionDate: item.actualCollectionDate || undefined,
      amountCollected: item.amountCollected,
      serviceAdminFee: item.serviceAdminFee,
      sst: item.sst,
      dateRemitted: item.dateRemitted || undefined,
      expectedAmount: item.expectedAmount || undefined,
      notes: item.notes || undefined,
    })),
    depositTransactions: depositTransactions.map((item) => ({
      id: item.id,
      tenancyId: item.tenancyId,
      date: item.date,
      type: item.type as RentalSystemState['depositTransactions'][number]['type'],
      amount: item.amount,
      notes: item.notes || undefined,
    })),
    expenseTransactions: expenseTransactions.map((item) => ({
      id: item.id,
      tenancyId: item.tenancyId || undefined,
      propertyId: item.propertyId,
      datePaid: item.datePaid,
      expenseType: item.expenseType as RentalSystemState['expenseTransactions'][number]['expenseType'],
      amount: item.amount,
      invoiceNumber: item.invoiceNumber || undefined,
      description: item.description || undefined,
    })),
    expenseCategories: expenseCategories.map((item) => ({
      id: item.id,
      name: item.name,
      groupType: item.groupType as RentalSystemState['expenseCategories'][number]['groupType'],
      isNonCash: item.isNonCash,
      sortOrder: item.sortOrder,
    })),
    monthlyRentalIncomes: monthlyRentalIncomes.map((item) => ({
      id: item.id,
      propertyId: item.propertyId,
      periodMonth: item.periodMonth,
      grossRentalAmount: item.grossRentalAmount,
    })),
    monthlyExpenseEntries: monthlyExpenseEntries.map((item) => ({
      id: item.id,
      propertyId: item.propertyId,
      periodMonth: item.periodMonth,
      expenseCategoryId: item.expenseCategoryId,
      amount: item.amount,
      notes: item.notes || undefined,
    })),
    tenantActivities: tenantActivities.map((item) => ({
      id: item.id,
      tenancyId: item.tenancyId,
      date: item.date,
      type: item.type as RentalSystemState['tenantActivities'][number]['type'],
      notes: item.notes,
    })),
  }
}

export const buildBootstrapResponse = async (prisma: PrismaClient): Promise<BootstrapResponse> => ({
  state: await buildState(prisma),
})

export const seedStarterData = async (prisma: PrismaClient) => {
  const starterState = createStarterState()

  await prisma.$transaction([
    prisma.tenantActivity.deleteMany(),
    prisma.expenseTransaction.deleteMany(),
    prisma.depositTransaction.deleteMany(),
    prisma.rentCollectionRecord.deleteMany(),
    prisma.monthlyExpenseEntry.deleteMany(),
    prisma.monthlyRentalIncome.deleteMany(),
    prisma.renovationItem.deleteMany(),
    prisma.tenancy.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.expenseCategory.deleteMany(),
    prisma.property.deleteMany(),
  ])

  for (const property of starterState.properties) {
    await prisma.property.create({
      data: {
        id: property.id,
        serialNumber: property.serialNumber,
        unitLabel: property.unitLabel,
        unitNumber: property.address.unitNumber,
        streetAddress: property.address.streetAddress,
        cityState: property.address.cityState,
        kind: property.kind,
        ownership: property.ownership,
        spaPrice: property.spaPrice,
        bookValue: property.bookValue,
        marketValue: property.marketValue,
        projectName: property.projectName,
        developerName: property.developerName,
        tenancyAgreementId: property.tenancyAgreement?.id,
        tenancyAgreementLabel: property.tenancyAgreement?.label,
        tenancyAgreementFileName: property.tenancyAgreement?.fileName,
        tenancyAgreementUploadedAt: property.tenancyAgreement?.uploadedAt,
        tenancyAgreementNotes: property.tenancyAgreement?.notes,
      },
    })
    for (const renovation of property.renovations) {
      await prisma.renovationItem.create({
        data: {
          id: renovation.id,
          propertyId: property.id,
          amountPaid: renovation.amountPaid,
          paymentDate: renovation.paymentDate,
          invoiceNumber: renovation.invoiceNumber,
          description: renovation.description,
          depreciationPeriod: renovation.depreciationPeriod,
          attachmentName: renovation.attachmentName,
        },
      })
    }
  }

  for (const tenant of starterState.tenants) {
    await prisma.tenant.create({ data: tenant })
  }

  for (const tenancy of starterState.tenancies) {
    await prisma.tenancy.create({
      data: {
        id: tenancy.id,
        propertyId: tenancy.propertyId,
        tenantId: tenancy.tenantId,
        rentalDeposit: tenancy.rentalTerms.rentalDeposit,
        surcharge: tenancy.rentalTerms.surcharge,
        monthlyGross: tenancy.rentalTerms.monthlyGross,
        dateOfCollection: tenancy.rentalTerms.dateOfCollection,
        serviceFeeDeduction: tenancy.rentalTerms.serviceFeeDeduction,
        monthlyNet: tenancy.rentalTerms.monthlyNet,
        dateOfNetRemitted: tenancy.rentalTerms.dateOfNetRemitted,
        cumulativeGross: tenancy.rentalTerms.cumulativeGross,
        cumulativeNet: tenancy.rentalTerms.cumulativeNet,
        lateCollectionFlag: tenancy.rentalTerms.lateCollectionFlag,
        maintenanceCharges: tenancy.deductions.maintenanceCharges,
        quitRent: tenancy.deductions.quitRent,
        assessment: tenancy.deductions.assessment,
        utilityCharges: tenancy.deductions.utilityCharges,
        fireInsurancePremium: tenancy.deductions.fireInsurancePremium,
        sinkingFundPayment: tenancy.deductions.sinkingFundPayment,
        miscellaneousCharges: tenancy.deductions.miscellaneousCharges,
        bankCostOfFunds: tenancy.deductions.bankCostOfFunds,
        depreciationCost: tenancy.deductions.depreciationCost,
        commencementDate: tenancy.commencementDate,
        keyCollectionDate: tenancy.keyCollectionDate,
        moveInDate: tenancy.moveInDate,
        expirationDate: tenancy.expirationDate,
        tenure: tenancy.tenure,
        airSelangorAccount: tenancy.airSelangorAccount,
        tnbAccount: tenancy.tnbAccount,
        tmAccount: tenancy.tmAccount,
        status: tenancy.status,
        closedEarly: tenancy.closedEarly,
      },
    })
  }

  for (const category of starterState.expenseCategories) {
    await prisma.expenseCategory.create({
      data: {
        id: category.id,
        name: category.name,
        groupType: category.groupType,
        isNonCash: category.isNonCash || false,
        sortOrder: category.sortOrder || 0,
      },
    })
  }

  for (const item of starterState.monthlyRentalIncomes) {
    await prisma.monthlyRentalIncome.create({ data: item })
  }
  for (const item of starterState.monthlyExpenseEntries) {
    await prisma.monthlyExpenseEntry.create({ data: item })
  }
  for (const item of starterState.rentCollections) {
    await prisma.rentCollectionRecord.create({ data: item })
  }
  for (const item of starterState.depositTransactions) {
    await prisma.depositTransaction.create({ data: item })
  }
  for (const item of starterState.expenseTransactions) {
    await prisma.expenseTransaction.create({ data: item })
  }
  for (const item of starterState.tenantActivities) {
    await prisma.tenantActivity.create({ data: item })
  }

  return buildState(prisma)
}

export const ensureStarterData = async (prisma: PrismaClient) => {
  const propertyCount = await prisma.property.count()
  if (propertyCount === 0) {
    await seedStarterData(prisma)
  }
}

const nextPropertySerialNumber = async (prisma: PrismaClient) => {
  const properties = await prisma.property.findMany({
    select: { serialNumber: true },
    orderBy: { serialNumber: 'asc' },
  })
  const highest = properties.reduce((acc, property) => {
    const parsed = Number.parseInt(property.serialNumber, 10)
    return Number.isFinite(parsed) && parsed > acc ? parsed : acc
  }, 0)
  return String(highest + 1).padStart(5, '0')
}

export const createPropertyRecord = async (prisma: PrismaClient, payload: PropertyInput) => {
  const propertyId = randomUUID()
  const serialNumber = payload.serialNumber?.trim() || (await nextPropertySerialNumber(prisma))
  await prisma.property.create({
    data: {
      id: propertyId,
      serialNumber,
      unitLabel: payload.address.unitNumber,
      unitNumber: payload.address.unitNumber,
      streetAddress: payload.address.streetAddress,
      cityState: payload.address.cityState,
      kind: payload.kind,
      ownership: payload.ownership,
      spaPrice: payload.spaPrice,
      bookValue: payload.bookValue,
      marketValue: payload.marketValue,
      projectName: payload.projectName,
      developerName: payload.developerName,
      tenancyAgreementId: payload.agreementFileName ? randomUUID() : undefined,
      tenancyAgreementLabel: payload.agreementFileName ? 'Tenancy Agreement' : undefined,
      tenancyAgreementFileName: payload.agreementFileName,
      tenancyAgreementUploadedAt: payload.agreementFileName ? new Date().toISOString() : undefined,
    },
  })
  return buildState(prisma)
}

export const createTenantRecord = async (prisma: PrismaClient, payload: TenantInput) => {
  await prisma.tenant.create({
    data: {
      id: randomUUID(),
      ...payload,
    },
  })
  return buildState(prisma)
}

export const createTenancyRecord = async (prisma: PrismaClient, payload: TenancyInput) => {
  await prisma.tenancy.create({
    data: {
      id: randomUUID(),
      propertyId: payload.propertyId,
      tenantId: payload.tenantId,
      rentalDeposit: payload.rentalTerms.rentalDeposit,
      surcharge: payload.rentalTerms.surcharge,
      monthlyGross: payload.rentalTerms.monthlyGross,
      dateOfCollection: payload.rentalTerms.dateOfCollection,
      serviceFeeDeduction: payload.rentalTerms.serviceFeeDeduction,
      monthlyNet: payload.rentalTerms.monthlyNet,
      dateOfNetRemitted: payload.rentalTerms.dateOfNetRemitted,
      cumulativeGross: payload.rentalTerms.cumulativeGross,
      cumulativeNet: payload.rentalTerms.cumulativeNet,
      lateCollectionFlag: payload.rentalTerms.lateCollectionFlag,
      maintenanceCharges: payload.deductions.maintenanceCharges,
      quitRent: payload.deductions.quitRent,
      assessment: payload.deductions.assessment,
      utilityCharges: payload.deductions.utilityCharges,
      fireInsurancePremium: payload.deductions.fireInsurancePremium,
      sinkingFundPayment: payload.deductions.sinkingFundPayment,
      miscellaneousCharges: payload.deductions.miscellaneousCharges,
      bankCostOfFunds: payload.deductions.bankCostOfFunds,
      depreciationCost: payload.deductions.depreciationCost,
      commencementDate: payload.commencementDate,
      keyCollectionDate: payload.keyCollectionDate,
      moveInDate: payload.moveInDate,
      expirationDate: payload.expirationDate,
      tenure: payload.tenure,
      airSelangorAccount: payload.airSelangorAccount,
      tnbAccount: payload.tnbAccount,
      tmAccount: payload.tmAccount,
      status: payload.status,
      closedEarly: payload.closedEarly,
    },
  })
  return buildState(prisma)
}

export const closeTenancyEarlyRecord = async (prisma: PrismaClient, tenancyId: string) => {
  await prisma.tenancy.update({
    where: { id: tenancyId },
    data: {
      closedEarly: true,
      status: 'Closed Early',
    },
  })
  await prisma.tenantActivity.create({
    data: {
      id: randomUUID(),
      tenancyId,
      date: new Date().toISOString().slice(0, 10),
      type: 'Termination',
      notes: 'Tenancy closed early from Tenant Desk.',
    },
  })
  return buildState(prisma)
}

export const saveMonthlyRentalIncomeRecord = async (prisma: PrismaClient, payload: MonthlyRentalIncomeInput) => {
  await prisma.monthlyRentalIncome.upsert({
    where: {
      propertyId_periodMonth: {
        propertyId: payload.propertyId,
        periodMonth: payload.periodMonth,
      },
    },
    update: {
      grossRentalAmount: payload.grossRentalAmount,
    },
    create: {
      id: randomUUID(),
      propertyId: payload.propertyId,
      periodMonth: payload.periodMonth,
      grossRentalAmount: payload.grossRentalAmount,
    },
  })
  return buildState(prisma)
}

export const saveMonthlyExpenseEntryRecord = async (prisma: PrismaClient, payload: MonthlyExpenseEntryInput) => {
  await prisma.monthlyExpenseEntry.upsert({
    where: {
      propertyId_periodMonth_expenseCategoryId: {
        propertyId: payload.propertyId,
        periodMonth: payload.periodMonth,
        expenseCategoryId: payload.expenseCategoryId,
      },
    },
    update: {
      amount: payload.amount,
    },
    create: {
      id: randomUUID(),
      propertyId: payload.propertyId,
      periodMonth: payload.periodMonth,
      expenseCategoryId: payload.expenseCategoryId,
      amount: payload.amount,
    },
  })
  return buildState(prisma)
}

export const createRentCollectionEntry = async (prisma: PrismaClient, payload: RentCollectionInput) => {
  const existing = await prisma.rentCollectionRecord.findFirst({
    where: {
      tenancyId: payload.tenancyId,
      expectedCollectionDate: payload.expectedCollectionDate,
    },
  })

  if (existing) {
    await prisma.rentCollectionRecord.update({
      where: { id: existing.id },
      data: {
        actualCollectionDate: payload.actualCollectionDate,
        amountCollected: payload.amountCollected,
        serviceAdminFee: payload.serviceAdminFee,
        sst: payload.sst,
        dateRemitted: payload.dateRemitted,
        expectedAmount: payload.expectedAmount,
        notes: payload.notes,
      },
    })
  } else {
    await prisma.rentCollectionRecord.create({
      data: {
        id: randomUUID(),
        ...payload,
      },
    })
  }

  await prisma.tenantActivity.create({
    data: {
      id: randomUUID(),
      tenancyId: payload.tenancyId,
      date: payload.actualCollectionDate || payload.expectedCollectionDate,
      type: 'Collection',
      notes: payload.notes || `Recorded collection of ${payload.amountCollected}.`,
    },
  })

  return buildState(prisma)
}

export const createTenantActivityEntry = async (prisma: PrismaClient, payload: TenantActivityInput) => {
  await prisma.tenantActivity.create({
    data: {
      id: randomUUID(),
      ...payload,
    },
  })
  return buildState(prisma)
}

export const createRenovationRecord = async (prisma: PrismaClient, payload: RenovationInput) => {
  await prisma.renovationItem.create({
    data: {
      id: randomUUID(),
      propertyId: payload.propertyId,
      amountPaid: payload.amountPaid,
      paymentDate: payload.paymentDate,
      invoiceNumber: payload.invoiceNumber,
      description: payload.description,
      depreciationPeriod: payload.depreciationPeriod,
      attachmentName: payload.attachmentName,
    },
  })
  return buildState(prisma)
}

export const buildMonthlyProfitLossPayload = async (
  prisma: PrismaClient,
  periodMonth: string,
  propertyIds: string[],
) => {
  const state = await buildState(prisma)
  const reports = buildMonthlyProfitLoss(state, {
    periodMonth,
    propertyIds,
  })
  return {
    reports,
    summary: buildMonthlyProfitLossPortfolioSummary(reports),
  }
}
