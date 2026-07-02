import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER', ''),
          pass: this.config.get<string>('SMTP_PASS', ''),
        },
      });
    }
  }

  async send(data: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; content: Buffer }[];
  }) {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured — email not sent');
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'noreply@ecologi.com.br'),
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html,
      attachments: data.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    this.logger.log(`Email sent to ${data.to}: ${data.subject}`);
  }
}
