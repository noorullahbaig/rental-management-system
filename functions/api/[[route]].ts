import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { zValidator } from '@hono/zod-validator'
import {
  buildBootstrapResponse,
  buildMonthlyProfitLossPayload,
  closeTenancyEarlyRecord,
  createPropertyRecord,
  updatePropertyRecord,
  deletePropertyRecord,
  createRentCollectionEntry,
  createRenovationRecord,
  createTenancyRecord,
  updateTenancyRecord,
  deleteTenancyRecord,
  createTenantActivityEntry,
  createTenantRecord,
  updateTenantRecord,
  deleteTenantRecord,
  saveMonthlyExpenseEntryRecord,
  saveMonthlyRentalIncomeRecord,
  seedStarterData,
  ensureStarterData,
  logSystemActivity,
} from '../../server/state.ts'
import {
  loginSchema,
  userInputSchema,
  userUpdateSchema,
  changePasswordSchema,
  maintenanceRequestSchema,
  maintenanceUpdateSchema,
  maintenanceCommentSchema,
  paymentReceiptSchema,
  paymentVerificationSchema,
  utilityBillSchema,
  propertyInputSchema,
  tenantInputSchema,
  tenancyInputSchema,
  monthlyRentalIncomeInputSchema,
  monthlyExpenseEntryInputSchema,
  rentCollectionInputSchema,
  tenantActivityInputSchema,
  renovationInputSchema,
} from './schemas.ts'

export type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
}

type Variables = {
  prisma: PrismaClient
  user?: {
    id: string
    email: string
    role: string
    firstName: string
    lastName: string
  }
}

const randomUUID = () => crypto.randomUUID()

// Password hashing helper (matches seed.ts)
const hashPassword = (password: string): string => {
  return Buffer.from(password).toString('base64')
}

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

app.use('*', async (c, next) => {
  if (!c.env.DB) {
    return c.json({ error: 'Database binding (DB) is missing. Please configure D1 binding in Cloudflare Dashboard.', envKeys: Object.keys(c.env) }, 500)
  }
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })
  c.set('prisma', prisma)
  await next()
})

// Authentication Middleware
app.use('*', async (c, next) => {
  // Allow login/logout and preflight without auth
  if (c.req.method === 'OPTIONS') return await next()
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/logout') {
    return await next()
  }

  const userId = getCookie(c, 'user_id')
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Get user from database
  const user = await c.var.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      status: true,
    }
  })

  if (!user || user.status !== 'ACTIVE') {
    deleteCookie(c, 'user_id')
    deleteCookie(c, 'user_role')
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Update last login
  await c.var.prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date().toISOString() }
  }).catch(() => {}) // Silent fail
  
  c.set('user', user)
  await next()
})

// Role-based authorization middleware
const requireRole = (...roles: string[]) => {
  return async (c: any, next: any) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  }
}

// ========================================
// AUTH ROUTES
// ========================================

app.get('/debug-env', (c) => {
  return c.json({
    keys: Object.keys(c.env),
    hasDB: !!c.env.DB
  })
})

app.post('/auth/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  const { email, password } = body

  try {
    const user = await c.var.prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ],
        status: 'ACTIVE'
      }
    })

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Set secure cookies
    setCookie(c, 'user_id', user.id, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    
    setCookie(c, 'user_role', user.role, {
      path: '/',
      secure: true,
      httpOnly: false, // Allow client to read role
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 * 30,
    })

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    })
  } catch (error) {
    return c.json({ error: 'Database Error', details: error instanceof Error ? error.message : String(error) }, 500)
  }
})

app.post('/auth/logout', async (c) => {
  deleteCookie(c, 'user_id')
  deleteCookie(c, 'user_role')
  return c.json({ success: true })
})

app.get('/auth/me', async (c) => {
  const user = c.get('user')
  
  // Get additional profile data for tenants
  if (user.role === 'TENANT') {
    const profile = await c.var.prisma.tenantProfile.findUnique({
      where: { userId: user.id },
      include: {
        tenant: true
      }
    })
    
    return c.json({
      ...user,
      profile: profile ? {
        tenantId: profile.tenantId,
        tenantName: profile.tenant.name,
        phoneNumber: profile.phoneNumber,
        notificationsEnabled: profile.notificationsEnabled,
      } : null
    })
  }
  
  return c.json(user)
})

app.post('/auth/change-password', zValidator('json', changePasswordSchema), async (c) => {
  const user = c.get('user')
  const { currentPassword, newPassword } = c.req.valid('json')

  const dbUser = await c.var.prisma.user.findUnique({
    where: { id: user.id }
  })

  if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
    return c.json({ error: 'Current password is incorrect' }, 400)
  }

  await c.var.prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) }
  })

  return c.json({ success: true, message: 'Password changed successfully' })
})

// Activity logging middleware
app.use('*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(c.req.method) && !c.req.path.includes('/auth/')) {
    const start = Date.now()
    await next()
    if (c.res.status === 200) {
      const parts = c.req.path.split('/')
      const entity = parts[2] || 'unknown'
      const id = parts[3] || ''
      const action = c.req.method
      const user = c.get('user')
      const details = `${user?.firstName} ${user?.lastName} performed ${action} on ${entity} ${id}`.trim()
      await logSystemActivity(c.var.prisma, entity, action, details).catch(console.error)
    }
  } else {
    await next()
  }
})

// ========================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ========================================

app.get('/users', requireRole('ADMIN'), async (c) => {
  const users = await c.var.prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      lastLoginAt: true,
      tenantProfile: {
        include: {
          tenant: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  return c.json({ users })
})

app.post('/users', requireRole('ADMIN'), zValidator('json', userInputSchema), async (c) => {
  const data = c.req.valid('json')
  
  // Check if email/username already exists
  const existing = await c.var.prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email.toLowerCase() },
        { username: data.username?.toLowerCase() }
      ]
    }
  })

  if (existing) {
    return c.json({ error: 'Email or username already exists' }, 400)
  }

  const user = await c.var.prisma.user.create({
    data: {
      id: randomUUID(),
      email: data.email.toLowerCase(),
      username: data.username?.toLowerCase(),
      passwordHash: hashPassword(data.password),
      role: data.role,
      status: data.status || 'ACTIVE',
      firstName: data.firstName,
      lastName: data.lastName,
      createdAt: new Date().toISOString(),
    }
  })

  // Link to tenant if provided
  if (data.role === 'TENANT' && data.tenantId) {
    await c.var.prisma.tenantProfile.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        tenantId: data.tenantId,
        notificationsEnabled: true,
      }
    })
  }

  return c.json({ success: true, user })
})

app.put('/users/:id', requireRole('ADMIN'), zValidator('json', userUpdateSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')

  const user = await c.var.prisma.user.update({
    where: { id },
    data: {
      ...data,
      email: data.email?.toLowerCase(),
      username: data.username?.toLowerCase(),
    }
  })

  return c.json({ success: true, user })
})

app.delete('/users/:id', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  const currentUser = c.get('user')

  if (id === currentUser.id) {
    return c.json({ error: 'Cannot delete your own account' }, 400)
  }

  await c.var.prisma.user.delete({ where: { id } })
  return c.json({ success: true })
})

app.post('/users/:id/suspend', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  await c.var.prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' }
  })
  return c.json({ success: true })
})

app.post('/users/:id/activate', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  await c.var.prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' }
  })
  return c.json({ success: true })
})

// ========================================
// MAINTENANCE REQUEST ROUTES
// ========================================

app.get('/maintenance-requests', async (c) => {
  const user = c.get('user')
  
  let where: any = {}
  
  // Tenants see only their requests
  if (user.role === 'TENANT') {
    const profile = await c.var.prisma.tenantProfile.findUnique({
      where: { userId: user.id }
    })
    if (!profile) return c.json({ requests: [] })
    
    const tenancies = await c.var.prisma.tenancy.findMany({
      where: { tenantId: profile.tenantId },
      select: { id: true }
    })
    
    where.tenancyId = { in: tenancies.map(t => t.id) }
  }

  const requests = await c.var.prisma.maintenanceRequest.findMany({
    where,
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      },
      attachments: true,
      comments: {
        orderBy: { timestamp: 'desc' }
      },
      assignee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { submittedDate: 'desc' }
  })

  return c.json({ requests })
})

app.post('/maintenance-requests', zValidator('json', maintenanceRequestSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const request = await c.var.prisma.maintenanceRequest.create({
    data: {
      id: randomUUID(),
      ...data,
      requestedBy: user.id,
      status: 'SUBMITTED',
      submittedDate: new Date().toISOString().split('T')[0],
    },
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      },
      attachments: true,
      comments: true
    }
  })

  // Create notification
  await c.var.prisma.notification.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      type: 'MAINTENANCE_UPDATE',
      title: 'Maintenance Request Submitted',
      message: `Your maintenance request "${data.title}" has been submitted successfully.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedId: request.id,
    }
  })

  return c.json({ success: true, request })
})

app.put('/maintenance-requests/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', maintenanceUpdateSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  
  const updateData: any = { ...data }
  
  if (data.status === 'ACKNOWLEDGED' && !updateData.acknowledgedDate) {
    updateData.acknowledgedDate = new Date().toISOString().split('T')[0]
  }
  
  if (data.status === 'RESOLVED' && !updateData.resolvedDate) {
    updateData.resolvedDate = new Date().toISOString().split('T')[0]
  }

  const request = await c.var.prisma.maintenanceRequest.update({
    where: { id },
    data: updateData,
    include: {
      tenancy: {
        include: {
          tenant: true
        }
      }
    }
  })

  // Notify tenant
  const tenantProfile = await c.var.prisma.tenantProfile.findUnique({
    where: { tenantId: request.tenancy.tenantId }
  })

  if (tenantProfile) {
    await c.var.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: tenantProfile.userId,
        type: 'MAINTENANCE_UPDATE',
        title: 'Maintenance Request Updated',
        message: `Your maintenance request has been updated to: ${data.status}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: request.id,
      }
    })
  }

  return c.json({ success: true, request })
})

app.post('/maintenance-requests/:id/comments', zValidator('json', maintenanceCommentSchema), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const { comment } = c.req.valid('json')

  const newComment = await c.var.prisma.maintenanceComment.create({
    data: {
      id: randomUUID(),
      requestId: id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      comment,
      timestamp: new Date().toISOString(),
    }
  })

  return c.json({ success: true, comment: newComment })
})

app.post('/maintenance-requests/:id/attachments', async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const body = await c.req.json()

  const attachment = await c.var.prisma.maintenanceAttachment.create({
    data: {
      id: randomUUID(),
      requestId: id,
      fileName: body.fileName,
      fileUrl: `/simulated-uploads/maintenance/${randomUUID()}_${body.fileName}`,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      fileType: body.fileType || 'IMAGE',
      fileSize: body.fileSize || 0,
    }
  })

  return c.json({ success: true, attachment })
})

// ========================================
// PAYMENT RECEIPT ROUTES
// ========================================

app.get('/payment-receipts', async (c) => {
  const user = c.get('user')
  
  let where: any = {}
  
  if (user.role === 'TENANT') {
    where.uploadedBy = user.id
  }

  const receipts = await c.var.prisma.paymentReceipt.findMany({
    where,
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      }
    },
    orderBy: { uploadedAt: 'desc' }
  })

  return c.json({ receipts })
})

app.post('/payment-receipts', zValidator('json', paymentReceiptSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const receipt = await c.var.prisma.paymentReceipt.create({
    data: {
      id: randomUUID(),
      ...data,
      uploadedBy: user.id,
      receiptUrl: `/simulated-uploads/receipts/${randomUUID()}_${data.fileName}`,
      uploadedAt: new Date().toISOString(),
      verificationStatus: 'PENDING',
    },
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      }
    }
  })

  return c.json({ success: true, receipt })
})

app.put('/payment-receipts/:id/verify', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', paymentVerificationSchema), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const data = c.req.valid('json')

  const receipt = await c.var.prisma.paymentReceipt.update({
    where: { id },
    data: {
      ...data,
      verifiedBy: user.id,
      verificationDate: new Date().toISOString(),
    },
    include: {
      tenancy: {
        include: {
          tenant: true
        }
      }
    }
  })

  // Notify tenant
  const tenantProfile = await c.var.prisma.tenantProfile.findUnique({
    where: { tenantId: receipt.tenancy.tenantId }
  })

  if (tenantProfile) {
    await c.var.prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: tenantProfile.userId,
        type: 'PAYMENT_CONFIRMED',
        title: data.verificationStatus === 'VERIFIED' ? 'Payment Verified' : 'Payment Rejected',
        message: data.verificationStatus === 'VERIFIED' 
          ? 'Your payment has been verified successfully.'
          : `Your payment was rejected. Reason: ${data.rejectionReason}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: receipt.id,
      }
    })
  }

  return c.json({ success: true, receipt })
})

// ========================================
// UTILITY BILL ROUTES
// ========================================

app.get('/utility-bills', async (c) => {
  const user = c.get('user')
  
  let where: any = {}
  
  if (user.role === 'TENANT') {
    where.uploadedBy = user.id
  }

  const bills = await c.var.prisma.utilityBill.findMany({
    where,
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      }
    },
    orderBy: { uploadedAt: 'desc' }
  })

  return c.json({ bills })
})

app.post('/utility-bills', zValidator('json', utilityBillSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const bill = await c.var.prisma.utilityBill.create({
    data: {
      id: randomUUID(),
      ...data,
      uploadedBy: user.id,
      billUrl: `/simulated-uploads/bills/${randomUUID()}_${data.fileName}`,
      uploadedAt: new Date().toISOString(),
      status: 'UPLOADED',
    },
    include: {
      tenancy: {
        include: {
          tenant: true,
          property: true
        }
      }
    }
  })

  return c.json({ success: true, bill })
})

app.put('/utility-bills/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const bill = await c.var.prisma.utilityBill.update({
    where: { id },
    data: {
      status: body.status,
      paidDate: body.paidDate,
      paidBy: body.paidBy,
      notes: body.notes,
    }
  })

  return c.json({ success: true, bill })
})

// ========================================
// NOTIFICATION ROUTES
// ========================================

app.get('/notifications', async (c) => {
  const user = c.get('user')

  const notifications = await c.var.prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return c.json({ notifications })
})

app.put('/notifications/:id/read', async (c) => {
  const id = c.req.param('id')
  
  await c.var.prisma.notification.update({
    where: { id },
    data: { isRead: true }
  })

  return c.json({ success: true })
})

app.post('/notifications/mark-all-read', async (c) => {
  const user = c.get('user')

  await c.var.prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true }
  })

  return c.json({ success: true })
})

// ========================================
// TENANT PORTAL ROUTES
// ========================================

app.get('/tenant/my-tenancy', requireRole('TENANT'), async (c) => {
  const user = c.get('user')

  const profile = await c.var.prisma.tenantProfile.findUnique({
    where: { userId: user.id },
    include: {
      tenant: true
    }
  })

  if (!profile) {
    return c.json({ error: 'Tenant profile not found' }, 404)
  }

  const tenancies = await c.var.prisma.tenancy.findMany({
    where: { tenantId: profile.tenantId },
    include: {
      property: true,
      rentCollections: {
        orderBy: { expectedCollectionDate: 'desc' }
      },
      depositTxns: {
        orderBy: { date: 'desc' }
      },
      activities: {
        orderBy: { date: 'desc' }
      }
    }
  })

  return c.json({
    tenant: profile.tenant,
    tenancies
  })
})

app.get('/tenant/my-property', requireRole('TENANT'), async (c) => {
  const user = c.get('user')

  const profile = await c.var.prisma.tenantProfile.findUnique({
    where: { userId: user.id }
  })

  if (!profile) {
    return c.json({ error: 'Tenant profile not found' }, 404)
  }

  const tenancy = await c.var.prisma.tenancy.findFirst({
    where: {
      tenantId: profile.tenantId,
      status: { in: ['Active', 'Expiring'] }
    },
    include: {
      property: true
    },
    orderBy: { commencementDate: 'desc' }
  })

  return c.json({ property: tenancy?.property || null, tenancy: tenancy || null })
})

// ========================================
// BOOTSTRAP & LEGACY ROUTES
// ========================================

app.get('/bootstrap', async (c) => {
  await ensureStarterData(c.var.prisma)
  const response = await buildBootstrapResponse(c.var.prisma)
  
  // Add user info to bootstrap
  const user = c.get('user')
  return c.json({
    ...response,
    currentUser: user
  })
})

app.get('/properties', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  return c.json({ properties: (await buildBootstrapResponse(c.var.prisma)).state.properties })
})

app.post('/properties', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', propertyInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createPropertyRecord(c.var.prisma, payload) })
})

app.put('/properties/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', propertyInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updatePropertyRecord(c.var.prisma, id, payload) })
})

app.delete('/properties/:id', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deletePropertyRecord(c.var.prisma, id) })
})

app.get('/tenants', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  return c.json({ tenants: (await buildBootstrapResponse(c.var.prisma)).state.tenants })
})

app.post('/tenants', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenantInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenantRecord(c.var.prisma, payload) })
})

app.put('/tenants/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenantInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updateTenantRecord(c.var.prisma, id, payload) })
})

app.delete('/tenants/:id', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deleteTenantRecord(c.var.prisma, id) })
})

app.get('/tenancies', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  return c.json({ tenancies: (await buildBootstrapResponse(c.var.prisma)).state.tenancies })
})

app.post('/tenancies', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenancyInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenancyRecord(c.var.prisma, payload) })
})

app.put('/tenancies/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenancyInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updateTenancyRecord(c.var.prisma, id, payload) })
})

app.delete('/tenancies/:id', requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deleteTenancyRecord(c.var.prisma, id) })
})

app.post('/tenancies/:id/close-early', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await closeTenancyEarlyRecord(c.var.prisma, id) })
})

app.get('/monthly-profit-loss', requireRole('ADMIN', 'EMPLOYEE'), async (c) => {
  const periodMonth = c.req.query('periodMonth') || ''
  const propertyIds = (c.req.query('propertyIds') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return c.json(await buildMonthlyProfitLossPayload(c.var.prisma, periodMonth, propertyIds))
})

app.put('/monthly-rental-income', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', monthlyRentalIncomeInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await saveMonthlyRentalIncomeRecord(c.var.prisma, payload) })
})

app.put('/monthly-expense-entry', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', monthlyExpenseEntryInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await saveMonthlyExpenseEntryRecord(c.var.prisma, payload) })
})

app.post('/rent-collections', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', rentCollectionInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createRentCollectionEntry(c.var.prisma, payload) })
})

app.post('/tenant-activities', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenantActivityInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenantActivityEntry(c.var.prisma, payload) })
})

app.post('/renovations', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', renovationInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createRenovationRecord(c.var.prisma, payload) })
})

app.put('/renovations/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', renovationInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  await c.var.prisma.renovationItem.update({ where: { id }, data: payload })
  return c.json({ state: await ensureStarterData(c.var.prisma).then(() => c.var.prisma).then(p => import('../../server/state.ts').then(m => m.buildState(p))) })
})

app.put('/tenant-activities/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', tenantActivityInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  await c.var.prisma.tenantActivity.update({ where: { id }, data: payload })
  return c.json({ state: await import('../../server/state.ts').then(m => m.buildState(c.var.prisma)) })
})

app.put('/rent-collections/:id', requireRole('ADMIN', 'EMPLOYEE'), zValidator('json', rentCollectionInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  await c.var.prisma.rentCollectionRecord.update({ where: { id }, data: payload })
  return c.json({ state: await import('../../server/state.ts').then(m => m.buildState(c.var.prisma)) })
})

app.get('/system-logs', requireRole('ADMIN'), async (c) => {
  const logs = await c.var.prisma.systemActivityLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  })
  return c.json({ logs })
})

app.post('/admin/restore-starter-data', requireRole('ADMIN'), async (c) => {
  return c.json({ state: await seedStarterData(c.var.prisma) })
})

export const onRequest = handle(app)

