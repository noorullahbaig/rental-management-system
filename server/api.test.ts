import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'

const port = 3012
const baseUrl = `http://127.0.0.1:${port}/api`

const server = spawn('node', ['--experimental-strip-types', 'server/index.ts'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const waitForServer = async () =>
  new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API server did not start in time.')), 20000)

    const onData = (chunk: Buffer) => {
      if (chunk.toString('utf8').includes('Rental API listening')) {
        clearTimeout(timeout)
        resolve()
      }
    }

    server.stdout.on('data', onData)
    server.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8')
      if (text && !text.includes('ExperimentalWarning')) {
        clearTimeout(timeout)
        reject(new Error(text))
      }
    })
    server.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`API server exited early with code ${code}.`))
    })
  })

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return (await response.json()) as T
}

try {
  await waitForServer()

  const restored = await request<{ state: { properties: Array<{ id: string }>; expenseCategories: Array<{ id: string }>; tenantActivities: Array<{ notes: string }> } }>(
    '/admin/restore-starter-data',
    { method: 'POST', body: JSON.stringify({}) },
  )
  assert.equal(restored.state.properties.length, 4)

  const bootstrap = await request<{ state: { properties: Array<{ id: string }>; monthlyExpenseEntries: Array<{ amount: number; expenseCategoryId: string; propertyId: string; periodMonth: string }> } }>('/bootstrap')
  assert.equal(bootstrap.state.properties.length, 4)

  const firstPropertyId = bootstrap.state.properties[0]?.id
  assert.ok(firstPropertyId)

  const createdPropertyState = await request<{
    state: { properties: Array<{ serialNumber: string; address: { streetAddress: string }; projectName: string }> }
  }>('/properties', {
    method: 'POST',
    body: JSON.stringify({
      address: {
        unitNumber: 'B-99-09',
        streetAddress: 'API Smoke Lane',
        cityState: 'Test City',
      },
      kind: 'Highrise',
      ownership: 'Freehold',
      spaPrice: 100000,
      bookValue: 90000,
      marketValue: 120000,
      projectName: 'API Smoke Project',
      developerName: 'QA Developer',
    }),
  })

  const createdProperty = createdPropertyState.state.properties.find((item) => item.address.streetAddress === 'API Smoke Lane')
  assert.equal(createdProperty?.serialNumber, '00005')

  await request('/monthly-expense-entry', {
    method: 'PUT',
    body: JSON.stringify({
      propertyId: firstPropertyId,
      periodMonth: '2026-05',
      expenseCategoryId: 'cat-maintenance',
      amount: 444,
    }),
  })

  const monthlyProfitLoss = await request<{
    reports: Array<{ propertyId: string; directExpenses: Array<{ categoryId: string; amount: number }> }>
    summary: { totalNetRentalAmountReceive: number }
  }>(`/monthly-profit-loss?periodMonth=2026-05&propertyIds=${firstPropertyId}`)

  assert.equal(monthlyProfitLoss.reports[0]?.directExpenses.find((item) => item.categoryId === 'cat-maintenance')?.amount, 444)
  assert.ok(Number.isFinite(monthlyProfitLoss.summary.totalNetRentalAmountReceive))

  const activity = await request<{ state: { tenantActivities: Array<{ notes: string }> } }>('/tenant-activities', {
    method: 'POST',
    body: JSON.stringify({
      tenancyId: 'tenancy-horizon-michael',
      date: '2026-06-13',
      type: 'Note',
      notes: 'API smoke test note.',
    }),
  })

  assert.equal(activity.state.tenantActivities.some((item) => item.notes === 'API smoke test note.'), true)

  console.log('API bootstrap and monthly close endpoints persist and recalculate correctly.')
} finally {
  await request('/admin/restore-starter-data', {
    method: 'POST',
    body: JSON.stringify({}),
  }).catch(() => {})
  server.kill('SIGTERM')
}
