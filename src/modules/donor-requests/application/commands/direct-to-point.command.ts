export class DirectToCollectionPointCommand {
  constructor(
    public readonly requestId: string,
    public readonly collectionPointId: string,
    public readonly operatorId: string,
    public readonly notes: string | undefined,
  ) {}
}
