import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.companySetting.findFirst();
    if (!settings) {
      return this.prisma.companySetting.create({ data: {} });
    }
    return settings;
  }

  async update(dto: UpdateCompanySettingsDto) {
    const settings = await this.prisma.companySetting.findFirst();
    if (!settings) {
      return this.prisma.companySetting.create({ data: dto });
    }
    return this.prisma.companySetting.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
