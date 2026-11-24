import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, ActivityStatus } from '../src/generated/prisma/client.js';

interface SeedActivity {
  date: string;
  name: string;
  timeDefined: boolean;
  startTime?: string;
  status?: ActivityStatus;
  organization: string;
  neighborhood: string;
  notes?: string;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@planning.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  // ─────────────────────────────────────────
  // 1. ADMIN
  // ─────────────────────────────────────────
  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(password, 12);
    admin = await prisma.user.create({
      data: { email, passwordHash, fullName: 'Administrador', role: Role.ADMIN, isActive: true },
    });
    console.log(`✅ Admin creado: ${admin.email}`);
  } else {
    console.log(`ℹ️  Admin ya existe: ${admin.email}`);
  }

  // ─────────────────────────────────────────
  // 2. Catálogos base
  // ─────────────────────────────────────────
  const SEED_ORGS = [
    'Church of Jesus Christ', 'Estaca', 'SOC SOC', 'HHMMJJ', 'Primaria',
    'JAS', 'Jóvenes', 'Historia Familiar', 'Bienestar y Autosuficiencia',
  ];
  const SEED_NBS = [
    'Churchwide', 'Church of Jesus Christ', 'Estaca',
    'Manco Capac', 'Llavini', 'Huascar', 'Huajsapata', 'El Mirador', 'Tupac Yupanqui',
  ];

  const orgMap = new Map<string, string>();
  for (const name of SEED_ORGS) {
    const org = await prisma.organization.upsert({
      where: { name },
      update: {},
      create: { name, description: `Organización: ${name}`, isActive: true },
    });
    orgMap.set(name, org.id);
  }

  const nbMap = new Map<string, string>();
  for (const name of SEED_NBS) {
    const nb = await prisma.neighborhood.upsert({
      where: { name },
      update: {},
      create: { name, description: `Barrio: ${name}`, isActive: true },
    });
    nbMap.set(name, nb.id);
  }

  const peruPlace = await prisma.place.upsert({
    where: { name_address: { name: 'Perú', address: 'Nacional' } },
    update: {},
    create: { name: 'Perú', address: 'Nacional', description: 'Aplicable a todo el país', isActive: true },
  });

  // ─────────────────────────────────────────
  // 3. LIMPIAR TODAS LAS ACTIVIDADES
  // ─────────────────────────────────────────
  const deleted = await prisma.activity.deleteMany({});
  console.log(`🧹 ${deleted.count} actividades eliminadas`);

  // ─────────────────────────────────────────
  // 4. Eventos Churchwide 2027 (mantener tal cual)
  // ─────────────────────────────────────────
  const churchwide: SeedActivity[] = [
    { date: '2027-01-16', name: 'Discusión mundial "Regocijaos en Cristo"', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del sábado 16 al domingo 17 de enero de 2027' },
    { date: '2027-02-07', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '22:00', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 8:00 PM MST (Salt Lake City) → 10:00 PM Perú' },
    { date: '2027-03-04', name: 'RootsTech', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del jueves 4 al domingo 7 de marzo de 2027' },
    { date: '2027-03-04', name: 'Instrucción de liderazgo de templo e historia familiar', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del jueves 4 al viernes 5 de marzo de 2027' },
    { date: '2027-03-06', name: 'Devocional mundial de la Sociedad de Socorro', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del sábado 6 al domingo 7 de marzo de 2027' },
    { date: '2027-03-06', name: 'Día del descubrimiento familiar (Churchwide)', timeDefined: true, startTime: '17:30', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 3:30 PM MST (Salt Lake City) → 5:30 PM Perú' },
    { date: '2027-03-21', name: 'Semana Santa y Domingo de Resurrección', timeDefined: false, status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del domingo 21 al lunes 29 de marzo de 2027' },
    { date: '2027-04-03', name: 'Conferencia General (Sesión del sábado)', timeDefined: true, startTime: '12:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 11:00 AM – 5:00 PM MDT → 12:00 PM – 6:00 PM Perú' },
    { date: '2027-04-04', name: 'Conferencia General (Sesión del domingo)', timeDefined: true, startTime: '12:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 11:00 AM – 5:00 PM MDT → 12:00 PM – 6:00 PM Perú' },
    { date: '2027-04-05', name: 'Inicio de la Celebración del Templo de Salt Lake', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del lunes 5 al martes 6 de abril de 2027' },
    { date: '2027-05-02', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '20:00', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 7:00 PM MDT (Salt Lake City) → 8:00 PM Perú' },
    { date: '2027-05-22', name: 'Video "Amigo a Amigo" para niños', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del sábado 22 al domingo 23 de mayo de 2027' },
    { date: '2027-06-10', name: 'Conferencia de Educadores Religiosos', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del jueves 10 al sábado 12 de junio de 2027' },
    { date: '2027-09-04', name: 'Video "Amigo a Amigo" para niños', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del sábado 4 al domingo 5 de septiembre de 2027' },
    { date: '2027-10-01', name: 'Evento de clausura de la Celebración del Templo de Salt Lake', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del viernes 1 al sábado 2 de octubre de 2027' },
    { date: '2027-10-02', name: 'Conferencia General (Sesión del sábado)', timeDefined: true, startTime: '12:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 11:00 AM – 5:00 PM MDT → 12:00 PM – 6:00 PM Perú' },
    { date: '2027-10-03', name: 'Conferencia General (Sesión del domingo)', timeDefined: true, startTime: '12:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 11:00 AM – 5:00 PM MDT → 12:00 PM – 6:00 PM Perú' },
    { date: '2027-11-07', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '22:00', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Original 8:00 PM MST (Salt Lake City) → 10:00 PM Perú' },
    { date: '2027-12-05', name: 'Devocional navideño de la Primera Presidencia', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Del domingo 5 al lunes 6 de diciembre de 2027' },
  ];

  // ─────────────────────────────────────────
  // 5. Conferencias de barrio (mantener tal cual)
  // ─────────────────────────────────────────
  const barrioConferencias: SeedActivity[] = [
    { date: '2027-03-14', name: 'Conferencia de Barrio El Mirador', timeDefined: true, startTime: '09:00', organization: 'Estaca', neighborhood: 'El Mirador' },
    { date: '2027-06-13', name: 'Conferencia de Barrio Tupac Yupanqui', timeDefined: true, startTime: '09:30', organization: 'Estaca', neighborhood: 'Tupac Yupanqui' },
    { date: '2027-07-11', name: 'Conferencia de Barrio Llavini', timeDefined: true, startTime: '10:30', organization: 'Estaca', neighborhood: 'Llavini' },
    { date: '2027-08-08', name: 'Conferencia de Barrio Manco Capac', timeDefined: true, startTime: '10:30', organization: 'Estaca', neighborhood: 'Manco Capac' },
    { date: '2027-08-15', name: 'Conferencia de Barrio Huascar', timeDefined: true, startTime: '09:00', organization: 'Estaca', neighborhood: 'Huascar' },
    { date: '2027-11-21', name: 'Conferencia de Barrio Huajsapata', timeDefined: true, startTime: '09:00', organization: 'Estaca', neighborhood: 'Huajsapata' },
  ];

  // ─────────────────────────────────────────
  // 6. Presentaciones de Primaria (mantener tal cual)
  // ─────────────────────────────────────────
  const primariaPresentaciones: SeedActivity[] = [
    { date: '2027-04-18', name: 'Presentación de Primaria Manco Capac', timeDefined: true, startTime: '10:30', organization: 'Primaria', neighborhood: 'Manco Capac' },
    { date: '2027-05-30', name: 'Presentación de Primaria Llavini', timeDefined: true, startTime: '10:30', organization: 'Primaria', neighborhood: 'Llavini' },
    { date: '2027-06-27', name: 'Presentación de Primaria Huascar', timeDefined: true, startTime: '09:00', organization: 'Primaria', neighborhood: 'Huascar' },
    { date: '2027-08-08', name: 'Presentación de Primaria Huajsapata', timeDefined: true, startTime: '09:30', organization: 'Primaria', neighborhood: 'Huajsapata' },
    { date: '2027-09-12', name: 'Presentación de Primaria El Mirador', timeDefined: true, startTime: '09:30', organization: 'Primaria', neighborhood: 'El Mirador' },
    { date: '2027-11-21', name: 'Presentación de Primaria Tupac Yupanqui', timeDefined: true, startTime: '10:30', organization: 'Primaria', neighborhood: 'Tupac Yupanqui' },
  ];

  // ─────────────────────────────────────────
  // 7. Fiestas de organizaciones
  // ─────────────────────────────────────────
  const fiestas: SeedActivity[] = [
    { date: '2027-03-19', name: 'Fiesta de Sociedad de Socorro', timeDefined: true, startTime: '19:00', organization: 'SOC SOC', neighborhood: 'Estaca' },
    { date: '2027-06-11', name: 'Fiesta de Retornados', timeDefined: true, startTime: '19:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-08-28', name: 'Fiesta de Primaria', timeDefined: true, startTime: '17:00', organization: 'Primaria', neighborhood: 'Estaca' },
    { date: '2027-09-24', name: 'Fiesta de Jóvenes', timeDefined: true, startTime: '19:00', organization: 'HHMMJJ', neighborhood: 'Estaca' },
    { date: '2027-10-15', name: 'Fiesta de JAS', timeDefined: false, organization: 'JAS', neighborhood: 'Estaca', notes: 'Fecha por definir' },
    { date: '2027-12-31', name: 'Fiesta de Fin de Año', timeDefined: true, startTime: '19:00', organization: 'Estaca', neighborhood: 'Estaca' },
  ];

  // ─────────────────────────────────────────
  // 8. Capacitaciones de Líderes (4 al año)
  //    Consejo de Estaca 1h antes (16:00) → Capacitación 17:00
  // ─────────────────────────────────────────
  const capacitacionesLideres: SeedActivity[] = [
    // Febrero
    { date: '2027-02-21', name: 'Consejo de Estaca', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-02-21', name: 'Capacitación de Líderes', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },

    // Mayo
    { date: '2027-05-30', name: 'Consejo de Estaca', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-05-30', name: 'Capacitación de Líderes', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },

    // Septiembre
    { date: '2027-09-12', name: 'Consejo de Estaca', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-09-12', name: 'Capacitación de Líderes', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },

    // Noviembre
    { date: '2027-11-21', name: 'Consejo de Estaca', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-11-21', name: 'Capacitación de Líderes', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },
  ];

  // ─────────────────────────────────────────
  // 9. Otros eventos del año
  // ─────────────────────────────────────────
  const otrosEventos: SeedActivity[] = [
    { date: '2027-01-24', name: 'Devocional Mi Camino a la Autosuficiencia', timeDefined: false, organization: 'Bienestar y Autosuficiencia', neighborhood: 'Estaca', notes: 'Organización: Bienestar y Autosuficiencia' },
    { date: '2027-02-18', name: 'Viaje al Templo de hombres y mujeres jóvenes', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Estaca' },
    { date: '2027-03-28', name: 'Pascua', timeDefined: false, status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Churchwide', notes: 'Celebración de la Resurrección de Jesucristo' },
    { date: '2027-04-17', name: 'Día de Descubrimiento Familiar', timeDefined: false, organization: 'Historia Familiar', neighborhood: 'Estaca', notes: 'Organización: Historia Familiar' },
    { date: '2027-07-23', name: 'Festival de Danzas', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca' },
  ];

  // ─────────────────────────────────────────
  // 10. Insertar todo
  // ─────────────────────────────────────────
  const allActivities: SeedActivity[] = [
    ...churchwide,
    ...barrioConferencias,
    ...primariaPresentaciones,
    ...fiestas,
    ...capacitacionesLideres,
    ...otrosEventos,
  ];

  let created = 0;
  for (const a of allActivities) {
    const activityDate = new Date(`${a.date}T00:00:00.000Z`);
    const startTime = a.timeDefined && a.startTime
      ? new Date(`1970-01-01T${a.startTime}:00.000Z`)
      : null;

    await prisma.activity.create({
      data: {
        name: a.name,
        description: a.notes ?? null,
        activityDate,
        timeDefined: a.timeDefined,
        startTime,
        status: a.status ?? 'PLANNED',
        placeId: peruPlace.id,
        organizationId: orgMap.get(a.organization)!,
        neighborhoodId: nbMap.get(a.neighborhood)!,
        createdBy: admin.id,
      },
    });
    created++;
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ Seed completado: ${created} actividades`);
  console.log('═══════════════════════════════════════════');
  console.log(`   • Eventos Churchwide:         ${churchwide.length}`);
  console.log(`   • Conferencias de barrio:     ${barrioConferencias.length}`);
  console.log(`   • Presentaciones Primaria:    ${primariaPresentaciones.length}`);
  console.log(`   • Fiestas de organizaciones:  ${fiestas.length}`);
  console.log(`   • Capacitaciones de Líderes:  ${capacitacionesLideres.length}`);
  console.log(`   • Otros eventos:              ${otrosEventos.length}`);
  console.log('═══════════════════════════════════════════');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed falló:', e);
  process.exit(1);
});