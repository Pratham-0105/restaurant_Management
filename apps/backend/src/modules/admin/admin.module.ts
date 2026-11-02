import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'd01719e7d79d33d6dcfb1da71648be74ba9548a676b2126c8befa796a1c85bcb',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
