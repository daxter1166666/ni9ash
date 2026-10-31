import { DebaterScratchpad, QuickPoint } from '../types';

export const FALLACY_TEMPLATES = [
  {
    id: 'strawman',
    title: 'رجل القش (تحريف الحجة)',
    titleEn: 'Straw Man',
    emoji: '🌾',
    prefix: '[كشف مغالطة: رجل القش 🌾]\nتم تحريف حجتي الأساسية وتقديم نموذج مشوه لم أطرحه أصلاً. الحجة الحقيقية التي طرحتها هي: ',
    prefixEn: '[Fallacy: Straw Man 🌾]\nMy core argument has been distorted into a weaker version I never claimed. The real point is: ',
  },
  {
    id: 'adhominem',
    title: 'الشخصنة (مهاجمة القائل)',
    titleEn: 'Ad Hominem',
    emoji: '👤',
    prefix: '[كشف مغالطة: الشخصنة 👤]\nالهجوم على شخص المتحدث أو دوافعه بدلاً من مناقشة جوهر الفكرة المعروضة لا يبطل صحة الحجة. فلنعد لصلب القضية: ',
    prefixEn: '[Fallacy: Ad Hominem 👤]\nAttacking the speaker personally rather than dismantling the factual proposition is irrelevant. Let us refocus on the core thesis: ',
  },
  {
    id: 'slippery',
    title: 'المنحدر الزلق',
    titleEn: 'Slippery Slope',
    emoji: '⛷️',
    prefix: '[كشف مغالطة: المنحدر الزلق ⛷️]\nالادعاء بأن هذه الخطوة ستقود حتماً إلى سلسلة عواقب كارثية هو تهويل غير مبرر يفتقر للرابط السببي. في الواقع: ',
    prefixEn: '[Fallacy: Slippery Slope ⛷️]\nClaiming this step inevitably triggers a chain of catastrophic extremes is an unsubstantiated leap lacking causal evidence. In reality: ',
  },
  {
    id: 'authority',
    title: 'الاحتكام الخاطئ للسلطة',
    titleEn: 'Appeal to Authority',
    emoji: '🏛️',
    prefix: '[كشف مغالطة: الاحتكام الزائف للسلطة 🏛️]\nذكر اسم أو جهة دون تقديم البيانات والمنهجية العلمية التي اعتمدت عليها لا يشكل برهاناً كافياً. الأرقام الحقيقية تثبت: ',
    prefixEn: '[Fallacy: False Authority 🏛️]\nCiting an authority figure without presenting verifiable data or empirical methodology does not validate the claim. Verified metrics demonstrate: ',
  },
  {
    id: 'generalization',
    title: 'التعميم المتسرع',
    titleEn: 'Hasty Generalization',
    emoji: '🌐',
    prefix: '[كشف مغالطة: التعميم المتسرع 🌐]\nالاعتماد على أمثلة فردية شاذة لتعميم حكم مطلق على الحالة العامة هو استنتاج معيب إحصائياً ومنطقياً. والدليل هو: ',
    prefixEn: '[Fallacy: Hasty Generalization 🌐]\nRelying on isolated anecdotal cases to extrapolate an absolute generalization is statistically flawed. Verified broader evidence reveals: ',
  },
  {
    id: 'evidence',
    title: 'طلب البرهان الإحصائي',
    titleEn: 'Demand for Evidence',
    emoji: '📊',
    prefix: '[طلب إثبات وتوثيق 📊]\nهذا ادعاء يحتاج إلى إسناد إحصائي موثق ومصدر معتمد. أين البيانات الملموسة التي تدعم هذا الطرح؟ ',
    prefixEn: '[Call for Evidence 📊]\nThis assertion requires verified empirical backing and documented references. Where is the peer-reviewed data supporting this proposition? ',
  },
];

const getStorageKey = (roomId: string, userId: string) => `munazara_draft_${roomId}_${userId}`;

export const getInitialScratchpad = (roomId: string, userId: string): DebaterScratchpad => {
  try {
    const raw = localStorage.getItem(getStorageKey(roomId, userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        draftText: parsed.draftText || '',
        quickPoints: Array.isArray(parsed.quickPoints) ? parsed.quickPoints : [],
        citedSourceDraft: parsed.citedSourceDraft || '',
        isReadyToFire: Boolean(parsed.isReadyToFire),
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Failed to parse scratchpad from storage:', e);
  }

  return {
    draftText: '',
    quickPoints: [],
    citedSourceDraft: '',
    isReadyToFire: false,
    lastUpdated: new Date().toISOString(),
  };
};

export const saveScratchpad = (roomId: string, userId: string, pad: DebaterScratchpad): void => {
  try {
    const updated = {
      ...pad,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(getStorageKey(roomId, userId), JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save scratchpad:', e);
  }
};

export const clearScratchpad = (roomId: string, userId: string): void => {
  try {
    localStorage.removeItem(getStorageKey(roomId, userId));
  } catch (e) {
    console.error('Failed to clear scratchpad:', e);
  }
};

// Calculate word count and estimated reading time in seconds
export const calculateSpeechStats = (text: string): { words: number; estimatedSeconds: number; characters: number } => {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Average speaking pace in live debates: ~130-140 words per minute (around 2.2 words per second)
  const estimatedSeconds = Math.max(0, Math.round((words / 130) * 60));
  return { words, estimatedSeconds, characters };
};

// Pre-packaged rhetorical argument enhancements
export const generateSmartRefutationIdeas = (topic: string, isPro: boolean): string[] => {
  if (isPro) {
    return [
      `التركيز على الفوائد المستقبلية والجدوى المستدامة لموضوع "${topic}" ومقارنتها بتكلفة الجمود.`,
      `تفنيد مخاوف الطرف المعارض عبر الاستشهاد بتجارب دولية وواقعية أثبتت نجاح تطبيق هذا التوجه.`,
      `طرح سؤال محرج للخصم: ما هو البديل العملي والملموس الذي يقدمه لحل هذه المعضلة بديلاً عما نطرحه؟`,
    ];
  } else {
    return [
      `إبراز الثغرات التنفيذية والآثار الجانبية غير المحسوبة في طرح "${topic}".`,
      `التأكيد على أن النوايا الحسنة لا تكفي دون ضمانات عملية وجدوى اقتصادية واجتماعية ملموسة.`,
      `تفكيك حجة الخصم عبر إظهار أن الأدلة التي استند إليها مجرد حالات خاصة لا تقبل التعميم.`,
    ];
  }
};
