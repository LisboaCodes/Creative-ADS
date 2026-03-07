import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // --- Users only (no demo data) ---
  console.log('👤 Creating users...');
  const adminPassword = process.env.ADMIN_PASSWORD || 'Lisboa2026!';
  const hashedAdmin = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'lisboa.codes@gmail.com' },
    update: {},
    create: {
      email: 'lisboa.codes@gmail.com',
      password: hashedAdmin,
      name: 'Lisboa Admin',
      role: 'ADMIN',
    },
  });
  console.log(`  ✅ Admin user: ${adminUser.email}`);

  console.log('\n🎉 Seed completed!');
  console.log('📌 Conecte suas plataformas reais em /platforms');
  console.log('\n🔐 Admin Login:');
  console.log(`   Email: lisboa.codes@gmail.com`);
  console.log(`   Password: ${adminPassword === 'Lisboa2026!' ? 'Lisboa2026!' : '(from ADMIN_PASSWORD env)'}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
