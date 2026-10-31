import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { AccessToken, RoomServiceClient, WebhookReceiver } from "livekit-server-sdk";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// LiveKit Environment Configuration
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_WEBHOOK_SECRET = process.env.LIVEKIT_WEBHOOK_SECRET || LIVEKIT_API_SECRET || "";
const VOICE_ONLY_MODE = process.env.VOICE_ONLY_MODE !== "false";
const VOICE_ROOM_MAX_DURATION_MINUTES = parseInt(process.env.VOICE_ROOM_MAX_DURATION_MINUTES || "120", 10);
const VOICE_ROOM_MAX_AUDIENCE = parseInt(process.env.VOICE_ROOM_MAX_AUDIENCE || "500", 10);

let roomServiceClient: RoomServiceClient | null = null;
let webhookReceiver: WebhookReceiver | null = null;

if (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
  try {
    const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
    roomServiceClient = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_WEBHOOK_SECRET);
    console.log("LiveKit RoomServiceClient & WebhookReceiver initialized successfully with:", httpUrl);
  } catch (err) {
    console.warn("LiveKit RoomServiceClient init error:", err);
  }
}

// Initialize Google GenAI
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-Memory Database for Active Debate Rooms
interface Participant {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  role: 'host' | 'debater' | 'audience';
  stance: 'pro' | 'con' | 'neutral';
  joinedAt: string;
  score?: number;
  isMuted?: boolean;
  lastPingAt?: number;
}

interface DebateMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: 'host' | 'debater' | 'audience';
  senderStance: 'pro' | 'con' | 'neutral';
  content: string;
  timestamp: string;
  type: 'argument' | 'rebuttal' | 'poi' | 'citation' | 'ruling' | 'system';
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

interface AudienceQuestion {
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

interface AudienceMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
}

interface AIRefereeVerdict {
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

interface DebateRoom {
  id: string;
  title: string;
  description: string;
  category: 'tech' | 'philosophy' | 'economy' | 'society' | 'sports' | 'science' | 'general';
  roomType: 'solo' | '1v1' | 'group';
  maxDebaters: number;
  currentDebatersCount: number;
  isLockedForDebaters: boolean;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  createdAt: string;
  status: 'active' | 'paused' | 'concluded';
  turnDurationSec: number;
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
  votedUserIds: Record<string, 'pro' | 'con' | 'neutral'>;
  tags: string[];
  aiRefereeVerdict?: AIRefereeVerdict;
  mode: 'text' | 'voice';
  freeTalk?: boolean;
  maxDurationMinutes?: number;
  endedAt?: string;
  bannedUserIds: string[];
  speakerLastActiveTimestamp?: number;
}

interface ReportItem {
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

const reports: ReportItem[] = [];

// Helper to synchronize live permissions in LiveKit room
async function syncLiveKitRoomPermissions(room: DebateRoom) {
  if (!roomServiceClient || room.mode !== 'voice') return;
  try {
    const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
    for (const debater of debaters) {
      const isMutedByHost = debater.isMuted === true;
      const canPublish = !isMutedByHost && (room.freeTalk === true || debater.id === room.currentSpeakerId);

      await roomServiceClient.updateParticipant(room.id, debater.id, undefined, {
        canPublish,
        canSubscribe: true,
        canPublishData: true,
      }).catch(() => {
        // Debater not currently in LiveKit room, ignore gracefully
      });
    }
  } catch (err) {
    console.warn("Failed to sync LiveKit permissions:", err);
  }
}

// Initial Rich Sample Rooms
const rooms: Map<string, DebateRoom> = new Map();

function seedInitialRooms() {
  // 0. Solo Presentation Room (1 Seat Max - Solo Keynote / Monologue)
  const room0: DebateRoom = {
    id: "room-solo-agi-future",
    title: "عرض منفرد: خارطة طريق الذكاء الاصطناعي العام (AGI) وتأثيره على الحضارة الإنسانية",
    description: "جلسة إلقاء وعرض فكري منفرد (مقعد واحد فقط للمتحدث). يلقي الخبير أطروحته أمام الجمهور، والجمهور يتفاعل ويطرح الأسئلة المباشرة ويصوت على المحتوى.",
    category: "tech",
    roomType: "solo",
    maxDebaters: 1,
    currentDebatersCount: 1, // 1/1 Locked
    isLockedForDebaters: true,
    hostId: "user-yasir",
    hostName: "م. ياسر القاضي",
    hostAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 5000000).toISOString(),
    status: "active",
    turnDurationSec: 120,
    currentSpeakerId: "user-yasir",
    turnStartedAt: new Date().toISOString(),
    mode: "voice",
    bannedUserIds: [],
    tags: ["عرض_منفرد", "ذكاء_اصطناعي_عام", "مستقبل", "تقنية"],
    spectatorsCount: 210,
    spectators: [
      { id: "s-10", name: "نورة المحمود", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
      { id: "s-11", name: "فيصل الحربي", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" }
    ],
    proVotes: 145,
    conVotes: 22,
    neutralVotes: 18,
    votedUserIds: {},
    participants: [
      {
        id: "user-yasir",
        name: "م. ياسر القاضي",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        handle: "@yasir_ai",
        role: "host",
        stance: "pro",
        joinedAt: new Date(Date.now() - 5000000).toISOString(),
        score: 94
      }
    ],
    messages: [
      {
        id: "msg-solo-1",
        roomId: "room-solo-agi-future",
        senderId: "user-yasir",
        senderName: "م. ياسر القاضي",
        senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "pro",
        content: "أهلاً بالجمهور الكريم في هذه الكلمة المنفردة. موضوعنا اليوم: هل نحن جاهزون للتحول نحو أنظمة ذكاء تفوق الذكاء البشري العام، وما هي معايير الأمان والتوافق التي يجب فرضها تشريعياً وهندسياً؟",
        timestamp: new Date(Date.now() - 4000000).toISOString(),
        type: "argument",
        likesCount: 58
      }
    ],
    audienceMessages: [
      {
        id: "aud-solo-1",
        senderId: "s-10",
        senderName: "نورة المحمود",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        content: "طرح عميق وممتاز من المهندس ياسر!",
        timestamp: new Date(Date.now() - 1000000).toISOString()
      }
    ],
    audienceQuestions: [
      {
        id: "q-solo-1",
        senderId: "s-11",
        senderName: "فيصل الحربي",
        senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        question: "ما هو الإطار الزمني الواقعي للوصول لـ AGI حسب النماذج الحالية؟",
        votes: 35,
        votedBy: ["s-10"],
        answered: false,
        timestamp: new Date(Date.now() - 800000).toISOString()
      }
    ]
  };

  // 1. Duel 1v1 Room (2 Debaters Max - Pro vs Con Faceoff)
  const room1: DebateRoom = {
    id: "room-1v1-ai-jobs",
    title: "1 ضد 1: هل الذكاء الاصطناعي سيقضي على وظائف البرمجة بالكامل بحلول 2030؟",
    description: "مواجهة ثنائية مباشرة (1v1) بين متناظرين اثنين: مؤيد يرى أن الوكلاء الأذكياء سينهون دور المبرمج التقليدي، ومعارض يرى أن هندسة الأنظمة وحل المشكلات ستبقى بشرية.",
    category: "tech",
    roomType: "1v1",
    maxDebaters: 2,
    currentDebatersCount: 2, // Fully locked 2/2
    isLockedForDebaters: true,
    hostId: "user-tariq",
    hostName: "م. طارق العمري",
    hostAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: "active",
    turnDurationSec: 90,
    currentSpeakerId: "user-sami",
    turnStartedAt: new Date().toISOString(),
    mode: "voice",
    bannedUserIds: [],
    tags: ["مناظرة_1v1", "ذكاء_اصطناعي", "برمجة", "مستقبل_العمل"],
    spectatorsCount: 178,
    spectators: [
      { id: "s-1", name: "عبدالله الشمري", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
      { id: "s-2", name: "ريما الأحمد", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
      { id: "s-3", name: "خالد بن منصور", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" }
    ],
    proVotes: 72,
    conVotes: 84,
    neutralVotes: 12,
    votedUserIds: {},
    participants: [
      {
        id: "user-tariq",
        name: "م. طارق العمري (المعارض)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        handle: "@tariq_dev",
        role: "host",
        stance: "con",
        joinedAt: new Date(Date.now() - 3600000).toISOString(),
        score: 92
      },
      {
        id: "user-sami",
        name: "د. سامي القحطاني (المؤيد)",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        handle: "@sami_ai",
        role: "debater",
        stance: "pro",
        joinedAt: new Date(Date.now() - 3500000).toISOString(),
        score: 88
      }
    ],
    messages: [
      {
        id: "msg-1",
        roomId: "room-1v1-ai-jobs",
        senderId: "user-tariq",
        senderName: "م. طارق العمري",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "con",
        content: "حجتي الافتتاحية في هذه المبارزة الثنائية 1v1: الذكاء الاصطناعي أداة مضاعفة للإنتاجية (Multiplier)، والأنظمة المعقدة تحتاج فهماً معمارياً وسياقاً بشرياً لا يستطيع النموذج توقعه دون رقابة هندسية صارمة.",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: "argument",
        likesCount: 29,
        citedSource: "تقرير معهد MIT حول أثر الأتمتة المعرفية 2025"
      },
      {
        id: "msg-2",
        roomId: "room-1v1-ai-jobs",
        senderId: "user-sami",
        senderName: "د. سامي القحطاني",
        senderAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        senderRole: "debater",
        senderStance: "pro",
        content: "ردي المباشر عليك يا م. طارق: قبل 3 سنوات فقط كانت النماذج تكتب دوال بدائية، واليوم تبني تطبيقات كاملة وتصلح أخطاءها ذاتياً. التطور أسي ومستمر، ووظيفة 'كتابة الكود يدوياً' ستنقرض لصالح وكلاء ذاتيي التصرف تماماً.",
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: "rebuttal",
        likesCount: 35,
        replyTo: {
          id: "msg-1",
          senderName: "م. طارق العمري",
          snippet: "الذكاء الاصطناعي أداة مضاعفة للإنتاجية والأنظمة المعقدة تحتاج فهماً معمارياً..."
        }
      }
    ],
    audienceMessages: [
      {
        id: "aud-1",
        senderId: "s-1",
        senderName: "عبدالله الشمري",
        senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        content: "مبارزة قوية جداً بين العمري والقحطاني!",
        timestamp: new Date(Date.now() - 800000).toISOString()
      }
    ],
    audienceQuestions: [
      {
        id: "q-1",
        senderId: "s-3",
        senderName: "خالد بن منصور",
        senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        question: "إذا حل الذكاء الاصطناعي محل المبرمجين المبتدئين، كيف سيصبحون خبراء بالمستقبل؟",
        votes: 42,
        votedBy: ["s-1", "s-2"],
        answered: false,
        timestamp: new Date(Date.now() - 500000).toISOString()
      }
    ],
    aiRefereeVerdict: {
      summary: "مناظرة ثنائية 1v1 نارية. المؤيد يركز على منحنى التطور التقني والوكلاء الأذكياء، والمعارض يركز على المسؤولية الهندسية وحل المشكلات التجريدية.",
      keyPointsPro: ["منحنى التطور الأسي للنماذج البرمجية", "بناء الأنظمة المتكاملة ذاتياً دون تدخل يدوي"],
      keyPointsCon: ["المسؤولية المعمارية والأمنية لا تفوض لآلة", "الحاجة لفهم سياق الأعمال غير النمطي"],
      detectedFallacies: [],
      verdictAnalysis: "الطرفان قدما براهين قوية جداً، والمواجهة الثنائية متكافئة حتى اللحظة.",
      proScore: 88,
      conScore: 89,
      recommendedWinner: "المعارض (بفارق نقطة واحدة)",
      updatedAt: new Date().toISOString()
    }
  };

  // 2. Open 1v1 Duel Room (Waiting for 2nd Debater!)
  const room2: DebateRoom = {
    id: "room-1v1-university-open",
    title: "1 ضد 1: الشهادة الجامعية التقليدية مقابل التعلم الذاتي والمشاريع العملية",
    description: "مناظرة ثنائية (1v1) - مقعد المضيف محجوز (مؤيد للجامعات)، ومقعد الخصم شاغر بانتظار دخول متناظر معارض للمبارزة المباشرة!",
    category: "society",
    roomType: "1v1",
    maxDebaters: 2,
    currentDebatersCount: 1, // 1/2 Seat Open!
    isLockedForDebaters: false,
    hostId: "user-layla",
    hostName: "د. ليلى الشريف",
    hostAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 2400000).toISOString(),
    status: "active",
    turnDurationSec: 90,
    currentSpeakerId: "user-layla",
    turnStartedAt: new Date().toISOString(),
    mode: "voice",
    bannedUserIds: [],
    tags: ["مناظرة_1v1", "تعليم", "جامعات", "تطوير"],
    spectatorsCount: 63,
    spectators: [],
    proVotes: 31,
    conVotes: 24,
    neutralVotes: 5,
    votedUserIds: {},
    participants: [
      {
        id: "user-layla",
        name: "د. ليلى الشريف",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        handle: "@layla_edu",
        role: "host",
        stance: "pro",
        joinedAt: new Date(Date.now() - 2400000).toISOString(),
        score: 85
      }
    ],
    messages: [
      {
        id: "msg-u-1",
        roomId: "room-1v1-university-open",
        senderId: "user-layla",
        senderName: "د. ليلى الشريف",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "pro",
        content: "الجامعة تبني الأساس المنهجي والبحثي والشخصية الأكاديمية وليس مجرد مهارات فورية. المقعد الثاني مفتوح للمبارزة: من يتحداني بموقف معارض؟",
        timestamp: new Date(Date.now() - 1500000).toISOString(),
        type: "argument",
        likesCount: 14
      }
    ],
    audienceMessages: [],
    audienceQuestions: []
  };

  // 3. Group Discussion Panel Room (Max 4 debaters - 2 open seats)
  const room3: DebateRoom = {
    id: "room-group-freelance-career",
    title: "نقاش جماعي: العمل الحر وريادة الأعمال أم الوظيفة المستقرة في مقتبل العمر؟",
    description: "حلقة نقاش جماعية متعددة الأطراف (الحد الأقصى 4 متحدثين). متاح مقعدين شاغرين للصعود ومشاركة الرأي بين مؤيد ومعارض ومحايد.",
    category: "economy",
    roomType: "group",
    maxDebaters: 4,
    currentDebatersCount: 2, // 2/4 seats taken (2 open!)
    isLockedForDebaters: false,
    hostId: "user-majed",
    hostName: "ماجد الدوسري",
    hostAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    status: "active",
    turnDurationSec: 90,
    currentSpeakerId: "user-majed",
    turnStartedAt: new Date().toISOString(),
    mode: "voice",
    freeTalk: false,
    bannedUserIds: [],
    tags: ["نقاش_جماعي", "اقتصاد", "ريادة_أعمال", "وظائف"],
    spectatorsCount: 88,
    spectators: [],
    proVotes: 44,
    conVotes: 36,
    neutralVotes: 8,
    votedUserIds: {},
    participants: [
      {
        id: "user-majed",
        name: "ماجد الدوسري",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
        handle: "@majed_ent",
        role: "host",
        stance: "pro",
        joinedAt: new Date(Date.now() - 1800000).toISOString(),
        score: 86
      },
      {
        id: "user-huda",
        name: "هدى العتيبي",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        handle: "@huda_hr",
        role: "debater",
        stance: "con",
        joinedAt: new Date(Date.now() - 1500000).toISOString(),
        score: 82
      }
    ],
    messages: [
      {
        id: "msg-f-1",
        roomId: "room-group-freelance-career",
        senderId: "user-majed",
        senderName: "ماجد الدوسري",
        senderAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "pro",
        content: "في سن الشباب تكون الالتزامات المالية في أدنى مستوياتها، والقدرة على التعلم من التجربة والخطأ غير محدودة. إذا لم تخاطر بريادة الأعمال في العشرينات فمتى ستخاطر؟",
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: "argument",
        likesCount: 18
      },
      {
        id: "msg-f-2",
        roomId: "room-group-freelance-career",
        senderId: "user-huda",
        senderName: "هدى العتيبي",
        senderAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        senderRole: "debater",
        senderStance: "con",
        content: "إحصائياً أغلب المشاريع الناشئة المبكرة تفشل بسبب نقص الخبرة التنظيمية وإدارة السيولة. العمل في بيئة مؤسسية يمنحك خبرة يدفع الآخرون ثمنها.",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: "rebuttal",
        likesCount: 21
      }
    ],
    audienceMessages: [],
    audienceQuestions: []
  };

  // 4. Group Discussion Panel Room (Max 5 speakers - Fully Locked 5/5)
  const room4: DebateRoom = {
    id: "room-group-remote-work",
    title: "نقاش جماعي: العمل عن بُعد بالكامل أم العودة الإلزامية للمكاتب لفرق العمل؟",
    description: "جلسة حوارية مستديرة مكتملة النصاب بـ 5 متحدثين كحد أقصى (5/5 مقاعد مشغولة)، المنصة مغلقة والنقاش مشتعل والجمهور يصوت مباشرة.",
    category: "economy",
    roomType: "group",
    maxDebaters: 5,
    currentDebatersCount: 5, // Fully locked 5/5
    isLockedForDebaters: true,
    hostId: "user-khalid",
    hostName: "خالد السديري",
    hostAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 4200000).toISOString(),
    status: "active",
    turnDurationSec: 90,
    currentSpeakerId: "user-noura",
    turnStartedAt: new Date().toISOString(),
    mode: "voice",
    bannedUserIds: [],
    tags: ["نقاش_جماعي", "عمل_عن_بعد", "إنتاجية", "إدارة"],
    spectatorsCount: 135,
    spectators: [],
    proVotes: 61,
    conVotes: 58,
    neutralVotes: 16,
    votedUserIds: {},
    participants: [
      {
        id: "user-khalid",
        name: "خالد السديري (المضيف)",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        handle: "@khalid_mgr",
        role: "host",
        stance: "pro",
        joinedAt: new Date(Date.now() - 4200000).toISOString(),
        score: 84
      },
      {
        id: "user-noura",
        name: "نورة القاسمي",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        handle: "@noura_remote",
        role: "debater",
        stance: "pro",
        joinedAt: new Date(Date.now() - 4000000).toISOString(),
        score: 87
      },
      {
        id: "user-omar",
        name: "عمر اليافعي",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        handle: "@omar_ops",
        role: "debater",
        stance: "con",
        joinedAt: new Date(Date.now() - 3800000).toISOString(),
        score: 80
      },
      {
        id: "user-sara",
        name: "سارة الزامل",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
        handle: "@sara_culture",
        role: "debater",
        stance: "con",
        joinedAt: new Date(Date.now() - 3600000).toISOString(),
        score: 82
      },
      {
        id: "user-hassan",
        name: "حسن المهيدب",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        handle: "@hassan_lead",
        role: "debater",
        stance: "neutral",
        joinedAt: new Date(Date.now() - 3400000).toISOString(),
        score: 79
      }
    ],
    messages: [
      {
        id: "msg-r-1",
        roomId: "room-group-remote-work",
        senderId: "user-khalid",
        senderName: "خالد السديري",
        senderAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "pro",
        content: "اكتملت مقاعد حلقة النقاش الـ 5. بدأنا الحوار: العمل عن بعد يفتح الباب للمواهب العالمية ويوفر هدر ساعات الزحام ويزيد التركيز الفردي.",
        timestamp: new Date(Date.now() - 2000000).toISOString(),
        type: "argument",
        likesCount: 16
      }
    ],
    audienceMessages: [],
    audienceQuestions: []
  };

  rooms.set(room0.id, room0);
  rooms.set(room1.id, room1);
  rooms.set(room2.id, room2);
  rooms.set(room3.id, room3);
  rooms.set(room4.id, room4);
}

seedInitialRooms();

// API Endpoints

// 1. Get All Rooms
app.get("/api/rooms", (req: Request, res: Response) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    roomType: r.roomType || (r.maxDebaters === 1 ? 'solo' : r.maxDebaters === 2 ? '1v1' : 'group'),
    maxDebaters: r.maxDebaters,
    currentDebatersCount: r.participants.filter(p => p.role === 'host' || p.role === 'debater').length,
    isLockedForDebaters: r.participants.filter(p => p.role === 'host' || p.role === 'debater').length >= r.maxDebaters,
    hostName: r.hostName,
    hostAvatar: r.hostAvatar,
    status: r.status,
    spectatorsCount: r.spectatorsCount,
    messagesCount: r.messages.length,
    tags: r.tags,
    participants: r.participants.slice(0, 5),
    createdAt: r.createdAt,
    mode: r.mode || 'text',
    freeTalk: Boolean(r.freeTalk),
  }));
  res.json({ success: true, rooms: roomList });
});

// 2. Get Single Room
app.get("/api/rooms/:id", (req: Request, res: Response) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  // update debater count and lock status
  const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
  room.currentDebatersCount = debaters.length;
  room.isLockedForDebaters = debaters.length >= room.maxDebaters;
  if (!room.roomType) {
    room.roomType = room.maxDebaters === 1 ? 'solo' : room.maxDebaters === 2 ? '1v1' : 'group';
  }

  // Check if turn time expired and rotate speaker automatically if multiple debaters
  if (room.turnDurationSec && room.turnDurationSec > 0 && room.turnStartedAt && debaters.length > 1) {
    const elapsedSec = Math.floor((Date.now() - new Date(room.turnStartedAt).getTime()) / 1000);
    if (elapsedSec >= room.turnDurationSec) {
      const currentIndex = debaters.findIndex(p => p.id === room.currentSpeakerId);
      const previousDebater = currentIndex !== -1 ? debaters[currentIndex] : debaters[0];
      const nextIndex = (currentIndex + 1) % debaters.length;
      const nextDebater = debaters[nextIndex];

      room.currentSpeakerId = nextDebater.id;
      room.turnStartedAt = new Date().toISOString();
      room.speakerLastActiveTimestamp = Date.now();

      room.messages.push({
        id: "sys-turn-auto-" + Date.now(),
        roomId: room.id,
        senderId: "system",
        senderName: "نظام المنصة",
        senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: nextDebater.stance,
        content: `🔔 انتهى وقت المتحدث (${previousDebater.name})، وانتقلت الكلمة تلقائياً إلى: ${nextDebater.name} (${nextDebater.stance === 'pro' ? 'مؤيد' : nextDebater.stance === 'con' ? 'معارض' : 'محايد'}). الوقت المحدد: ${room.turnDurationSec} ثانية.`,
        timestamp: new Date().toISOString(),
        type: "system",
        likesCount: 0
      });

      syncLiveKitRoomPermissions(room);
    }
  }

  // Voice room: If speaker disconnects for > 30s during their turn, auto-skip
  if (room.mode === 'voice' && debaters.length > 1 && room.speakerLastActiveTimestamp) {
    const disconnectedMs = Date.now() - room.speakerLastActiveTimestamp;
    if (disconnectedMs > 30000) {
      const currentIndex = debaters.findIndex(p => p.id === room.currentSpeakerId);
      const prev = currentIndex !== -1 ? debaters[currentIndex] : debaters[0];
      const nextIndex = (currentIndex + 1) % debaters.length;
      const nextDebater = debaters[nextIndex];

      room.currentSpeakerId = nextDebater.id;
      room.turnStartedAt = new Date().toISOString();
      room.speakerLastActiveTimestamp = Date.now();

      room.messages.push({
        id: "sys-turn-disc-" + Date.now(),
        roomId: room.id,
        senderId: "system",
        senderName: "نظام المنصة",
        senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: nextDebater.stance,
        content: `⚠️ تم تخطي دور المتحدث (${prev.name}) تلقائياً بسبب انقطاع الاتصال لأكثر من 30 ثانية. الكلمة الآن إلى: ${nextDebater.name}.`,
        timestamp: new Date().toISOString(),
        type: "system",
        likesCount: 0
      });

      syncLiveKitRoomPermissions(room);
    }
  }

  res.json({ success: true, room });
});

// 3. Create Room
app.post("/api/rooms", (req: Request, res: Response) => {
  const { title, description, category, roomType, maxDebaters, hostName, hostAvatar, turnDurationSec, tags, hostStance, mode, freeTalk } = req.body;
  if (!title || !description) {
    return res.status(400).json({ success: false, error: "يرجى تعبئة عنوان وسياق الغرفة" });
  }

  const selectedMode = (VOICE_ONLY_MODE || mode === 'voice') ? 'voice' : 'text';

  // Cost control: A user can host only one live voice room at a time
  if (selectedMode === 'voice') {
    const existingActiveVoiceRoom = Array.from(rooms.values()).find(
      r => r.status === 'active' && r.mode === 'voice' && (r.hostName === hostName?.trim() || (req.body.hostId && r.hostId === req.body.hostId))
    );
    if (existingActiveVoiceRoom) {
      return res.status(400).json({
        success: false,
        error: "لديك غرفة صوتية نشطة بالفعل. يمكن للمضيف إدارة غرفة صوتية نشطة واحدة فقط في نفس الوقت. يرجى إنهاء غرفتك السابقة أولاً."
      });
    }
  }

  // Support 1 (solo), 2 (1v1), 3..5 (group)
  let parsedMax = Number(maxDebaters);
  if (!parsedMax || isNaN(parsedMax)) {
    parsedMax = roomType === 'solo' ? 1 : roomType === '1v1' ? 2 : 5;
  }
  parsedMax = Math.max(1, Math.min(5, parsedMax));

  const selectedRoomType: 'solo' | '1v1' | 'group' = parsedMax === 1 ? 'solo' : parsedMax === 2 ? '1v1' : 'group';
  const roomId = "room-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
  const hostId = "user-" + Math.random().toString(36).substring(2, 8);

  const newRoom: DebateRoom = {
    id: roomId,
    title: title.trim(),
    description: description.trim(),
    category: category || "general",
    roomType: selectedRoomType,
    maxDebaters: parsedMax,
    currentDebatersCount: 1,
    isLockedForDebaters: false,
    hostId: hostId,
    hostName: hostName?.trim() || "منشئ الغرفة",
    hostAvatar: hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    status: "active",
    turnDurationSec: Number(turnDurationSec) || 90,
    currentSpeakerId: hostId,
    turnStartedAt: new Date().toISOString(),
    speakerLastActiveTimestamp: Date.now(),
    mode: selectedMode,
    freeTalk: Boolean(freeTalk),
    bannedUserIds: [],
    participants: [
      {
        id: hostId,
        name: hostName?.trim() || "منشئ الغرفة",
        avatar: hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        handle: "@host_" + hostId.substring(5),
        role: "host",
        stance: hostStance || "pro",
        joinedAt: new Date().toISOString(),
        score: 50
      }
    ],
    spectators: [],
    spectatorsCount: 1,
    messages: [
      {
        id: "msg-welcome",
        roomId: roomId,
        senderId: hostId,
        senderName: hostName?.trim() || "منشئ الغرفة",
        senderAvatar: hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: hostStance || "pro",
        content: selectedMode === 'voice'
          ? `🎙️ مرحباً بكم في الغرفة الصوتية المباشرة "${title}". نمط التحدث: ${freeTalk ? 'حوار حر مفتوح' : 'تعاقب أدوار الميكروفون'}. سعة المنصة: ${parsedMax} ${parsedMax === 1 ? 'متحدث منفرد' : parsedMax === 2 ? 'متناظرين (1v1)' : 'متحدثين كحد أقصى'}.`
          : `مرحباً بالجميع في غرفة "${title}". سعة المنصة محددة بـ ${parsedMax} ${parsedMax === 1 ? 'متحدث منفرد' : parsedMax === 2 ? 'متناظرين (1v1)' : 'متحدثين كحد أقصى'}. فور اكتمال المقاعد تقفل المنصة للمتحدثين ويتحول البقية لجمهور متابع.`,
        timestamp: new Date().toISOString(),
        type: "system",
        likesCount: 0
      }
    ],
    audienceMessages: [],
    audienceQuestions: [],
    proVotes: 1,
    conVotes: 0,
    neutralVotes: 0,
    votedUserIds: {},
    tags: Array.isArray(tags) ? tags : [selectedMode === 'voice' ? "غرفة_صوتية" : "مناظرة", "حوار"]
  };

  rooms.set(roomId, newRoom);
  res.json({ success: true, room: newRoom, hostId });
});

// 4. Join Room (Determines Debater seat or Spectator seat automatically based on capacity limit)
app.post("/api/rooms/:id/join", (req: Request, res: Response) => {
  const { userId, userName, userAvatar, userHandle, requestedRole, stance } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (room.bannedUserIds?.includes(userId)) {
    return res.status(403).json({ success: false, error: "تم حظرك من هذه الغرفة بواسطة المشرف" });
  }

  const existingParticipant = room.participants.find(p => p.id === userId);
  const debaterCount = room.participants.filter(p => p.role === 'host' || p.role === 'debater').length;

  let assignedRole: 'host' | 'debater' | 'audience' = 'audience';

  if (existingParticipant) {
    assignedRole = existingParticipant.role;
  } else {
    // If user requested to be a debater and slots are still open
    if (requestedRole === 'debater' || requestedRole === 'speaker') {
      if (debaterCount < room.maxDebaters) {
        assignedRole = 'debater';
        const newDebater: Participant = {
          id: userId || ("user-" + Math.random().toString(36).substring(2, 8)),
          name: userName?.trim() || "متناظر جديد",
          avatar: userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          handle: userHandle || "@debater",
          role: "debater",
          stance: stance || (debaterCount % 2 === 0 ? "pro" : "con"),
          joinedAt: new Date().toISOString(),
          score: 50
        };
        room.participants.push(newDebater);

        // System message announcing debater join
        room.messages.push({
          id: "sys-" + Date.now(),
          roomId: room.id,
          senderId: "system",
          senderName: "نظام المناظرة",
          senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
          senderRole: "host",
          senderStance: newDebater.stance,
          content: `انضم ${newDebater.name} كمتحدث في المنصة (${room.participants.filter(p => p.role === 'host' || p.role === 'debater').length}/${room.maxDebaters} مقاعد). الموقف: ${newDebater.stance === 'pro' ? 'مؤيد' : newDebater.stance === 'con' ? 'معارض' : 'محايد'}.`,
          timestamp: new Date().toISOString(),
          type: "system",
          likesCount: 0
        });
      } else {
        assignedRole = 'audience';
      }
    } else {
      assignedRole = 'audience';
    }

    if (assignedRole === 'audience') {
      room.spectatorsCount = (room.spectatorsCount || 0) + 1;
      room.spectators.push({
        id: userId,
        name: userName || "مشاهد",
        avatar: userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
      });
    }
  }

  const updatedDebatersCount = room.participants.filter(p => p.role === 'host' || p.role === 'debater').length;
  room.currentDebatersCount = updatedDebatersCount;
  room.isLockedForDebaters = updatedDebatersCount >= room.maxDebaters;

  syncLiveKitRoomPermissions(room);

  res.json({
    success: true,
    assignedRole,
    isLocked: room.isLockedForDebaters,
    currentDebatersCount: updatedDebatersCount,
    maxDebaters: room.maxDebaters,
    room
  });
});

// 5. Send Debate Message (On-Stage Debaters Only)
app.post("/api/rooms/:id/messages", (req: Request, res: Response) => {
  const { senderId, senderName, senderAvatar, senderRole, senderStance, content, type, citedSource, replyTo } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: "محتوى الرسالة فارغ" });
  }

  // Check if sender is active debater or host
  const isDebater = room.participants.some(p => p.id === senderId && (p.role === 'host' || p.role === 'debater'));
  if (!isDebater) {
    return res.status(403).json({
      success: false,
      error: "مقاعد المتحدثين مغلقة! أنت في صفوف الجمهور. يمكنك المشاركة في شات الجمهور أو طرح أسئلة."
    });
  }

  const newMessage: DebateMessage = {
    id: "msg-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
    roomId: room.id,
    senderId,
    senderName,
    senderAvatar,
    senderRole: senderRole || 'debater',
    senderStance: senderStance || 'neutral',
    content: content.trim(),
    timestamp: new Date().toISOString(),
    type: type || 'argument',
    likesCount: 0,
    citedSource: citedSource?.trim(),
    replyTo: replyTo ? {
      id: replyTo.id,
      senderName: replyTo.senderName,
      snippet: replyTo.snippet
    } : undefined
  };

  room.messages.push(newMessage);
  res.json({ success: true, message: newMessage, room });
});

// 6. Send Audience Side-Chat Message
app.post("/api/rooms/:id/audience-messages", (req: Request, res: Response) => {
  const { senderId, senderName, senderAvatar, content } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, error: "محتوى الرسالة فارغ" });
  }

  const newAudienceMsg: AudienceMessage = {
    id: "aud-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 5),
    senderId,
    senderName: senderName || "مشاهد",
    senderAvatar: senderAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  room.audienceMessages.push(newAudienceMsg);
  // keep last 100 audience messages
  if (room.audienceMessages.length > 100) {
    room.audienceMessages.shift();
  }

  res.json({ success: true, message: newAudienceMsg });
});

// 7. Submit Audience Question
app.post("/api/rooms/:id/questions", (req: Request, res: Response) => {
  const { senderId, senderName, senderAvatar, question } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, error: "نص السؤال مطلوب" });
  }

  const newQuestion: AudienceQuestion = {
    id: "q-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 5),
    senderId,
    senderName: senderName || "مشاهد",
    senderAvatar: senderAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    question: question.trim(),
    votes: 1,
    votedBy: [senderId],
    answered: false,
    timestamp: new Date().toISOString()
  };

  room.audienceQuestions.unshift(newQuestion);
  res.json({ success: true, question: newQuestion });
});

// 8. Upvote Audience Question
app.post("/api/rooms/:id/questions/:qId/vote", (req: Request, res: Response) => {
  const { userId } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  const q = room.audienceQuestions.find(item => item.id === req.params.qId);
  if (!q) return res.status(404).json({ success: false, error: "السؤال غير موجود" });

  if (q.votedBy.includes(userId)) {
    q.votedBy = q.votedBy.filter(id => id !== userId);
    q.votes = Math.max(0, q.votes - 1);
  } else {
    q.votedBy.push(userId);
    q.votes += 1;
  }

  res.json({ success: true, votes: q.votes, votedBy: q.votedBy });
});

// 9. Audience Live Sentiment Vote (Pro vs Con vs Neutral)
app.post("/api/rooms/:id/vote", (req: Request, res: Response) => {
  const { userId, stance } = req.body; // 'pro' | 'con' | 'neutral'
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  const previousStance = room.votedUserIds[userId];
  if (previousStance) {
    if (previousStance === 'pro') room.proVotes = Math.max(0, room.proVotes - 1);
    if (previousStance === 'con') room.conVotes = Math.max(0, room.conVotes - 1);
    if (previousStance === 'neutral') room.neutralVotes = Math.max(0, room.neutralVotes - 1);
  }

  if (previousStance === stance) {
    // toggle off
    delete room.votedUserIds[userId];
  } else {
    room.votedUserIds[userId] = stance;
    if (stance === 'pro') room.proVotes += 1;
    if (stance === 'con') room.conVotes += 1;
    if (stance === 'neutral') room.neutralVotes += 1;
  }

  res.json({
    success: true,
    proVotes: room.proVotes,
    conVotes: room.conVotes,
    neutralVotes: room.neutralVotes,
    userVote: room.votedUserIds[userId]
  });
});

// 10. Switch Speaker Turn / Next Round / Pass Mic
app.post("/api/rooms/:id/turn", (req: Request, res: Response) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  const { manualPass, speakerName } = req.body || {};
  const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
  if (debaters.length === 0) return res.json({ success: true });

  const currentIndex = debaters.findIndex(p => p.id === room.currentSpeakerId);
  const previousDebater = currentIndex !== -1 ? debaters[currentIndex] : null;

    if (debaters.length === 1) {
    // Solo Speaker: reset turn timer for new round
    room.currentSpeakerId = debaters[0].id;
    room.turnStartedAt = new Date().toISOString();
    room.speakerLastActiveTimestamp = Date.now();
    room.messages.push({
      id: "sys-turn-" + Date.now(),
      roomId: room.id,
      senderId: "system",
      senderName: "نظام المنصة",
      senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      senderRole: "host",
      senderStance: debaters[0].stance,
      content: manualPass 
        ? `🎤 أنهى ${speakerName || debaters[0].name} فقرته وبدأ جولة إلقاء جديدة (${room.turnDurationSec} ثانية).`
        : `🔔 تجديد دور الإلقاء للمتحدث: ${debaters[0].name}. الوقت المحدد: ${room.turnDurationSec} ثانية.`,
      timestamp: new Date().toISOString(),
      type: "system",
      likesCount: 0
    });
    syncLiveKitRoomPermissions(room);
    return res.json({ success: true, currentSpeakerId: room.currentSpeakerId, room });
  }

  const nextIndex = (currentIndex + 1) % debaters.length;
  room.currentSpeakerId = debaters[nextIndex].id;
  room.turnStartedAt = new Date().toISOString();
  room.speakerLastActiveTimestamp = Date.now();

  // Announcement message
  const announcementContent = manualPass && previousDebater
    ? `🎤 أنهى ${previousDebater.name} كلامه مبكراً ومرر الكلمة إلى المتحدث: ${debaters[nextIndex].name} (${debaters[nextIndex].stance === 'pro' ? 'مؤيد' : debaters[nextIndex].stance === 'con' ? 'معارض' : 'محايد'}). الوقت: ${room.turnDurationSec} ثانية.`
    : `🔔 دور التحدث الآن للمتناظر: ${debaters[nextIndex].name} (${debaters[nextIndex].stance === 'pro' ? 'مؤيد' : debaters[nextIndex].stance === 'con' ? 'معارض' : 'محايد'}). الوقت المحدد: ${room.turnDurationSec} ثانية.`;

  room.messages.push({
    id: "sys-turn-" + Date.now(),
    roomId: room.id,
    senderId: "system",
    senderName: "نظام المنصة",
    senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    senderRole: "host",
    senderStance: debaters[nextIndex].stance,
    content: announcementContent,
    timestamp: new Date().toISOString(),
    type: "system",
    likesCount: 0
  });

  syncLiveKitRoomPermissions(room);

  res.json({ success: true, currentSpeakerId: room.currentSpeakerId, room });
});

// 11. Leave Speaker Stage (Opens a slot for spectators!)
app.post("/api/rooms/:id/step-down", (req: Request, res: Response) => {
  const { userId } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  const pIndex = room.participants.findIndex(p => p.id === userId);
  if (pIndex !== -1) {
    const user = room.participants[pIndex];
    if (user.role !== 'host') {
      user.role = 'audience';
      // System message
      room.messages.push({
        id: "sys-vacate-" + Date.now(),
        roomId: room.id,
        senderId: "system",
        senderName: "نظام المنصة",
        senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "neutral",
        content: `غادر ${user.name} منصة المتحدثين. أصبح هناك مقعد شاغر متاح الآن للجمهور!`,
        timestamp: new Date().toISOString(),
        type: "system",
        likesCount: 0
      });
    }
  }

  const debaterCount = room.participants.filter(p => p.role === 'host' || p.role === 'debater').length;
  room.currentDebatersCount = debaterCount;
  room.isLockedForDebaters = debaterCount >= room.maxDebaters;

  // If the leaving debater was current speaker, rotate
  if (room.currentSpeakerId === userId) {
    const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
    room.currentSpeakerId = debaters[0]?.id || null;
    room.turnStartedAt = new Date().toISOString();
    room.speakerLastActiveTimestamp = Date.now();
  }

  syncLiveKitRoomPermissions(room);

  res.json({ success: true, isLocked: room.isLockedForDebaters, room });
});

// 12. AI Debate Referee & Fact-Checker (Gemini API Integration)
app.post("/api/gemini/judge", async (req: Request, res: Response) => {
  const { roomId } = req.body;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (!ai) {
    // High-quality deterministic analysis fallback if key not configured
    const verdict: AIRefereeVerdict = {
      summary: `تحليل تحكيمي لمناظرة "${room.title}": استعرض المتحدثون حججاً متنوعة غطت الجوانب الجوهرية للقضية، مع تباين في القوة الاستدلالية واستخدام الأمثلة العملية.`,
      keyPointsPro: [
        "التأكيد على تسارع التطور التقني وجدوى المبادرة السريعة",
        "الاستشهاد ببيانات الكفاءة ومضاعفة الإنتاجية"
      ],
      keyPointsCon: [
        "التركيز على إدارة المخاطر والمسؤولية التشغيلية والواقعية",
        "أهمية البناء التراكمي للخبرة والمنطق التجريدي"
      ],
      detectedFallacies: [
        {
          debaterName: room.participants[1]?.name || "أحد المتناظرين",
          fallacyType: "مغالطة التعميم أو رجل القش",
          explanation: "المبالغة في تبسيط حجة الطرف الآخر للرد عليها بسهولة بدلاً من معالجة جوهر الفكرة."
        }
      ],
      verdictAnalysis: "النقاش متقارب جداً، ويتميز بالانضباط المعرفي. تتقدم كفة الفريق المعارض بنسبة طفيفة نظراً لصلابة الأدلة الواقعية.",
      proScore: 82,
      conScore: 86,
      recommendedWinner: "الفريق المعارض (بفارق 4 نقاط)",
      updatedAt: new Date().toISOString()
    };
    room.aiRefereeVerdict = verdict;
    return res.json({ success: true, verdict });
  }

  try {
    const formattedMessages = room.messages
      .filter(m => m.type !== 'system')
      .map(m => `[${m.senderName} (${m.senderStance})]: ${m.content}`)
      .join("\n");

    const prompt = `أنت حكم مناظرات أكاديمي وخبير في المنطق وتحليل الحجج.
المناظرة بعنوان: "${room.title}"
سياق المناظرة: "${room.description}"

سجل الحديث في المناظرة:
${formattedMessages || "لم تبدأ بعد المناقشات التفصيلية"}

المطلوب: قم بتحكيم هذه المناظرة بموضوعية تامة وقدم تحليلاً دقيقاً باللغة العربية يشمل:
1. ملخص النقاش ونقاط التوافق والاختلاف.
2. أهم حجج الفريق المؤيد (Pro).
3. أهم حجج الفريق المعارض (Con).
4. أي مغالطات منطقية تم رصدها (مثل: الشخصنة، رجل القش، التعميم المتسرع، الاحتكام للسلطة).
5. تحليل الحكم النهائي مع درجات تقريبية من 100 لكل طرف وترشيح الفائز بناءً على قوة المنطق والأدلة.

يجب أن ترجع النتيجة بصيغة JSON حصراً بالشكل التالي:
{
  "summary": "ملخص شامل ومختصر للمناظرة",
  "keyPointsPro": ["حجة 1", "حجة 2"],
  "keyPointsCon": ["حجة 1", "حجة 2"],
  "detectedFallacies": [
    {
      "debaterName": "اسم المتناظر",
      "fallacyType": "اسم المغالطة",
      "explanation": "شرح موجز للمغالطة"
    }
  ],
  "verdictAnalysis": "تحليل تحكيمي دقيق للأداء",
  "proScore": 85,
  "conScore": 80,
  "recommendedWinner": "الفريق المؤيد"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const parsedData = JSON.parse(text);
    const verdict: AIRefereeVerdict = {
      summary: parsedData.summary || "تم تحليل المناظرة بنجاح.",
      keyPointsPro: parsedData.keyPointsPro || [],
      keyPointsCon: parsedData.keyPointsCon || [],
      detectedFallacies: parsedData.detectedFallacies || [],
      verdictAnalysis: parsedData.verdictAnalysis || "مناظرة غنية بالأفكار والتحليل.",
      proScore: Number(parsedData.proScore) || 80,
      conScore: Number(parsedData.conScore) || 80,
      recommendedWinner: parsedData.recommendedWinner || "تعادل معرفي",
      updatedAt: new Date().toISOString()
    };

    room.aiRefereeVerdict = verdict;

    // Add referee message into discussion stream
    room.messages.push({
      id: "referee-" + Date.now(),
      roomId: room.id,
      senderId: "ai-referee",
      senderName: "⚖️ حكم المناظرة الذكي (AI Referee)",
      senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      senderRole: "host",
      senderStance: "neutral",
      content: `📋 تقرير تحكيم المنصة: ${verdict.summary}\n\n🏆 التقييم: المؤيد (${verdict.proScore}%) | المعارض (${verdict.conScore}%)\nالمرشح للفوز: ${verdict.recommendedWinner}`,
      timestamp: new Date().toISOString(),
      type: "ruling",
      likesCount: 15
    });

    res.json({ success: true, verdict });
  } catch (error: any) {
    console.error("Gemini referee error:", error);
    res.status(500).json({ success: false, error: "تعذر توليد تقرير التحكيم حالياً" });
  }
});

// 13. AI Debater Counter-Argument Generator (simulate debater or provide counter-point inspiration)
app.post("/api/gemini/counter-argument", async (req: Request, res: Response) => {
  const { topic, messageContent, targetStance } = req.body;

  if (!ai) {
    return res.json({
      success: true,
      counterArgument: "حجة مضادة مقترحة: يجب مراعاة السياق العملي والآثار غير المباشرة على المدى البعيد، حيث تثبت التجارب الواقعية أن التوازن بين الابتكار والاستقرار هو السبيل الأكثر استدامة."
    });
  }

  try {
    const prompt = `أنت متناظر فصيح ومفكر بارع في فن الإقناع والمناظرة باللغة العربية.
موضوع المناظرة: "${topic}"
الحجة المطروحة: "${messageContent}"
المطلوب منك: صياغة رد داحض وقوي ومحكم (Rebuttal) من موقع (${targetStance === 'pro' ? 'المؤيد' : 'المعارض'})، باستخدام أسلوب أنيق ومنطق سليم دون تجاوز 3-4 أسطر.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    res.json({ success: true, counterArgument: response.text });
  } catch (err: any) {
    console.error("Gemini counter argument error:", err);
    res.status(500).json({ success: false, error: "تعذر صياغة الرد" });
  }
});

// -------------------------------------------------------------
// LIVEKIT VOICE INTEGRATION & MODERATION ENDPOINTS
// -------------------------------------------------------------

// Rate limiter: max 30 token requests per minute per IP / user
const tokenRateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = tokenRateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    tokenRateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count += 1;
  return true;
}

// 14. LiveKit Token Generation Endpoint
app.post("/api/livekit/token", async (req: Request, res: Response) => {
  const { roomId, userId, userName, userAvatar } = req.body;
  if (!roomId || !userId) {
    return res.status(400).json({ success: false, error: "بيانات الغرفة والمستخدم مطلوبة" });
  }

  // Rate Limiting
  const rateLimitKey = `${req.ip}_${userId}`;
  if (!checkRateLimit(rateLimitKey)) {
    return res.status(429).json({ success: false, error: "تم تجاوز حد طلبات الرموز. يرجى الانتظار قليلاً." });
  }

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  }

  if (room.status === 'concluded') {
    return res.status(410).json({ success: false, error: "هذه المناظرة انتهت بالفعل" });
  }

  if (room.bannedUserIds?.includes(userId)) {
    return res.status(403).json({ success: false, error: "تم حظرك من هذه الغرفة بواسطة المشرف" });
  }

  const participant = room.participants.find(p => p.id === userId);
  const isDebater = participant ? (participant.role === 'host' || participant.role === 'debater') : false;
  const isHost = room.hostId === userId || participant?.role === 'host';

  // Audience limit check
  if (!isDebater && room.spectatorsCount >= VOICE_ROOM_MAX_AUDIENCE) {
    return res.status(403).json({ success: false, error: "اكتمل الحد الأقصى لسعة الجمهور في هذه الغرفة" });
  }

  const isCurrentSpeaker = room.currentSpeakerId === userId;
  const isFreeTalk = Boolean(room.freeTalk);
  const isMutedByHost = Boolean(participant?.isMuted);

  // Seated speakers: canPublish strictly according to current turn or free talk
  const canPublish = isDebater && !isMutedByHost && (isFreeTalk || isCurrentSpeaker);

  // If LiveKit credentials are not yet configured in .env, return sandbox info for smooth UI demo
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.json({
      success: true,
      token: "simulated_token_" + userId + "_" + Date.now(),
      wsUrl: "simulated",
      isSimulated: true,
      mode: room.mode || 'text',
      canPublish,
      isCurrentSpeaker,
      isFreeTalk,
      isHost,
      expiresIn: 7200,
    });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId,
      name: userName || participant?.name || 'مشارك',
      metadata: JSON.stringify({
        avatar: userAvatar || participant?.avatar || '',
        role: participant?.role || 'audience',
        stance: participant?.stance || 'neutral',
      }),
      ttl: 7200, // 2-hour TTL
    });

    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
    });

    const token = await at.toJwt();

    return res.json({
      success: true,
      token,
      wsUrl: LIVEKIT_URL,
      isSimulated: false,
      mode: room.mode || 'text',
      canPublish,
      isCurrentSpeaker,
      isFreeTalk,
      isHost,
      expiresIn: 7200,
    });
  } catch (err: any) {
    console.error("LiveKit token generation failed:", err);
    return res.status(500).json({ success: false, error: "تعذر توليد رمز الاتصال الصوتي" });
  }
});

// 15. LiveKit Webhook (Cost Control & Room End Detection)
app.post("/api/livekit/webhook", express.raw({ type: "*/*" }), async (req: Request, res: Response) => {
  if (!webhookReceiver) {
    return res.status(200).send("Webhook receiver not configured");
  }

  try {
    const authHeader = req.headers.authorization || "";
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : JSON.stringify(req.body);
    const event = await webhookReceiver.receive(rawBody, authHeader);

    const roomId = event.room?.name;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)!;

      // When room finishes or last participant leaves, mark as concluded
      if (event.event === "room_finished" || (event.event === "participant_left" && event.room?.numParticipants === 0)) {
        room.status = "concluded";
        room.endedAt = new Date().toISOString();
        console.log(`[Webhook] Room ${roomId} marked as concluded due to ${event.event}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.warn("LiveKit webhook validation warning:", err);
    res.status(401).send("Invalid webhook signature");
  }
});

// 16. Moderation: Host Mute / Unmute Speaker
app.post("/api/rooms/:id/moderation/mute", async (req: Request, res: Response) => {
  const { userId, targetId, isMuted } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  if (room.hostId !== userId) return res.status(403).json({ success: false, error: "فقط المضيف يملك صلاحية كتم الصوت" });

  const target = room.participants.find(p => p.id === targetId);
  if (!target) return res.status(404).json({ success: false, error: "المتحدث غير موجود" });

  target.isMuted = Boolean(isMuted);
  await syncLiveKitRoomPermissions(room);

  room.messages.push({
    id: "sys-mute-" + Date.now(),
    roomId: room.id,
    senderId: "system",
    senderName: "مشرف المنصة",
    senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    senderRole: "host",
    senderStance: "neutral",
    content: isMuted
      ? `🔇 قام المضيف بكتم ميكروفون المتحدث (${target.name}) مؤقتاً.`
      : `🔊 قام المضيف بإعادة تفعيل ميكروفون المتحدث (${target.name}).`,
    timestamp: new Date().toISOString(),
    type: "system",
    likesCount: 0,
  });

  res.json({ success: true, room });
});

// 17. Moderation: Host Kick & Ban Participant
app.post("/api/rooms/:id/moderation/kick", async (req: Request, res: Response) => {
  const { userId, targetId, reason } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  if (room.hostId !== userId) return res.status(403).json({ success: false, error: "فقط المضيف يملك صلاحية الاستبعاد" });

  const target = room.participants.find(p => p.id === targetId);
  if (!target) return res.status(404).json({ success: false, error: "المشارك غير موجود" });

  if (!room.bannedUserIds) room.bannedUserIds = [];
  room.bannedUserIds.push(targetId);

  room.participants = room.participants.filter(p => p.id !== targetId);

  // If kicked user was current speaker, advance turn
  if (room.currentSpeakerId === targetId) {
    const debaters = room.participants.filter(p => p.role === 'host' || p.role === 'debater');
    room.currentSpeakerId = debaters[0]?.id || null;
    room.turnStartedAt = new Date().toISOString();
    room.speakerLastActiveTimestamp = Date.now();
  }

  if (roomServiceClient) {
    await roomServiceClient.removeParticipant(room.id, targetId).catch(() => {});
  }
  await syncLiveKitRoomPermissions(room);

  room.messages.push({
    id: "sys-kick-" + Date.now(),
    roomId: room.id,
    senderId: "system",
    senderName: "مشرف المنصة",
    senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    senderRole: "host",
    senderStance: "neutral",
    content: `🚫 تم استبعاد وحظر (${target.name}) من الغرفة. السبب: ${reason || 'مخالفة معايير الحوار'}.`,
    timestamp: new Date().toISOString(),
    type: "system",
    likesCount: 0,
  });

  res.json({ success: true, room });
});

// 18. Moderation: Host End Room Instantly
app.post("/api/rooms/:id/moderation/end", async (req: Request, res: Response) => {
  const { userId } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });
  if (room.hostId !== userId) return res.status(403).json({ success: false, error: "فقط المضيف يملك صلاحية إنهاء المناظرة" });

  room.status = 'concluded';
  room.endedAt = new Date().toISOString();

  if (roomServiceClient) {
    await roomServiceClient.deleteRoom(room.id).catch(() => {});
  }

  room.messages.push({
    id: "sys-end-" + Date.now(),
    roomId: room.id,
    senderId: "system",
    senderName: "مشرف المنصة",
    senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    senderRole: "host",
    senderStance: "neutral",
    content: "🏁 أنهى مضيف الغرفة المناظرة رسمياً. نشكر جميع المتحدثين والحضور على مشاركتهم.",
    timestamp: new Date().toISOString(),
    type: "system",
    likesCount: 0,
  });

  res.json({ success: true, room });
});

// 19. Submit Report (Target room or speaker)
app.post("/api/rooms/:id/report", (req: Request, res: Response) => {
  const { reporterId, reporterName, targetId, targetName, targetRole, reason, details } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  const report: ReportItem = {
    id: "rep-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6),
    roomId: room.id,
    roomTitle: room.title,
    reporterId: reporterId || 'anonymous',
    reporterName: reporterName || 'مبلغ مجهول',
    targetId: targetId || room.id,
    targetName: targetName || room.title,
    targetRole: targetRole || 'room',
    reason: reason || 'محتوى غير لائق',
    details: details || '',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  reports.unshift(report);
  if (reports.length > 500) reports.pop();

  res.json({ success: true, reportId: report.id });
});

// 20. Get Reports List (for moderation / admin review)
app.get("/api/moderation/reports", (req: Request, res: Response) => {
  res.json({ success: true, reports });
});

// 21. Heartbeat Ping from Client
app.post("/api/rooms/:id/heartbeat", (req: Request, res: Response) => {
  const { userId } = req.body;
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ success: false, error: "الغرفة غير موجودة" });

  if (room.currentSpeakerId === userId) {
    room.speakerLastActiveTimestamp = Date.now();
  }

  const p = room.participants.find(item => item.id === userId);
  if (p) {
    p.lastPingAt = Date.now();
  }

  res.json({ success: true });
});

// 22. Get Server Configuration (Voice only mode, limits)
app.get("/api/config", (req: Request, res: Response) => {
  res.json({
    success: true,
    voiceOnlyMode: VOICE_ONLY_MODE,
    maxAudience: VOICE_ROOM_MAX_AUDIENCE,
    maxDurationMinutes: VOICE_ROOM_MAX_DURATION_MINUTES,
    hasLiveKit: Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET),
  });
});

// 23. Admin View: List Active Voice Rooms
app.get("/api/admin/voice-rooms", (req: Request, res: Response) => {
  const voiceRooms = Array.from(rooms.values())
    .filter(r => r.mode === 'voice')
    .map(r => ({
      id: r.id,
      title: r.title,
      mode: r.mode,
      hostName: r.hostName,
      currentDebatersCount: r.participants.filter(p => p.role === 'host' || p.role === 'debater').length,
      maxDebaters: r.maxDebaters,
      spectatorsCount: r.spectatorsCount,
      status: r.status,
      createdAt: r.createdAt,
      durationMinutes: Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000),
      isFreeTalk: Boolean(r.freeTalk),
    }));

  res.json({ success: true, voiceRooms, total: voiceRooms.length });
});

// Scheduled Background Cost Control Job (Runs every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status !== 'active') continue;

    // Check max duration limit (default 120 minutes)
    const createdAtMs = new Date(room.createdAt).getTime();
    const durationMinutes = (now - createdAtMs) / (1000 * 60);
    const maxDuration = room.maxDurationMinutes || VOICE_ROOM_MAX_DURATION_MINUTES;

    if (durationMinutes >= maxDuration) {
      room.status = 'concluded';
      room.endedAt = new Date().toISOString();
      room.messages.push({
        id: "sys-max-duration-" + Date.now(),
        roomId: room.id,
        senderId: "system",
        senderName: "نظام المنصة",
        senderAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        senderRole: "host",
        senderStance: "neutral",
        content: `⏱️ انتهت المناظرة تلقائياً لبلوغ الحد الأقصى للمدة المسموحة (${maxDuration} دقيقة). نشكر جميع المشاركين والمتابعين.`,
        timestamp: new Date().toISOString(),
        type: "system",
        likesCount: 0
      });
      console.log(`[CostControl] Concluded voice room ${room.id} after ${Math.round(durationMinutes)} mins`);
    }
  }
}, 60000);

// Vite Middleware for Development / Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Munazara Server running on http://localhost:${PORT}`);
  });
}

startServer();
