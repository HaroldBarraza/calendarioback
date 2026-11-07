import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@planning.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️  Admin ya existe: ${email}`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Administrador',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Admin creado: ${admin.email}`);
  console.log(`   Cambia la contraseña al primer login.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed falló:', e);
  process.exit(1);
});