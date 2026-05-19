import { Controller, Post, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Storage } from 'coze-coding-dev-sdk';
import { Response } from 'express';
import * as fs from 'fs';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    try {
      console.log('[Upload] file info:', file?.originalname, file?.mimetype, file?.size, file?.path);

      // Support both file.buffer (H5) and file.path (mini-program)
      let fileContent: Buffer;
      if (file.buffer && file.buffer.length > 0) {
        fileContent = file.buffer;
      } else if (file.path) {
        fileContent = fs.readFileSync(file.path);
      } else {
        return res.status(400).json({ code: 400, msg: '文件内容为空' });
      }

      const fileName = `covers/${Date.now()}_${file.originalname || 'image.jpg'}`;
      const contentType = file.mimetype || 'image/jpeg';

      const key = await storage.uploadFile({
        fileContent,
        fileName,
        contentType,
      });
      console.log('[Upload] stored key:', key);

      const url = await storage.generatePresignedUrl({ key, expireTime: 86400 * 365 });
      console.log('[Upload] presigned url generated');

      return res.status(200).json({ code: 200, msg: 'success', data: { key, url } });
    } catch (e) {
      console.error('[Upload] error:', e);
      return res.status(500).json({ code: 500, msg: '上传失败' });
    }
  }
}
