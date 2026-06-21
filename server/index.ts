import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { promisify } from 'node:util'
import { PrismaClient } from '@prisma/client'
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
  ensureStarterData,
  saveMonthlyExpenseEntryRecord,
  saveMonthlyRentalIncomeRecord,
  seedStarterData,
} from './state.ts'
import type {
  MonthlyExpenseEntryInput,
  MonthlyRentalIncomeInput,
  PropertyInput,
  RentCollectionInput,
  RenovationInput,
  TenantActivityInput,
  TenantInput,
  TenancyInput,
} from '../src/types.ts'

const execFileAsync = promisify(execFile)
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT || 3001)

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const sendText = (res: ServerResponse, status: number, payload: string) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(payload)
}

const parseBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as T) : ({} as T)
}

const withCors = (res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const ensureDatabaseReady = async () => {
  await execFileAsync('./node_modules/.bin/prisma', ['db', 'push', '--skip-generate'], {
    cwd: process.cwd(),
  })
  await ensureStarterData(prisma)
}

await ensureDatabaseReady()

createServer(async (req, res) => {
  withCors(res)
  if (!req.url || !req.method) {
    sendText(res, 400, 'Invalid request.')
    return
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`)

  try {
    if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
      send(res, 200, await buildBootstrapResponse(prisma))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/properties') {
      send(res, 200, { properties: (await buildBootstrapResponse(prisma)).state.properties })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/properties') {
      const payload = await parseBody<PropertyInput>(req)
      send(res, 200, { state: await createPropertyRecord(prisma, payload) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/tenants') {
      send(res, 200, { tenants: (await buildBootstrapResponse(prisma)).state.tenants })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tenants') {
      const payload = await parseBody<TenantInput>(req)
      send(res, 200, { state: await createTenantRecord(prisma, payload) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/tenancies') {
      send(res, 200, { tenancies: (await buildBootstrapResponse(prisma)).state.tenancies })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tenancies') {
      const payload = await parseBody<TenancyInput>(req)
      send(res, 200, { state: await createTenancyRecord(prisma, payload) })
      return
    }

    if (req.method === 'POST' && url.pathname.startsWith('/api/tenancies/') && url.pathname.endsWith('/close-early')) {
      const tenancyId = url.pathname.split('/')[3]
      send(res, 200, { state: await closeTenancyEarlyRecord(prisma, tenancyId) })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/monthly-profit-loss') {
      const periodMonth = url.searchParams.get('periodMonth') || ''
      const propertyIds = (url.searchParams.get('propertyIds') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      send(res, 200, await buildMonthlyProfitLossPayload(prisma, periodMonth, propertyIds))
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/monthly-rental-income') {
      const payload = await parseBody<MonthlyRentalIncomeInput>(req)
      send(res, 200, { state: await saveMonthlyRentalIncomeRecord(prisma, payload) })
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/monthly-expense-entry') {
      const payload = await parseBody<MonthlyExpenseEntryInput>(req)
      send(res, 200, { state: await saveMonthlyExpenseEntryRecord(prisma, payload) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/rent-collections') {
      const payload = await parseBody<RentCollectionInput>(req)
      send(res, 200, { state: await createRentCollectionEntry(prisma, payload) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/tenant-activities') {
      const payload = await parseBody<TenantActivityInput>(req)
      send(res, 200, { state: await createTenantActivityEntry(prisma, payload) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/renovations') {
      const payload = await parseBody<RenovationInput>(req)
      send(res, 200, { state: await createRenovationRecord(prisma, payload) })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/restore-starter-data') {
      send(res, 200, { state: await seedStarterData(prisma) })
      return
    }

    sendText(res, 404, 'Route not found.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.'
    sendText(res, 500, message)
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Rental API listening on http://127.0.0.1:${PORT}`)
})
