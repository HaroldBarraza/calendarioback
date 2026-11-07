import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Seguridad base y cookies
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  // 2. CORS para el frontend
  app.enableCors({
    origin: configService.get<string[]>('corsOrigin'),
    credentials: true,
  });


  // 4. Pipes globales (una sola vez)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. Filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // 6. Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sistema de Planificación 2027')
    .setDescription('API para la gestión de actividades del año 2027')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación y sesiones')
    .addTag('users', 'Gestión de usuarios')
    .addTag('health', 'Estado del servicio')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // 3. Configura Swagger CON la opción useGlobalPrefix: true
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });

  // 7. Escuchar
  const port = configService.get<number>('port') ?? 3001;
  await app.listen(port);
  Logger.log(`API escuchando en http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger UI en http://localhost:${port}/api/docs`, 'Bootstrap');
  console.log(`API escuchando en http://localhost:${port}/api`, 'Bootstrap');
  console.log(`Swagger UI en http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
