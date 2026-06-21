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
} from '../../server/state.ts'
import {
  loginSchema,
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
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

app.use('*', async (c, next) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })
  c.set('prisma', prisma)
  await next()
})

// Authentication Middleware
app.use('*', async (c, next) => {
  // Allow login/logout and preflight without auth
  if (c.req.method === 'OPTIONS') return await next()
  if (c.req.path === '/api/login' || c.req.path === '/api/logout') {
    return await next()
  }

  const authCookie = getCookie(c, 'auth_token')
  const expectedPassword = c.env.ADMIN_PASSWORD || 'admin'
  
  if (authCookie !== expectedPassword) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  await next()
})

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json')
  const password = body.password
  const expectedPassword = c.env.ADMIN_PASSWORD || 'admin'

  if (password === expectedPassword) {
    setCookie(c, 'auth_token', password, {
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return c.json({ success: true })
  }
  
  return c.json({ error: 'Invalid password' }, 401)
})

app.post('/logout', async (c) => {
  deleteCookie(c, 'auth_token')
  return c.json({ success: true })
})

app.get('/bootstrap', async (c) => {
  await ensureStarterData(c.var.prisma)
  return c.json(await buildBootstrapResponse(c.var.prisma))
})

app.get('/properties', async (c) => {
  return c.json({ properties: (await buildBootstrapResponse(c.var.prisma)).state.properties })
})

app.post('/properties', zValidator('json', propertyInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createPropertyRecord(c.var.prisma, payload) })
})

app.put('/properties/:id', zValidator('json', propertyInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updatePropertyRecord(c.var.prisma, id, payload) })
})

app.delete('/properties/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deletePropertyRecord(c.var.prisma, id) })
})

app.get('/tenants', async (c) => {
  return c.json({ tenants: (await buildBootstrapResponse(c.var.prisma)).state.tenants })
})

app.post('/tenants', zValidator('json', tenantInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenantRecord(c.var.prisma, payload) })
})

app.put('/tenants/:id', zValidator('json', tenantInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updateTenantRecord(c.var.prisma, id, payload) })
})

app.delete('/tenants/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deleteTenantRecord(c.var.prisma, id) })
})

app.get('/tenancies', async (c) => {
  return c.json({ tenancies: (await buildBootstrapResponse(c.var.prisma)).state.tenancies })
})

app.post('/tenancies', zValidator('json', tenancyInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenancyRecord(c.var.prisma, payload) })
})

app.put('/tenancies/:id', zValidator('json', tenancyInputSchema), async (c) => {
  const id = c.req.param('id')
  const payload = c.req.valid('json')
  return c.json({ state: await updateTenancyRecord(c.var.prisma, id, payload) })
})

app.delete('/tenancies/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await deleteTenancyRecord(c.var.prisma, id) })
})

app.post('/tenancies/:id/close-early', async (c) => {
  const id = c.req.param('id')
  return c.json({ state: await closeTenancyEarlyRecord(c.var.prisma, id) })
})

app.get('/monthly-profit-loss', async (c) => {
  const periodMonth = c.req.query('periodMonth') || ''
  const propertyIds = (c.req.query('propertyIds') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return c.json(await buildMonthlyProfitLossPayload(c.var.prisma, periodMonth, propertyIds))
})

app.put('/monthly-rental-income', zValidator('json', monthlyRentalIncomeInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await saveMonthlyRentalIncomeRecord(c.var.prisma, payload) })
})

app.put('/monthly-expense-entry', zValidator('json', monthlyExpenseEntryInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await saveMonthlyExpenseEntryRecord(c.var.prisma, payload) })
})

app.post('/rent-collections', zValidator('json', rentCollectionInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createRentCollectionEntry(c.var.prisma, payload) })
})

app.post('/tenant-activities', zValidator('json', tenantActivityInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createTenantActivityEntry(c.var.prisma, payload) })
})

app.post('/renovations', zValidator('json', renovationInputSchema), async (c) => {
  const payload = c.req.valid('json')
  return c.json({ state: await createRenovationRecord(c.var.prisma, payload) })
})

app.post('/admin/restore-starter-data', async (c) => {
  return c.json({ state: await seedStarterData(c.var.prisma) })
})

export const onRequest = handle(app)

