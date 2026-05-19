import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ProjectsModule } from '@/projects/projects.module';
import { BillsModule } from '@/bills/bills.module';
import { UploadModule } from '@/upload/upload.module';

@Module({
  imports: [ProjectsModule, BillsModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
