import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  fileAsset: {
    create: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn(),
};

jest.mock('fs');
import * as fs from 'fs';

const mockS3Send = jest.fn();
const mockS3ClientCtor = jest.fn().mockImplementation(() => ({ send: mockS3Send }));
const mockPutObjectCommandCtor = jest.fn().mockImplementation((input) => ({ input }));

jest.mock(
  '@aws-sdk/client-s3',
  () => ({
    S3Client: mockS3ClientCtor,
    PutObjectCommand: mockPutObjectCommandCtor,
  }),
  { virtual: true },
);

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    jest.clearAllMocks();
  });

  const file = {
    originalname: 'foto teste.png',
    buffer: Buffer.from('fake-content'),
    size: 1234,
    mimetype: 'image/png',
  } as Express.Multer.File;

  describe('uploadFile', () => {
    it('stores the file locally when STORAGE_TYPE is local (default)', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_TYPE') return 'local';
        if (key === 'APP_URL') return 'http://localhost:3000';
        return defaultValue;
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const createdAsset = { id: 'f1', url: 'http://localhost:3000/uploads/foo.png' };
      mockPrisma.fileAsset.create.mockResolvedValue(createdAsset);

      const result = await service.uploadFile(file, 'DonorRequest', 'dr1');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(mockPrisma.fileAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'DonorRequest',
          entityId: 'dr1',
          url: expect.stringContaining('http://localhost:3000/uploads/'),
          filename: 'foto teste.png',
          sizeBytes: 1234,
          mimeType: 'image/png',
        }),
      });
      expect(result).toEqual(createdAsset);
    });

    it('creates the upload directory when it does not exist yet', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: unknown) => defaultValue);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockPrisma.fileAsset.create.mockResolvedValue({ id: 'f1' });

      await service.uploadFile(file, 'DonorRequest');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('defaults entityId to an empty string when not provided', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: unknown) => defaultValue);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockPrisma.fileAsset.create.mockResolvedValue({ id: 'f1' });

      await service.uploadFile(file, 'DonorRequest');

      expect(mockPrisma.fileAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ entityId: '' }),
      });
    });

    it('uploads to S3 when STORAGE_TYPE is s3', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'STORAGE_TYPE') return 's3';
        if (key === 'AWS_S3_BUCKET') return 'my-bucket';
        if (key === 'AWS_REGION') return 'us-east-1';
        return defaultValue;
      });
      mockS3Send.mockResolvedValue({});
      const createdAsset = { id: 'f2' };
      mockPrisma.fileAsset.create.mockResolvedValue(createdAsset);

      const result = await service.uploadFile(file, 'DonorRequest', 'dr1');

      expect(mockS3ClientCtor).toHaveBeenCalledWith({ region: 'us-east-1' });
      expect(mockPutObjectCommandCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'my-bucket',
          ContentType: 'image/png',
        }),
      );
      expect(mockS3Send).toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(mockPrisma.fileAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: expect.stringContaining('https://my-bucket.s3.us-east-1.amazonaws.com/uploads/'),
        }),
      });
      expect(result).toEqual(createdAsset);
    });
  });
});
