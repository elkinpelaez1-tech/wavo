import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './workers/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('⚙️  Wavo Worker running');
  await app.init();
}
bootstrap();
