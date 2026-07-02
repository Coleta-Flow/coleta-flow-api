import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
};

const mockEmailService = {
  send: jest.fn(),
};

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed-pass'),
}));

import * as bcrypt from 'bcryptjs';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns non-deleted users ordered by name', async () => {
      const users = [{ id: 'u1', name: 'João' }];
      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(result).toEqual(users);
    });
  });

  describe('findDrivers', () => {
    it('returns drivers without availability filter by default', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findDrivers();

      const callArg = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArg.where.driver.routes).toBeUndefined();
    });

    it('filters by available drivers when availableOnly is true', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.findDrivers(true);

      const callArg = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArg.where.driver.routes).toEqual({
        none: { status: { in: expect.any(Array) } },
      });
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = { id: 'u1', name: 'João' };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await service.findById('u1');

      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      name: 'João Silva',
      email: 'joao@email.com',
      password: 'Senha@123',
      role: UserRole.OPERATOR,
    };

    it('creates the user, hashes the password and sends a welcome email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-op', name: UserRole.OPERATOR });
      const created = { id: 'u1', name: dto.name, email: dto.email };
      mockPrisma.user.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            password: 'hashed-pass',
            roleId: 'role-op',
          }),
        }),
      );
      expect(mockEmailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: dto.email }),
      );
      expect(result).toEqual(created);
    });

    it('throws ConflictException when email is already in use', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when role does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the user data', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', name: 'João' }); // findById
      const updated = { id: 'u1', name: 'João Souza' };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.update('u1', { name: 'João Souza' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { name: 'João Souza' } }),
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null); // findById

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new email is already used by another user', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: 'u1', name: 'João' }) // findById
        .mockResolvedValueOnce({ id: 'u2' }); // email check

      await expect(service.update('u1', { email: 'taken@email.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('resolves roleId when role is updated', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', name: 'João' }); // findById
      mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-admin', name: UserRole.ADMIN });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', roleId: 'role-admin' });

      await service.update('u1', { role: UserRole.ADMIN });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roleId: 'role-admin' }),
        }),
      );
    });

    it('throws NotFoundException when the new role does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', name: 'João' }); // findById
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.update('u1', { role: UserRole.ADMIN })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('changes the password for an admin without requiring current password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', password: 'old-hash' });
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      const result = await service.changePassword(
        'u1',
        { newPassword: 'NovaSenha@456' } as any,
        true,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('NovaSenha@456', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { password: 'hashed-pass' },
      });
      expect(result).toEqual({ message: 'Senha alterada com sucesso.' });
    });

    it('validates current password for non-admin users', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', password: 'old-hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });

      await service.changePassword(
        'u1',
        { currentPassword: 'old', newPassword: 'NovaSenha@456' } as any,
        false,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('old', 'old-hash');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when current password is invalid', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', password: 'old-hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(
          'u1',
          { currentPassword: 'wrong', newPassword: 'NovaSenha@456' } as any,
          false,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', { newPassword: 'NovaSenha@456' } as any, true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('deactivates the user and sets deletedAt', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1', name: 'João' }); // findById
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', active: false });

      const result = await service.deactivate('u1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { active: false, deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Usuário desativado com sucesso.' });
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('missing')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });
});
