import { DebateRoom, SavedDebate } from '../types';
export type { SavedDebate };

const STORAGE_KEY = 'munazara_saved_debates_v1';

export const getSavedDebates = (): SavedDebate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved debates:', err);
    return [];
  }
};

export const isDebateSaved = (roomId: string): boolean => {
  const list = getSavedDebates();
  return list.some(item => item.roomId === roomId);
};

export const saveDebateToLibrary = (room: DebateRoom): { saved: boolean; total: number } => {
  try {
    const list = getSavedDebates();
    const existingIndex = list.findIndex(item => item.roomId === room.id);

    const savedItem: SavedDebate = {
      id: 'saved-' + room.id,
      roomId: room.id,
      title: room.title,
      description: room.description,
      category: room.category,
      roomType: room.roomType,
      maxDebaters: room.maxDebaters,
      savedAt: new Date().toISOString(),
      hostName: room.hostName,
      hostAvatar: room.hostAvatar,
      participants: room.participants || [],
      messages: room.messages || [],
      audienceQuestionsCount: room.audienceQuestions?.length || 0,
      proVotes: room.proVotes || 0,
      conVotes: room.conVotes || 0,
      neutralVotes: room.neutralVotes || 0,
      tags: room.tags || [],
      aiRefereeVerdict: room.aiRefereeVerdict,
    };

    if (existingIndex >= 0) {
      // update existing
      list[existingIndex] = savedItem;
    } else {
      // add to top
      list.unshift(savedItem);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return { saved: true, total: list.length };
  } catch (err) {
    console.error('Failed to save debate to library:', err);
    return { saved: false, total: 0 };
  }
};

export const removeDebateFromLibrary = (roomId: string): { removed: boolean; total: number } => {
  try {
    const list = getSavedDebates().filter(item => item.roomId !== roomId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return { removed: true, total: list.length };
  } catch (err) {
    console.error('Failed to remove debate from library:', err);
    return { removed: false, total: 0 };
  }
};

export const generateDebateMarkdown = (debate: SavedDebate): string => {
  const totalVotes = debate.proVotes + debate.conVotes + debate.neutralVotes;
  const proPct = totalVotes > 0 ? Math.round((debate.proVotes / totalVotes) * 100) : 0;
  const conPct = totalVotes > 0 ? Math.round((debate.conVotes / totalVotes) * 100) : 0;
  const neuPct = totalVotes > 0 ? Math.round((debate.neutralVotes / totalVotes) * 100) : 0;

  const dateStr = new Date(debate.savedAt).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# تقرير وسجل مناظرة: ${debate.title}\n\n`;
  md += `> **تاريخ الحفظ والتوثيق:** ${dateStr}  \n`;
  md += `> **التصنيف:** ${debate.category} | **النوع:** ${debate.roomType === 'solo' ? 'عرض منفرد' : debate.roomType === '1v1' ? 'مناظرة ثنائية (1 ضد 1)' : `حلقة نقاش (${debate.maxDebaters} مقاعد)`}  \n`;
  md += `> **المضيف:** ${debate.hostName}  \n\n`;

  md += `## سياق ومحاور القضية\n`;
  md += `${debate.description}\n\n`;

  md += `## المتحدثون على المنصة\n`;
  debate.participants.forEach(p => {
    const stanceAr = p.stance === 'pro' ? 'مؤيد' : p.stance === 'con' ? 'معارض' : 'محايد';
    md += `- **${p.name}** (${p.handle}) — الموقف: *${stanceAr}* (${p.role === 'host' ? 'المضيف' : 'متناظر'})\n`;
  });
  md += `\n`;

  md += `## نتيجة تصويت الجمهور\n`;
  md += `- **التأييد:** ${debate.proVotes} صوت (${proPct}%)\n`;
  md += `- **المعارضة:** ${debate.conVotes} صوت (${conPct}%)\n`;
  md += `- **الحياد:** ${debate.neutralVotes} صوت (${neuPct}%)\n\n`;

  if (debate.aiRefereeVerdict) {
    md += `## تحليل وحكم مساعد التحكيم الذكي\n`;
    md += `**الملخص والتقييم:**\n${debate.aiRefereeVerdict.summary}\n\n`;
    md += `- **درجة قوة التأييد:** ${debate.aiRefereeVerdict.proScore}/100\n`;
    md += `- **درجة قوة المعارضة:** ${debate.aiRefereeVerdict.conScore}/100\n`;
    if (debate.aiRefereeVerdict.recommendedWinner) {
      md += `- **الطرف الأقرب للحجة الأقوى:** ${debate.aiRefereeVerdict.recommendedWinner}\n\n`;
    }

    if (debate.aiRefereeVerdict.keyPointsPro?.length > 0) {
      md += `### أبرز نقاط التأييد:\n`;
      debate.aiRefereeVerdict.keyPointsPro.forEach(pt => {
        md += `- ${pt}\n`;
      });
      md += `\n`;
    }

    if (debate.aiRefereeVerdict.keyPointsCon?.length > 0) {
      md += `### أبرز نقاط المعارضة:\n`;
      debate.aiRefereeVerdict.keyPointsCon.forEach(pt => {
        md += `- ${pt}\n`;
      });
      md += `\n`;
    }

    if (debate.aiRefereeVerdict.detectedFallacies?.length > 0) {
      md += `### المغالطات المنطقية المرصودة:\n`;
      debate.aiRefereeVerdict.detectedFallacies.forEach(f => {
        md += `- **${f.debaterName}** (${f.fallacyType}): ${f.explanation}\n`;
      });
      md += `\n`;
    }
  }

  md += `## السجل الكامل للمداخلات والحجج (${debate.messages.length} مداخلة)\n\n`;
  debate.messages.forEach((msg, idx) => {
    const stanceAr = msg.senderStance === 'pro' ? 'مؤيد' : msg.senderStance === 'con' ? 'معارض' : 'محايد';
    const typeAr = msg.type === 'rebuttal' ? 'تفنيد ودحض' : msg.type === 'poi' ? 'نقطة نظام' : msg.type === 'ruling' ? 'حكم' : 'حجة رئيسية';
    const time = new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    md += `### ${idx + 1}. [${typeAr}] ${msg.senderName} (${stanceAr}) - ${time}\n`;
    if (msg.replyTo) {
      md += `> *رداً على ${msg.replyTo.senderName}:* "${msg.replyTo.snippet}"\n\n`;
    }
    md += `${msg.content}\n\n`;
    if (msg.citedSource) {
      md += `📎 **المصدر المستشهد به:** ${msg.citedSource}\n\n`;
    }
    md += `---\n\n`;
  });

  md += `\n*تم إنشاء هذا السجل عبر منصة مُناظرة للحوارات الفكرية.*`;
  return md;
};

export const downloadTextFile = (content: string, filename: string, mimeType = 'text/markdown;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
