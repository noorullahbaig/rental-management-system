import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import {
  buildBootstrapResponse,
  buildMonthlyProfitLossPayload,
  closeTenancyEarlyRecord,
  createPropertyRecord,
  createRentCollectionEntry,
  createRenovationRecord,
  createTenancyRecord,
  createTenantActivityEntry,
  createTenantRecord,
  saveMonthlyExpenseEntryRecord,
  saveMonthlyRentalIncomeRecord,
  seedStarterData,
  ensureStarterData,
} from '../../server/state.ts'

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

app.post('/login', async (c) => {
  const body = await c.req.json()
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

app.post('/properties', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createPropertyRecord(c.var.prisma, payload) })
})

app.get('/tenants', async (c) => {
  return c.json({ tenants: (await buildBootstrapResponse(c.var.prisma)).state.tenants })
})

app.post('/tenants', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createTenantRecord(c.var.prisma, payload) })
})

app.get('/tenancies', async (c) => {
  return c.json({ tenancies: (await buildBootstrapResponse(c.var.prisma)).state.tenancies })
})

app.post('/tenancies', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createTenancyRecord(c.var.prisma, payload) })
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

app.put('/monthly-rental-income', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await saveMonthlyRentalIncomeRecord(c.var.prisma, payload) })
})

app.put('/monthly-expense-entry', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await saveMonthlyExpenseEntryRecord(c.var.prisma, payload) })
})

app.post('/rent-collections', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createRentCollectionEntry(c.var.prisma, payload) })
})

app.post('/tenant-activities', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createTenantActivityEntry(c.var.prisma, payload) })
})

app.post('/renovations', async (c) => {
  const payload = await c.req.json()
  return c.json({ state: await createRenovationRecord(c.var.prisma, payload) })
})

app.post('/admin/restore-starter-data', async (c) => {
  return c.json({ state: await seedStarterData(c.var.prisma) })
})

export const onRequest = app.fetch
