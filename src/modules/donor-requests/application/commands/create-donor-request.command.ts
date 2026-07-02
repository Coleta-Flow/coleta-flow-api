export class CreateDonorRequestCommand {
  constructor(
    public readonly donorName: string,
    public readonly donorWhatsapp: string,
    public readonly donorEmail: string,
    public readonly password: string,
    public readonly cpfCnpj: string | undefined,
    public readonly cep: string | undefined,
    public readonly street: string,
    public readonly number: string,
    public readonly complement: string | undefined,
    public readonly neighborhood: string | undefined,
    public readonly city: string,
    public readonly state: string | undefined,
    public readonly materialTypeId: string,
    public readonly description: string,
    public readonly estimatedWeightKg: number | undefined,
    public readonly bestTimeForPickup: string,
    public readonly photoIds: string[],
  ) {}
}
