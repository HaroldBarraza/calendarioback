import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PLANNING_YEAR } from '../config/configuration.js';
import { ActivityStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

// ─── pdfmake: carga CommonJS desde ESM ────────────────────

interface PdfKitDoc {
  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  end(): void;
}

interface PdfPrinterLike {
  createPdfKitDocument(docDefinition: unknown, options?: unknown): PdfKitDoc;
}
const require = createRequire(import.meta.url);

const PdfPrinter = require('pdfmake') as new (
  fonts: Record<string, unknown>,
) => PdfPrinterLike;

type PdfPrinterInstance = PdfPrinterLike;
// ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ActivityStatus, string> = {
  PLANNED: 'Planificada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly printer: PdfPrinterInstance;

  constructor(private readonly prisma: PrismaService) {
    const fontsDir = path.resolve(process.cwd(), 'fonts');
    this.printer = new PdfPrinter({
      Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
      },
    });
  }

  async generateActivitiesPdf(query: ReportQueryDto): Promise<Buffer> {
    const activities = await this.fetchActivities(query);
    const filtersLabel = await this.describeFilters(query);
    const now = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
    });

    const body: string[][] = [
      [
        'Fecha',
        'Hora',
        'Actividad',
        'Organización',
        'Barrio',
        'Lugar',
        'Estado',
      ],
      ...activities.map((a) => [
        a.activityDate.toISOString().slice(0, 10),
        a.timeDefined && a.startTime
          ? a.startTime.toISOString().slice(11, 16)
          : '—',
        a.name,
        a.organization.name,
        a.neighborhood.name,
        a.place.name,
        STATUS_LABEL[a.status],
      ]),
    ];

    const statusCounts: Record<ActivityStatus, number> = {
      PLANNED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const a of activities) statusCounts[a.status]++;

    const docDefinition = {
      pageOrientation: 'landscape',
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      content: [
        { text: `Sistema de Planificación ${PLANNING_YEAR}`, style: 'header' },
        { text: 'Reporte de Actividades', style: 'subheader' },
        { text: `Generado: ${now}`, style: 'meta' },
        { text: `Filtros: ${filtersLabel}`, style: 'meta' },
        { text: `Total: ${activities.length} actividad(es)`, style: 'meta' },
        { text: '', margin: [0, 8] },
        activities.length === 0
          ? {
              text: 'Sin actividades para los filtros aplicados.',
              italics: true,
            }
          : {
              table: {
                headerRows: 1,
                widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body,
              },
              layout: 'lightHorizontalLines',
            },
        {
          text: 'Resumen por estado',
          style: 'subheader',
          margin: [0, 16, 0, 4],
        },
        {
          ul: (Object.keys(statusCounts) as ActivityStatus[]).map(
            (s) => `${STATUS_LABEL[s]}: ${statusCounts[s]}`,
          ),
        },
        {
          text: `Con horario definido: ${activities.filter((a) => a.timeDefined).length}  |  Sin horario: ${
            activities.filter((a) => !a.timeDefined).length
          }`,
          style: 'meta',
          margin: [0, 8],
        },
      ],
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
        subheader: { fontSize: 12, bold: true, margin: [0, 6, 0, 4] },
        meta: { fontSize: 9, color: '#555555' },
      },
    };

    return this.render(docDefinition);
  }

  // ─────────────────────── helpers ───────────────────────

  private fetchActivities(query: ReportQueryDto) {
    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.neighborhoodId ? { neighborhoodId: query.neighborhoodId } : {}),
      ...(query.placeId ? { placeId: query.placeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            activityDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.activity.findMany({
      where,
      include: {
        organization: { select: { name: true } },
        neighborhood: { select: { name: true } },
        place: { select: { name: true } },
      },
      orderBy: [{ activityDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async describeFilters(query: ReportQueryDto): Promise<string> {
    const parts: string[] = [];
    if (query.dateFrom || query.dateTo) {
      parts.push(
        `Fechas: ${query.dateFrom ?? 'inicio'} → ${query.dateTo ?? 'fin'}`,
      );
    }
    if (query.status) parts.push(`Estado: ${STATUS_LABEL[query.status]}`);
    if (query.organizationId) {
      const o = await this.prisma.organization.findUnique({
        where: { id: query.organizationId },
        select: { name: true },
      });
      parts.push(`Organización: ${o?.name ?? query.organizationId}`);
    }
    if (query.neighborhoodId) {
      const n = await this.prisma.neighborhood.findUnique({
        where: { id: query.neighborhoodId },
        select: { name: true },
      });
      parts.push(`Barrio: ${n?.name ?? query.neighborhoodId}`);
    }
    if (query.placeId) {
      const p = await this.prisma.place.findUnique({
        where: { id: query.placeId },
        select: { name: true },
      });
      parts.push(`Lugar: ${p?.name ?? query.placeId}`);
    }
    return parts.length
      ? parts.join('  |  ')
      : 'Ninguno (todas las actividades)';
  }

  private render(docDefinition: unknown): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      } catch (err) {
        this.logger.error('Error generando PDF', err as Error);
        reject(err);
      }
    });
  }
}
