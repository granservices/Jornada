import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SispatEmployeesCsvService } from './services/sispat-employees-csv.service';

type RequestWithRawBody = Request & {
  body?: unknown;
};

type UploadedCsvFile = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
};

@Controller('integrations/sispat')
export class SispatController {
  constructor(
    private readonly sispatEmployeesCsvService: SispatEmployeesCsvService,
  ) {}

  @Post('employees-csv')
  @HttpCode(202)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async receiveEmployeesFile(
    @UploadedFile()
    file: UploadedCsvFile | undefined,
    @Req()
    request: RequestWithRawBody,
  ) {
    const contentTypeHeader = request.headers['content-type'];
    const contentType = Array.isArray(contentTypeHeader)
      ? contentTypeHeader[0] ?? null
      : contentTypeHeader ?? null;

    if (file) {
      const persisted = await this.sispatEmployeesCsvService.persistIncomingFile({
        fileBuffer: file.buffer,
        originalFilename: file.originalname ?? null,
        contentType: file.mimetype ?? contentType,
        source: 'multipart',
      });

      return {
        ok: true,
        message: 'SISPAT employees file received successfully.',
        source: 'multipart',
        ...persisted,
      };
    }

    if (Buffer.isBuffer(request.body)) {
      const persisted = await this.sispatEmployeesCsvService.persistIncomingFile({
        fileBuffer: request.body,
        originalFilename: null,
        contentType,
        source: 'raw',
      });

      return {
        ok: true,
        message: 'SISPAT employees file received successfully.',
        source: 'raw',
        ...persisted,
      };
    }

    throw new BadRequestException(
      'Envie um arquivo CSV/XLSX no campo "file" ou o conteudo bruto do arquivo no corpo da requisicao.',
    );
  }
}
