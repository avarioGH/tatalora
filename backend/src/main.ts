import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. HTTP Security Headers (Anti XSS, Clickjacking, MIME Sniffing)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 2. Strict Auth Brute-Force Protection (Login, Register, Forgot/Reset Password)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      message: 'Terlalu banyak percobaan autentikasi dari IP ini. Silakan coba lagi setelah 15 menit.',
    },
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);
  app.use('/auth/forgot-password', authLimiter);
  app.use('/auth/reset-password', authLimiter);

  // 3. Global Rate Limiting (Anti DDoS)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Terlalu banyak request dari IP ini, silakan coba lagi setelah 15 menit.',
      },
    }),
  );

  // 4. Hardened CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
        'https://tatalora.com',
        'https://www.tatalora.com',
        'https://app.tatalora.com',
        'https://admin.tatalora.com',
        'https://api.tatalora.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.tatalora.com')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 5. Global Input Validation & Sanitization Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
