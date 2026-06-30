export class GenerateDeclarationCommand {
  constructor(
    public readonly donorRequestId: string,
    public readonly requestedByUserId: string,
  ) {}
}
