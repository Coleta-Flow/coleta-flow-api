import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn().mockResolvedValue({ token: 'fake-refresh-token' }),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('fake-jwt-token'),
};

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-pass'),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return token and user for valid credentials', async () => {
      const user = {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@email.com',
        password: 'hashed-pass',
        role: UserRole.OPERATOR,
        roleId: 'role-op',
        active: true,
        deletedAt: null,
      };

      mockPrisma.user.findFirst.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'admin@email.com', password: 'correct' });

      expect(result.accessToken).toBe('fake-jwt-token');
      expect(result.refreshToken).toBe('fake-refresh-token');
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        roleId: 'role-op',
      });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', password: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@email.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@email.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a DONOR user and return token', async () => {
      const createdUser = {
        id: 'user-2',
        name: 'Novo Doador',
        email: 'donor@email.com',
        role: UserRole.DONOR,
        roleId: 'role-donor',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-donor', name: UserRole.DONOR });
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        name: 'Novo Doador',
        email: 'donor@email.com',
        password: 'secure123',
        phone: '(85) 99999-0000',
      });

      expect(result.accessToken).toBe('fake-jwt-token');
      expect(result.refreshToken).toBe('fake-refresh-token');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Novo Doador',
            email: 'donor@email.com',
            role: UserRole.DONOR,
            roleId: 'role-donor',
            phone: '(85) 99999-0000',
          }),
        }),
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'Dup',
          email: 'existing@email.com',
          password: '123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('socialLogin', () => {
    it('should return token for existing user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Social User',
        email: 'social@email.com',
        role: UserRole.DONOR,
        roleId: 'role-donor',
        active: true,
        deletedAt: null,
      });

      const result = await service.socialLogin('google', {
        token: 'google-token',
        email: 'social@email.com',
      });

      expect(result.accessToken).toBe('fake-jwt-token');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user when not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-donor', name: UserRole.DONOR });
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        name: 'newuser',
        email: 'new@email.com',
        role: UserRole.DONOR,
        roleId: 'role-donor',
        active: true,
      });

      const result = await service.socialLogin('facebook', {
        token: 'fb-token',
        email: 'new@email.com',
        name: 'New User',
      });

      expect(result.accessToken).toBe('fake-jwt-token');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'inactive@email.com',
        active: false,
        deletedAt: null,
      });

      await expect(
        service.socialLogin('google', {
          token: 'token',
          email: 'inactive@email.com',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      await expect(
        service.socialLogin('google', { token: 'token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
