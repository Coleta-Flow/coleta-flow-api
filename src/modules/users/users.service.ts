import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
  }

  async create(data: {
    name: string; email: string; password: string; role: UserRole;
  }) {
    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: { ...data, password: hashed },
    });
  }
}
