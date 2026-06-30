export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class GeofenceViolationError extends DomainError {
  constructor(currentDistance: number, requiredRadius: number) {
    super(
      'GEOFENCE_VIOLATION',
      `Você está a ${Math.round(currentDistance)}m do ponto de coleta. Aproxime-se para confirmar a entrega.`,
      { currentDistance: Math.round(currentDistance), requiredRadius },
    );
  }
}

export class WeightRequiredError extends DomainError {
  constructor() {
    super('WEIGHT_REQUIRED', 'Declaração não pode ser gerada sem peso real confirmado.');
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      'INVALID_STATUS_TRANSITION',
      `Transição de status inválida: ${from} → ${to}`,
      { from, to },
    );
  }
}

export class TenantAccessDeniedError extends DomainError {
  constructor() {
    super('TENANT_ACCESS_DENIED', 'Acesso negado. Você não tem permissão para acessar estes dados.');
  }
}

export class TrackingTokenExpiredError extends DomainError {
  constructor() {
    super('TRACKING_TOKEN_EXPIRED', 'Link de acompanhamento expirado ou inválido.');
  }
}

export class DriverNotAssignedError extends DomainError {
  constructor() {
    super('DRIVER_NOT_ASSIGNED', 'Motorista não atribuído à rota.');
  }
}

export class RouteAlreadyActiveError extends DomainError {
  constructor() {
    super('ROUTE_ALREADY_ACTIVE', 'Motorista já possui uma rota ativa.');
  }
}

export class DeclarationNotApplicableError extends DomainError {
  constructor() {
    super(
      'DECLARATION_NOT_APPLICABLE',
      'Declaração não se aplica a solicitações encaminhadas diretamente ao ponto de coleta.',
    );
  }
}
