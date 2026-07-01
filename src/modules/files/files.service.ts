import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    entityType: string,
    entityId?: string,
  ) {
    const storageType = this.config.get<string>('STORAGE_TYPE', 'local');
    let url: string;

    if (storageType === 's3') {
      url = await this.uploadToS3(file);
    } else {
      url = await this.saveLocally(file);
    }

    return this.prisma.fileAsset.create({
      data: {
        entityType,
        entityId: entityId ?? '',
        url,
        filename: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  private async saveLocally(file: Express.Multer.File): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const dest = path.join(uploadDir, uniqueName);
    fs.writeFileSync(dest, file.buffer);

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return `${appUrl}/uploads/${uniqueName}`;
  }

  private async uploadToS3(file: Express.Multer.File): Promise<string> {
    // Dynamic import to avoid hard dependency when STORAGE_TYPE=local
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const bucket = this.config.get<string>('AWS_S3_BUCKET', '');
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    const client = new S3Client({ region });

    const key = `uploads/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
