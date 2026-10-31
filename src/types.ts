export type UserRole = 'host' | 'debater' | 'audience';
export type Stance = 'pro' | 'con' | 'neutral';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  bio?: string;
  debatesCount: number;
  winsCount: number;
  audienceVotesReceived: number;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  role: UserRole;
  stance: Stance;
  joinedAt: string;
  isSpeaking?: boolean;
  score?: number;
  isReadyWithDraft?: boolean;
  isMuted?: boolean;
}

export interface QuickPoint {
  id: string;
  text: string;
  isAddressed: boolean;
  category?: 'rebuttal' | 'evidence' | 'fallacy' | 'question';
}

export interface DebaterScratchpad {
  draftText: string;
  quickPoints: QuickPoint[];
  citedSourceDraft?: string;
  isReadyToFire: boolean;
  lastUpdated: string;
}

export type ArgumentType = 'argument' | 'rebuttal' | 'poi' | 'citation' | 'ruling' | 'system';

export interface DebateMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: UserRole;
  senderStance: Stance;
  content: string;
  timestamp: string;
  type: ArgumentType;
  likesCount: number;
  citedSource?: string;
  replyTo?: {
    id: string;
    senderName: string;
    snippet: string;
  };
  aiFactCheck?: {
    status: 'verified' | 'questionable' | 'fallacy_detected' | 'neutral';
    note: string;
  };
}

export interface AudienceQuestion {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  question: string;
  votes: number;
  votedBy: string[];
  answered: boolean;
  timestamp: string;
}

export interface AudienceMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
}

export interface AIRefereeVerdict {
  summary: string;
  keyPointsPro: string[];
  keyPointsCon: string[];
  detectedFallacies: {
    debaterName: string;
    fallacyType: string;
    explanation: string;
  }[];
  verdictAnalysis: string;
  proScore: number;
  conScore: number;
  recommendedWinner?: string;
  updatedAt: string;
}

export interface DebateRoom {
  id: string;
  title: string;
  description: string;
  category: 'tech' | 'philosophy' | 'economy' | 'society' | 'sports' | 'science' | 'general';
  roomType: 'solo' | '1v1' | 'group'; // 'solo' (1 seat), '1v1' (2 seats), or 'group' (3-5 participants)
  maxDebaters: number; // 1 for solo, 2 for 1v1, 3-5 for group discussions
  currentDebatersCount: number;
  isLockedForDebaters: boolean;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  createdAt: string;
  status: 'active' | 'paused' | 'concluded';
  turnDurationSec: number; // e.g. 90
  currentSpeakerId?: string;
  turnStartedAt?: string;
  participants: Participant[];
  spectators: { id: string; name: string; avatar: string }[];
  spectatorsCount: number;
  messages: DebateMessage[];
  audienceMessages: AudienceMessage[];
  audienceQuestions: AudienceQuestion[];
  proVotes: number;
  conVotes: number;
  neutralVotes: number;
  votedUserIds: Record<string, Stance>;
  tags: string[];
  aiRefereeVerdict?: AIRefereeVerdict;
  mode?: 'text' | 'voice'; // 'text' default, 'voice' for real-time voice debates
  freeTalk?: boolean; // if true, all seated debaters can speak freely
  maxDurationMinutes?: number;
  endedAt?: string;
  bannedUserIds?: string[];
}

export type RoomMode = 'text' | 'voice';

export interface ReportItem {
  id: string;
  roomId: string;
  roomTitle: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetName: string;
  targetRole: string;
  reason: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface AdminVoiceRoomSummary {
  id: string;
  title: string;
  mode: 'text' | 'voice';
  hostName: string;
  currentDebatersCount: number;
  maxDebaters: number;
  spectatorsCount: number;
  status: 'active' | 'paused' | 'concluded';
  createdAt: string;
  durationMinutes: number;
  isFreeTalk: boolean;
}

export interface SavedDebate {
  id: string;
  roomId: string;
  title: string;
  description: string;
  category: 'tech' | 'philosophy' | 'economy' | 'society' | 'sports' | 'science' | 'general';
  roomType: 'solo' | '1v1' | 'group';
  maxDebaters: number;
  savedAt: string;
  hostName: string;
  hostAvatar: string;
  participants: Participant[];
  messages: DebateMessage[];
  audienceQuestionsCount: number;
  proVotes: number;
  conVotes: number;
  neutralVotes: number;
  tags: string[];
  aiRefereeVerdict?: AIRefereeVerdict;
  mode?: 'text' | 'voice';
}

