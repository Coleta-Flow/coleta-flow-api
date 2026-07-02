export class CancelDonorRequestCommand {
  constructor(
    public readonly requestId: string,
    public readonly reason?: string,
  ) {}
}
