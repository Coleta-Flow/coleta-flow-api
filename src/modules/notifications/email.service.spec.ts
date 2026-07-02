import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: (...args: any) => mockCreateTransport(...args),
}));

describe('EmailService', () => {
  let service: EmailService;
  let config: Record<string, any>;

  const createService = async (configValues: Record<string, any>) => {
    config = { get: jest.fn((key: string, defaultValue?: any) => configValues[key] ?? defaultValue) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    return module.get<EmailService>(EmailService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not send email when SMTP is not configured', async () => {
    service = await createService({ SMTP_HOST: '' });

    await service.send({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should create transporter and send email when SMTP is configured', async () => {
    service = await createService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 587,
      SMTP_SECURE: 'false',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    });

    await service.send({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Body text',
    });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Body text',
      }),
    );
  });

  it('should send email with HTML content', async () => {
    service = await createService({
      SMTP_HOST: 'smtp.example.com',
    });

    await service.send({
      to: 'user@example.com',
      subject: 'HTML Test',
      html: '<h1>Hello</h1>',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ html: '<h1>Hello</h1>' }),
    );
  });

  it('should send email with attachments', async () => {
    service = await createService({
      SMTP_HOST: 'smtp.example.com',
    });

    const pdfBuffer = Buffer.from('fake-pdf');

    await service.send({
      to: 'donor@example.com',
      subject: 'Declaration',
      text: 'Here is your declaration.',
      attachments: [{ filename: 'declaration.pdf', content: pdfBuffer }],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: 'declaration.pdf', content: pdfBuffer }),
        ]),
      }),
    );
  });

  it('should use default FROM address when SMTP_FROM is not set', async () => {
    service = await createService({
      SMTP_HOST: 'smtp.example.com',
    });

    await service.send({ to: 'test@example.com', subject: 'Test', text: 'Hello' });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@coletaflow.com' }),
    );
  });
});
