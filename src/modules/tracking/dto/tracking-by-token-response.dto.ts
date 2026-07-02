import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TrackingDriverDto {
  @ApiPropertyOptional({ nullable: true })
  name: string | null;
}

class TrackingDonorRequestDto {
  @ApiProperty()
  donorName: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;
}

class TrackingStopDto {
  @ApiProperty()
  sequence: number;

  @ApiProperty({ enum: ['DONOR_ADDRESS', 'COLLECTION_POINT'] })
  type: string;

  @ApiProperty()
  address: string;

  @ApiPropertyOptional({ nullable: true })
  lat: number | null;

  @ApiPropertyOptional({ nullable: true })
  lng: number | null;

  @ApiPropertyOptional({ nullable: true })
  arrivedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt: Date | null;
}

class TrackingLastLocationDto {
  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;

  @ApiPropertyOptional({ nullable: true })
  speed: number | null;

  @ApiPropertyOptional({ nullable: true })
  heading: number | null;

  @ApiProperty()
  updatedAt: string;
}

export class TrackingByTokenResponseDto {
  @ApiProperty()
  routeId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  trackingToken: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty({ type: TrackingDriverDto })
  driver: TrackingDriverDto;

  @ApiProperty({ type: TrackingDonorRequestDto })
  donorRequest: TrackingDonorRequestDto;

  @ApiProperty({ type: [TrackingStopDto] })
  stops: TrackingStopDto[];

  @ApiPropertyOptional({ type: TrackingLastLocationDto, nullable: true })
  lastLocation: TrackingLastLocationDto | null;
}
