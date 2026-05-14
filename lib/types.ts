export type CoupleType = 'Bride + Groom' | 'Bride + Bride' | 'Groom + Groom' | 'Partner + Partner';
export type CeremonyType = 'Traditional' | 'Catholic' | 'Other';
export type Plan = 'free' | 'pro';

export interface VendorCoverage {
  vendorType: string;
  companyName?: string;
  coverageStart: string;
  coverageEnd: string;
  notes?: string;
  isPrimary?: boolean;
}

export interface WeddingData {
  coupleType: CoupleType;
  person1Name: string;
  person2Name: string;
  weddingDate: string;
  ceremonyType: CeremonyType;
  dressAttire?: string;
  package?: string;

  leadPhotographer?: string;
  secondShooter?: string;
  videographer?: string;
  coordinator?: string;

  gettingReadyAddress: string;
  gettingReadyName?: string;
  gettingReadyAvailableFrom?: string;
  ceremonyAddress: string;
  ceremonyName?: string;
  receptionAddress: string;
  receptionName?: string;
  receptionHardStop?: string;
  sameVenue?: boolean;

  guestCount?: number;
  weddingPartySize?: string;

  vendorCoverages: VendorCoverage[];
  additionalNotes?: string;
}

export interface EnrichedData {
  sunsetTime?: string;
  sunsetLocation?: string;
  travelGettingReadyToCeremony?: string;
  travelCeremonyToReception?: string;
  travelGettingReadyToReception?: string;
}

export interface SavedTimeline {
  id: string;
  user_id: string;
  couple_name: string;
  wedding_date: string;
  content: string;
  metadata: WeddingData & { enriched?: EnrichedData };
  chat_history: ChatMessage[];
  version_history: string[];
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
