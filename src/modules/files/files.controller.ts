import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.DRIVER, UserRole.COLLECTION_POINT_OPERATOR)
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file (authenticated)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
    },
  })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiResponse({ status: 201, description: 'File uploaded, returns the FileAsset with public URL' })
  @ApiResponse({ status: 400, description: 'Invalid file type or file too large' })
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /^(image\/(jpeg|png|webp)|application\/pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('entityType') entityType = 'generic',
    @Query('entityId') entityId?: string,
  ) {
    return this.filesService.uploadFile(file, entityType, entityId);
  }

  @Post('upload/public')
  @Public()
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a photo for a public donor request (no login required)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityId: { type: 'string', description: 'donor_request id' },
      },
    },
  })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiResponse({ status: 201, description: 'File uploaded, returns the FileAsset with public URL' })
  @ApiResponse({ status: 400, description: 'Invalid file type or file too large' })
  uploadPublic(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('entityId') entityId?: string,
  ) {
    return this.filesService.uploadFile(file, 'donor_request', entityId);
  }
}
