import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

interface Seed2027Activity {
  date: string;              // YYYY-MM-DD
  name: string;
  timeDefined: boolean;
  startTime?: string;        // HH:mm
  organization: string;
  neighborhood: string;
  notes?: string;
  status?: 'PLANNED' | 'CONFIRMED';
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
  const feriadosOrg = await prisma.organization.upsert({
    where: { name: 'Feriados Nacionales' },
    update: {},
    create: { name: 'Feriados Nacionales', description: 'Feriados oficiales del Perú', isActive: true },
  });

  const nacionalNb = await prisma.neighborhood.upsert({
    where: { name: 'Nacional' },
    update: {},
    create: { name: 'Nacional', description: 'Ámbito nacional', reference: 'Todo el territorio peruano', isActive: true },
  });

  const peruPlace = await prisma.place.upsert({
    where: { name_address: { name: 'Perú', address: 'Nacional' } },
    update: {},
    create: { name: 'Perú', address: 'Nacional', description: 'Feriados aplicables a todo el país', isActive: true },
  });

  // ─────────────────────────────────────────
  // 3. Feriados 2027 (13)
  // ─────────────────────────────────────────
  const holidays = [
    { date: '2027-01-01', name: 'Año Nuevo' },
    { date: '2027-03-25', name: 'Jueves Santo' },
    { date: '2027-03-26', name: 'Viernes Santo' },
    { date: '2027-03-28', name: 'Domingo de Resurrección' },
    { date: '2027-05-01', name: 'Día del Trabajador' },
    { date: '2027-06-29', name: 'Festividad de San Pedro y San Pablo' },
    { date: '2027-07-28', name: 'Fiestas Patrias - Proclamación de la Independencia' },
    { date: '2027-07-29', name: 'Fiestas Patrias' },
    { date: '2027-08-30', name: 'Festividad de Santa Rosa de Lima' },
    { date: '2027-10-08', name: 'Celebración de la Batalla de Angamos' },
    { date: '2027-11-01', name: 'Día de Todos los Santos' },
    { date: '2027-12-08', name: 'Día de la Inmaculada Concepción' },
    { date: '2027-12-25', name: 'Navidad' },
  ];

  let holidayCreated = 0;
  for (const h of holidays) {
    const activityDate = new Date(`${h.date}T00:00:00.000Z`);
    const exists = await prisma.activity.findFirst({
      where: { name: h.name, activityDate, organizationId: feriadosOrg.id, deletedAt: null },
    });
    if (exists) continue;
    await prisma.activity.create({
      data: {
        name: h.name,
        description: 'Feriado nacional',
        activityDate,
        timeDefined: false,
        startTime: null,
        status: 'CONFIRMED',
        placeId: peruPlace.id,
        organizationId: feriadosOrg.id,
        neighborhoodId: nacionalNb.id,
        createdBy: admin.id,
      },
    });
    holidayCreated++;
  }
  console.log(`✅ Feriados: ${holidayCreated} creados (${holidays.length - holidayCreated} ya existían)`);

  // ─────────────────────────────────────────
  // 4. Actividades adaptadas de 2026 → 2027
  // ─────────────────────────────────────────
  const activities2027: Seed2027Activity[] = [
    // ═══════════ ENERO ═══════════
    { date: '2027-01-01', name: 'Presentación de Calendario de Actividades', timeDefined: true, startTime: '19:00', organization: 'Church of Jesus Christ', neighborhood: 'Estaca' },
    { date: '2027-01-03', name: 'Capacitación de líderes de estaca', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-01-15', name: 'Festival deportivo JAS', timeDefined: false, organization: 'JAS', neighborhood: 'Estaca' },
    { date: '2027-01-16', name: 'Festival deportivo JAS', timeDefined: false, organization: 'JAS', neighborhood: 'Estaca' },
    { date: '2027-01-18', name: 'Inicio de Capacitación para Maestros y Supervisores SeI', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Los maestros SeI recibirán fechas y medios por los que se realizará' },
    { date: '2027-01-22', name: 'Transmisión Anual SeI', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca', notes: 'Participan Maestros y Supervisores SeI' },
    { date: '2027-01-25', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-01-26', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-01-27', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-01-28', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-01-29', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-01-30', name: 'FSY', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Church of Jesus Christ' },

    // ═══════════ FEBRERO ═══════════
    { date: '2027-02-01', name: 'Mes para el aspecto Físico', timeDefined: false, organization: 'HHMMJJ', neighborhood: 'Cada Barrio', notes: 'Fecha y hora determinadas por cada Barrio' },
    { date: '2027-02-07', name: 'Graduación SeI', timeDefined: true, startTime: '17:15', organization: 'SEI', neighborhood: 'Estaca', notes: 'Participan alumnos graduados y miembros de la Estaca' },
    { date: '2027-02-13', name: 'Desayuno Buffet Apertura Seminarios', timeDefined: true, startTime: '06:15', organization: 'SEI', neighborhood: 'Estaca', notes: 'El SeI con la ayuda de los Barrios organiza el desayuno anual' },
    { date: '2027-02-14', name: 'Actividad Bienestar de Autosuficiencia', timeDefined: false, organization: 'Autosuficiencia', neighborhood: 'Estaca' },
    { date: '2027-02-15', name: 'Apertura de Seminarios e Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Cada Estaca y Barrio planifica la apertura SeI' },
    { date: '2027-02-19', name: 'Caravana al Templo', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Estaca' },
    { date: '2027-02-20', name: 'Caravana al Templo', timeDefined: false, organization: 'Jóvenes', neighborhood: 'Estaca' },
    { date: '2027-02-25', name: 'Festival Deportivo', timeDefined: true, startTime: '17:00', organization: 'HHMMJJ', neighborhood: 'Estaca' },
    { date: '2027-02-26', name: 'Festival Deportivo', timeDefined: true, startTime: '17:00', organization: 'HHMMJJ', neighborhood: 'Estaca' },

    // ═══════════ MARZO ═══════════
    { date: '2027-03-04', name: 'Instrucción de liderazgo en historia familiar y del templo', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-03-05', name: 'Tecnología de raíces', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-03-06', name: 'Tecnología de raíces', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'RootsTech.org' },
    { date: '2027-03-06', name: 'Día del descubrimiento familiar', timeDefined: true, startTime: '13:30', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-03-07', name: 'Devocional de la Sociedad Mundial de Socorro', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-03-09', name: 'Cuidado de los necesitados: Informe anual', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-03-13', name: 'Torneo Lamanita', timeDefined: true, startTime: '17:00', organization: 'Primaria', neighborhood: 'Estaca' },
    { date: '2027-03-13', name: 'Brigada Misional', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'SeI apoya con lecciones y taller' },
    { date: '2027-03-14', name: 'Conferencia de Barrio Manco Capac', timeDefined: true, startTime: '10:30', organization: 'Estaca', neighborhood: 'Manco Capac' },
    { date: '2027-03-21', name: 'Domingo de Ramos', timeDefined: false, status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Las reuniones sacramentales deben centrarse en la Expiación y Resurrección' },
    { date: '2027-03-21', name: 'Semana Santa', timeDefined: false, status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-03-27', name: 'Fiesta de Primaria', timeDefined: false, organization: 'Primaria', neighborhood: 'Estaca' },

    // ═══════════ ABRIL ═══════════
    { date: '2027-04-03', name: 'Conferencia General', timeDefined: true, startTime: '10:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Sesiones: 10:00, 14:00 y 18:00' },
    { date: '2027-04-04', name: 'Conferencia General', timeDefined: true, startTime: '10:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Sesiones: 10:00 y 14:00' },
    { date: '2027-04-11', name: 'Capacitación de Líderes de Estaca', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-04-17', name: 'Mini CCM (Aspecto Social)', timeDefined: true, startTime: '09:00', organization: 'HHMMJJ', neighborhood: 'Estaca' },
    { date: '2027-04-18', name: 'Camina conmigo - Discusión mundial para jóvenes', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-04-18', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '18:00', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-04-18', name: 'Presentación de Primaria Manco Capac', timeDefined: true, startTime: '10:30', organization: 'Primaria', neighborhood: 'Manco Capac' },

    // ═══════════ MAYO ═══════════
    { date: '2027-05-01', name: 'Mes para el aspecto Espiritual', timeDefined: false, organization: 'HHMMJJ', neighborhood: 'Cada Barrio', notes: 'Fecha y hora determinadas por cada Barrio' },
    { date: '2027-05-02', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '18:00', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-05-02', name: 'Capacitación de Sacerdocio Aarónico', timeDefined: true, startTime: '16:00', organization: 'HHJJ', neighborhood: 'Estaca' },
    { date: '2027-05-08', name: 'Capacitación de Sacerdocio Aarónico', timeDefined: true, startTime: '16:00', organization: 'HHJJ', neighborhood: 'Estaca', notes: 'Futuros Élderes' },
    { date: '2027-05-08', name: 'Dominio de la Doctrina', timeDefined: true, startTime: '15:30', organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-05-15', name: 'Conferencia de Estaca', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca', notes: 'Sesión de líderes' },
    { date: '2027-05-16', name: 'Conferencia de Estaca', timeDefined: true, startTime: '10:00', organization: 'Estaca', neighborhood: 'Estaca', notes: 'Sesión General' },
    { date: '2027-05-22', name: 'Fin de I Periodo Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-05-23', name: 'Vídeo para niños', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-05-23', name: 'Actividad Bienestar de Autosuficiencia', timeDefined: false, organization: 'Autosuficiencia', neighborhood: 'Estaca' },
    { date: '2027-05-25', name: 'Festival Vóley Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Festival deportivo a nivel Barrios y Estacas' },
    { date: '2027-05-30', name: 'Presentación de Primaria El Mirador', timeDefined: true, startTime: '09:30', organization: 'Primaria', neighborhood: 'El Mirador' },

    // ═══════════ JUNIO ═══════════
    { date: '2027-06-10', name: 'Conferencia de Educadores Religiosos', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-06-11', name: 'Conferencia de Educadores Religiosos', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'EVENTO DE TRANSMISIÓN' },
    { date: '2027-06-13', name: 'Conferencia de Barrio Tupac Yupanqui', timeDefined: true, startTime: '09:30', organization: 'Estaca', neighborhood: 'Tupac Yupanqui' },
    { date: '2027-06-14', name: 'Apertura II Periodo Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Inicio del II Periodo (14 jun - 18 sep)' },
    { date: '2027-06-18', name: 'Fiesta de Sociedad de Socorro', timeDefined: true, startTime: '19:00', organization: 'SOC SOC', neighborhood: 'Estaca' },
    { date: '2027-06-25', name: 'Fin de I Periodo Seminarios', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-06-27', name: 'Presentación de Primaria Huajsapata', timeDefined: true, startTime: '09:30', organization: 'Primaria', neighborhood: 'Huajsapata' },

    // ═══════════ JULIO ═══════════
    { date: '2027-07-04', name: 'Capacitación de Líderes de Estaca', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-07-11', name: 'Conferencia de Barrio Mirador', timeDefined: true, startTime: '09:00', organization: 'Estaca', neighborhood: 'El Mirador' },
    { date: '2027-07-16', name: 'Actividad deportiva SOC SOC y QQEE', timeDefined: false, organization: 'Adultos Casados', neighborhood: 'Estaca' },
    { date: '2027-07-17', name: 'Actividad deportiva SOC SOC y QQEE', timeDefined: false, organization: 'Adultos Casados', neighborhood: 'Estaca' },
    { date: '2027-07-22', name: 'Festival de danzas', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca' },

    // ═══════════ AGOSTO ═══════════
    { date: '2027-08-01', name: 'Mes para el aspecto Social', timeDefined: false, organization: 'HHMMJJ', neighborhood: 'Cada Barrio' },
    { date: '2027-08-01', name: 'Desayuno Buffet Apertura Seminarios', timeDefined: true, startTime: '06:15', organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-08-02', name: 'Apertura II Periodo Seminarios', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Inicio del II Periodo (2 ago - 27 nov)' },
    { date: '2027-08-05', name: 'Exposición de trabajos SOC SOC', timeDefined: false, organization: 'SOC SOC', neighborhood: 'Estaca' },
    { date: '2027-08-08', name: 'Presentación Primaria Llavini', timeDefined: true, startTime: '10:30', organization: 'Primaria', neighborhood: 'Llavini' },
    { date: '2027-08-08', name: 'Conferencia de Barrio Huascar', timeDefined: true, startTime: '09:00', organization: 'Barrio', neighborhood: 'Huascar' },
    { date: '2027-08-15', name: 'Conferencia de Barrio Huajsapata', timeDefined: true, startTime: '09:00', organization: 'Barrio', neighborhood: 'Huajsapata' },
    { date: '2027-08-15', name: 'Actividad Bienestar de Autosuficiencia', timeDefined: false, organization: 'Autosuficiencia', neighborhood: 'Estaca' },
    { date: '2027-08-29', name: 'Festival Devocional musical Walk with Me', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },

    // ═══════════ SEPTIEMBRE ═══════════
    { date: '2027-09-12', name: 'Presentación de Primaria Tupac Yupanqui', timeDefined: true, startTime: '09:00', organization: 'Primaria', neighborhood: 'Tupac Yupanqui' },
    { date: '2027-09-13', name: 'Vídeo para niños', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ' },
    { date: '2027-09-18', name: 'Fin de II Periodo Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-09-19', name: 'Devocional de misioneros retornados', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-09-24', name: 'Fiesta de la Juventud', timeDefined: true, startTime: '19:00', organization: 'HHMMJJ', neighborhood: 'Estaca' },

    // ═══════════ OCTUBRE ═══════════
    { date: '2027-10-02', name: 'Conferencia General', timeDefined: true, startTime: '10:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Sesiones: 10:00, 14:00, 18:00' },
    { date: '2027-10-03', name: 'Conferencia General', timeDefined: true, startTime: '10:00', status: 'CONFIRMED', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Sesiones: 10:00 y 14:00' },
    { date: '2027-10-10', name: 'Capacitación de Líderes de Estaca', timeDefined: true, startTime: '17:00', organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-10-11', name: 'Apertura III Periodo Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca', notes: 'Inicio del III Periodo (11 oct - 27 nov)' },
    { date: '2027-10-15', name: 'Fiesta de Rosa y Clavel', timeDefined: true, startTime: '19:00', organization: 'JAS', neighborhood: 'Estaca' },
    { date: '2027-10-23', name: 'Feria SeI', timeDefined: true, startTime: '15:30', organization: 'SEI', neighborhood: 'Estaca' },
    { date: '2027-10-30', name: 'Conferencia de Estaca (Día 1)', timeDefined: true, startTime: '16:00', organization: 'Estaca', neighborhood: 'Estaca', notes: 'Sesión de líderes 16:00, adultos 18:00' },
    { date: '2027-10-31', name: 'Conferencia de Estaca (Día 2)', timeDefined: true, startTime: '10:00', organization: 'Estaca', neighborhood: 'Estaca', notes: 'Sesión General' },
    { date: '2027-10-31', name: 'Devocional mundial para adultos jóvenes', timeDefined: true, startTime: '18:00', organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Adultos jóvenes de 18-35 años' },

    // ═══════════ NOVIEMBRE ═══════════
    { date: '2027-11-01', name: 'Mes para el aspecto Intelectual', timeDefined: false, organization: 'HHMMJJ', neighborhood: 'Cada Barrio' },
    { date: '2027-11-05', name: 'Devocional navideño de la Primera Presidencia', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Todos los miembros y amigos' },
    { date: '2027-11-14', name: 'Actividad Bienestar de Autosuficiencia', timeDefined: false, organization: 'Autosuficiencia', neighborhood: 'Estaca' },
    { date: '2027-11-21', name: 'Presentación de Primaria Huascar', timeDefined: true, startTime: '09:00', organization: 'Primaria', neighborhood: 'Huascar' },
    { date: '2027-11-21', name: 'Conferencia de Barrio Llavini', timeDefined: true, startTime: '10:30', organization: 'Barrio', neighborhood: 'Llavini' },
    { date: '2027-11-27', name: 'Fin de Periodo Seminarios e Institutos', timeDefined: false, organization: 'SEI', neighborhood: 'Estaca' },

    // ═══════════ DICIEMBRE ═══════════
    { date: '2027-12-19', name: 'Sólo reunión sacramental', timeDefined: false, organization: 'Church of Jesus Christ', neighborhood: 'Church of Jesus Christ', notes: 'Enfocada al nacimiento del Salvador' },
    { date: '2027-12-19', name: 'Concierto Navideño', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-12-26', name: 'Presentación de calendario para el 2028', timeDefined: false, organization: 'Estaca', neighborhood: 'Estaca' },
    { date: '2027-12-31', name: 'Fiesta por Año Nuevo', timeDefined: true, startTime: '19:00', organization: 'Estaca', neighborhood: 'Estaca', notes: 'Todos los miembros y amigos de la Iglesia' },
  ];

  // Asegurar catálogos referenciados
  const orgsNeeded = [...new Set(activities2027.map((a) => a.organization))];
  const nbsNeeded = [...new Set(activities2027.map((a) => a.neighborhood))];

  const orgMap = new Map<string, string>();
  for (const name of orgsNeeded) {
    const org = await prisma.organization.upsert({
      where: { name },
      update: {},
      create: { name, description: `Organización: ${name}`, isActive: true },
    });
    orgMap.set(name, org.id);
  }

  const nbMap = new Map<string, string>();
  for (const name of nbsNeeded) {
    const nb = await prisma.neighborhood.upsert({
      where: { name },
      update: {},
      create: { name, description: `Barrio: ${name}`, isActive: true },
    });
    nbMap.set(name, nb.id);
  }

  // ─────────────────────────────────────────
  // 5. Insertar actividades (idempotente)
  // ─────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const a of activities2027) {
    const activityDate = new Date(`${a.date}T00:00:00.000Z`);
    const orgId = orgMap.get(a.organization)!;
    const nbId = nbMap.get(a.neighborhood)!;

    const exists = await prisma.activity.findFirst({
      where: { name: a.name, activityDate, organizationId: orgId, deletedAt: null },
    });
    if (exists) {
      skipped++;
      continue;
    }

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
        organizationId: orgId,
        neighborhoodId: nbId,
        createdBy: admin.id,
      },
    });
    created++;
  }

  console.log(`✅ Actividades 2027: ${created} creadas, ${skipped} ya existían`);
  console.log(`📊 Total en calendario: 13 feriados + ${activities2027.length} actividades`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Seed falló:', e);
  process.exit(1);
});