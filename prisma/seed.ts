import { PrismaClient } from '@prisma/client'
import { seedStarterData } from '../server/state.ts'

const prisma = new PrismaClient()

// Simple password hashing simulation (in production, use bcrypt)
const hashPassword = (password: string): string => {
  // For development: simple base64 encoding (NOT secure for production)
  // In production, replace with: await bcrypt.hash(password, 10)
  return Buffer.from(password).toString('base64')
}

const randomUUID = () => crypto.randomUUID()

try {
  // Seed operational data (properties, tenancies, etc.)
  await seedStarterData(prisma)
  console.log('✓ Starter operational data restored.')

  // Get the first tenant from the seeded data
  const firstTenant = await prisma.tenant.findFirst({
    orderBy: { name: 'asc' }
  })

  // Create default users
  await prisma.user.create({
    data: {
      id: randomUUID(),
      email: 'admin@rental.com',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      status: 'ACTIVE',
      firstName: 'System',
      lastName: 'Administrator',
      createdAt: new Date().toISOString(),
    }
  })
  console.log('✓ Admin user created: admin@rental.com / admin123')

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email: 'employee@rental.com',
      username: 'employee',
      passwordHash: hashPassword('employee123'),
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      firstName: 'John',
      lastName: 'Employee',
      createdAt: new Date().toISOString(),
    }
  })
  console.log('✓ Employee user created: employee@rental.com / employee123')

  if (firstTenant) {
    const tenantUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: firstTenant.email || 'tenant@rental.com',
        username: `tenant_${firstTenant.id.slice(0, 8)}`,
        passwordHash: hashPassword('tenant123'),
        role: 'TENANT',
        status: 'ACTIVE',
        firstName: firstTenant.name.split(' ')[0] || 'Tenant',
        lastName: firstTenant.name.split(' ').slice(1).join(' ') || 'User',
        createdAt: new Date().toISOString(),
      }
    })

    // Link tenant to user profile
    await prisma.tenantProfile.create({
      data: {
        id: randomUUID(),
        userId: tenantUser.id,
        tenantId: firstTenant.id,
        phoneNumber: firstTenant.mobile,
        preferredContactMethod: 'EMAIL',
        notificationsEnabled: true,
      }
    })
    console.log(`✓ Tenant user created: ${tenantUser.email} / tenant123`)
  }

  // Create sample maintenance request if tenancy exists
  const firstTenancy = await prisma.tenancy.findFirst()
  if (firstTenancy && firstTenant) {
    const tenantUser = await prisma.user.findFirst({
      where: { role: 'TENANT' }
    })
    
    if (tenantUser) {
      const maintenanceRequest = await prisma.maintenanceRequest.create({
        data: {
          id: randomUUID(),
          tenancyId: firstTenancy.id,
          requestedBy: tenantUser.id,
          category: 'PLUMBING',
          title: 'Leaking kitchen faucet',
          description: 'The kitchen faucet has been dripping continuously for the past week. It seems to need a new washer or seal.',
          urgency: 'MEDIUM',
          status: 'SUBMITTED',
          submittedDate: new Date().toISOString().split('T')[0],
        }
      })

      // Add sample attachment (simulated)
      await prisma.maintenanceAttachment.create({
        data: {
          id: randomUUID(),
          requestId: maintenanceRequest.id,
          fileName: 'faucet_leak.jpg',
          fileUrl: '/simulated-uploads/maintenance/faucet_leak.jpg',
          uploadedBy: tenantUser.id,
          uploadedAt: new Date().toISOString(),
          fileType: 'IMAGE',
          fileSize: 245678,
        }
      })

      // Add sample comment
      await prisma.maintenanceComment.create({
        data: {
          id: randomUUID(),
          requestId: maintenanceRequest.id,
          userId: tenantUser.id,
          userName: `${tenantUser.firstName} ${tenantUser.lastName}`,
          comment: 'The leak is getting worse. Please prioritize this.',
          timestamp: new Date().toISOString(),
        }
      })

      console.log('✓ Sample maintenance request created')

      // Create sample notifications
      await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId: tenantUser.id,
          type: 'PAYMENT_DUE',
          title: 'Rent Payment Due',
          message: 'Your rent payment for this month is due in 5 days.',
          isRead: false,
          createdAt: new Date().toISOString(),
        }
      })

      await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId: tenantUser.id,
          type: 'MAINTENANCE_UPDATE',
          title: 'Maintenance Request Submitted',
          message: 'Your maintenance request has been submitted successfully. We will review it shortly.',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: maintenanceRequest.id,
        }
      })

      console.log('✓ Sample notifications created')
    }
  }

  console.log('\n✓ Database seeded successfully!')
  console.log('\nLogin Credentials:')
  console.log('  Admin:    admin@rental.com / admin123')
  console.log('  Employee: employee@rental.com / employee123')
  console.log('  Tenant:   Check the email of the first tenant / tenant123')

} finally {
  await prisma.$disconnect()
}
