import React, { useState, useEffect, useCallback } from 'react';
import { DebateRoom, DebateMessage, UserProfile, Stance, ArgumentType } from './types';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { DebateRoomArena } from './components/DebateRoomArena';
import { CreateRoomModal } from './components/CreateRoomModal';
import { UserProfileModal } from './components/UserProfileModal';
import { SavedLibraryModal } from './components/SavedLibraryModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { AdminVoiceRoomsModal } from './components/AdminVoiceRoomsModal';
import { AuthModal } from './components/AuthModal';
import { playGavelStrike, playBellChime } from './utils/soundEffects';
import {
  SavedDebate,
  getSavedDebates,
  saveDebateToLibrary,
  removeDebateFromLibrary,
  isDebateSaved,
} from './utils/savedLibrary';

// Default User Profile
const INITIAL_USER: UserProfile = {
  id: 'user-guest-' + Math.random().toString(36).substring(2, 7),
  name: 'عضو مُناظِر',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  handle: '@debater_' + Math.random().toString(36).substring(2, 6),
  bio: 'مشارك شغوف بالفكر والمناظرات المنطقية',
  debatesCount: 6,
  winsCount: 4,
  audienceVotesReceived: 48,
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('munazara_user');
      return saved ? JSON.parse(saved) : INITIAL_USER;
    } catch {
      return INITIAL_USER;
    }
  });

  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<DebateRoom | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isAdminVoiceModalOpen, setIsAdminVoiceModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Saved debates state
  const [savedDebates, setSavedDebates] = useState<SavedDebate[]>(() => getSavedDebates());

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // AI states
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Reload saved debates
  const refreshSavedDebates = () => {
    setSavedDebates(getSavedDebates());
  };

  // Toggle save debate to library
  const handleToggleSaveDebate = (roomToSave: DebateRoom) => {
    if (isDebateSaved(roomToSave.id)) {
      removeDebateFromLibrary(roomToSave.id);
    } else {
      saveDebateToLibrary(roomToSave);
    }
    refreshSavedDebates();
  };

  const handleDeleteSavedDebate = (roomId: string) => {
    removeDebateFromLibrary(roomId);
    refreshSavedDebates();
  };

  const handleOpenSavedDebateLive = (roomId: string) => {
    const liveMatch = rooms.find((r) => r.id === roomId);
    if (liveMatch) {
      handleJoinRoom(roomId, 'audience');
      setIsLibraryModalOpen(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = (updated: UserProfile) => {
    setCurrentUser(updated);
    try {
      localStorage.setItem('munazara_user', JSON.stringify(updated));
    } catch {}
  };

  // Fetch all rooms from API
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.warn('Error fetching rooms:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  // Fetch single room details
  const fetchRoomDetails = useCallback(async (roomId: string) => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return;
      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);
      }
    } catch (err) {
      console.warn('Error fetching room details:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Live polling for current active debate room
  useEffect(() => {
    if (!currentRoomId) return;

    fetchRoomDetails(currentRoomId);
    const interval = setInterval(() => {
      fetchRoomDetails(currentRoomId);
    }, 2500);

    return () => clearInterval(interval);
  }, [currentRoomId, fetchRoomDetails]);

  // 1. Join Room (automatic debater seat assignment if slots open or audience role)
  const handleJoinRoom = async (roomId: string, requestedRole: 'debater' | 'audience') => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userHandle: currentUser.handle,
          requestedRole,
          stance: 'pro',
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {}
      }

      if (!res.ok) {
        if (data?.error) alert(data.error);
        return;
      }

      if (data && data.success) {
        setCurrentRoomId(roomId);
        setCurrentRoom(data.room);
        playGavelStrike();
      }
    } catch (err) {
      console.warn('Error joining room:', err);
    }
  };

  // 2. Create Room
  const handleCreateRoom = async (roomData: {
    title: string;
    description: string;
    category: any;
    maxDebaters: number;
    turnDurationSec: number;
    hostStance: Stance;
    tags: string[];
    mode?: 'text' | 'voice';
    freeTalk?: boolean;
  }) => {
    setIsCreatingRoom(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roomData,
          hostId: currentUser.id,
          hostName: currentUser.name,
          hostAvatar: currentUser.avatar,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setIsCreateModalOpen(false);
        await fetchRooms();
        setCurrentRoomId(data.room.id);
        setCurrentRoom(data.room);
        playGavelStrike();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Error creating room:', err);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Moderation: Mute Participant
  const handleHostMute = async (targetId: string, isMuted: boolean) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/moderation/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: currentUser.id,
          targetParticipantId: targetId,
          isMuted,
        }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error muting participant:', err);
    }
  };

  // Moderation: Kick Participant
  const handleHostKick = async (targetId: string, reason?: string) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/moderation/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: currentUser.id,
          targetParticipantId: targetId,
          reason,
        }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error kicking participant:', err);
    }
  };

  // Moderation: End Room
  const handleHostEndRoom = async () => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/moderation/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorId: currentUser.id,
        }),
      });
      setCurrentRoomId(null);
      setCurrentRoom(null);
      fetchRooms();
    } catch (err) {
      console.error('Error ending room:', err);
    }
  };

  // Moderation: Submit Safety Report
  const handleSubmitReport = async (reportData: {
    targetId: string;
    targetName: string;
    targetRole: string;
    reason: string;
    details: string;
  }) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          ...reportData,
        }),
      });
    } catch (err) {
      console.error('Error submitting report:', err);
    }
  };

  // 3. Send Message as Debater
  const handleSendMessage = async (data: {
    content: string;
    type: ArgumentType;
    stance: Stance;
    citedSource?: string;
  }) => {
    if (!currentRoomId) return;
    try {
      const res = await fetch(`/api/rooms/${currentRoomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          senderRole: 'debater',
          senderStance: data.stance,
          content: data.content,
          type: data.type,
          citedSource: data.citedSource,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        fetchRoomDetails(currentRoomId);
        playGavelStrike();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // 4. Send Audience Message
  const handleSendAudienceMessage = async (content: string) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/audience-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          content,
        }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error sending audience message:', err);
    }
  };

  // 5. Submit Audience Question
  const handleSubmitQuestion = async (question: string) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          question,
        }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error submitting question:', err);
    }
  };

  // 6. Upvote Question
  const handleUpvoteQuestion = async (qId: string) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/questions/${qId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error upvoting question:', err);
    }
  };

  // 7. Vote Stance (Pro / Con)
  const handleVoteStance = async (stance: Stance) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, stance }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error voting stance:', err);
    }
  };

  // 8. Join As Debater from vacant seat
  const handleJoinAsDebater = async (stance: Stance) => {
    if (!currentRoomId) return;
    await handleJoinRoom(currentRoomId, 'debater');
  };

  // 9. Step Down from Stage
  const handleStepDown = async () => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/step-down`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      fetchRoomDetails(currentRoomId);
    } catch (err) {
      console.error('Error stepping down:', err);
    }
  };

  // 10. Next Speaker Turn (Automatic or Manual Speaker End-Turn)
  const handleNextTurn = async (options?: { manualPass?: boolean; speakerName?: string }) => {
    if (!currentRoomId) return;
    try {
      await fetch(`/api/rooms/${currentRoomId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualPass: options?.manualPass || false,
          speakerName: options?.speakerName || currentUser.name,
        }),
      });
      fetchRoomDetails(currentRoomId);
      playBellChime();
    } catch (err) {
      console.error('Error passing turn:', err);
    }
  };

  // 11. Request AI Debate Referee (Gemini API)
  const handleRequestAIReferee = async () => {
    if (!currentRoomId) return;
    setIsAnalyzingAI(true);
    try {
      const res = await fetch('/api/gemini/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: currentRoomId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRoomDetails(currentRoomId);
        playGavelStrike();
      }
    } catch (err) {
      console.error('Error requesting AI referee:', err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // 12. Generate AI Argument Inspiration
  const handleGenerateAIInspiration = async () => {
    if (!currentRoom) return;
    setIsGeneratingAI(true);
    try {
      const lastMsg = currentRoom.messages[currentRoom.messages.length - 1];
      const res = await fetch('/api/gemini/counter-argument', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: currentRoom.title,
          messageContent: lastMsg ? lastMsg.content : currentRoom.description,
          targetStance: 'con',
        }),
      });
      const data = await res.json();
      if (data.success && data.counterArgument) {
        alert(`💡 إلهام حجة من الذكاء الاصطناعي:\n\n${data.counterArgument}`);
      }
    } catch (err) {
      console.error('Error generating counter-argument:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* PWA Promotion & Install Banner */}
      <PwaInstallBanner />

      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenLibrary={() => setIsLibraryModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        savedDebatesCount={savedDebates.length}
        onBackToLobby={() => {
          setCurrentRoomId(null);
          setCurrentRoom(null);
          fetchRooms();
        }}
        isInRoom={!!currentRoomId && !!currentRoom}
        totalActiveRooms={rooms.length}
        totalDebaters={rooms.reduce((acc, r) => acc + (r.currentDebatersCount || 0), 0)}
        totalSpectators={rooms.reduce((acc, r) => acc + (r.spectatorsCount || 0), 0)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentRoomId && currentRoom ? (
          <DebateRoomArena
            room={currentRoom}
            currentUser={currentUser}
            onBackToLobby={() => {
              setCurrentRoomId(null);
              setCurrentRoom(null);
              fetchRooms();
            }}
            onSendMessage={handleSendMessage}
            onSendAudienceMessage={handleSendAudienceMessage}
            onSubmitQuestion={handleSubmitQuestion}
            onUpvoteQuestion={handleUpvoteQuestion}
            onVoteStance={handleVoteStance}
            onJoinAsDebater={handleJoinAsDebater}
            onStepDown={handleStepDown}
            onNextTurn={handleNextTurn}
            onRequestAIReferee={handleRequestAIReferee}
            isAnalyzingAI={isAnalyzingAI}
            onGenerateAIInspiration={handleGenerateAIInspiration}
            isGeneratingAI={isGeneratingAI}
            isSaved={currentRoom ? isDebateSaved(currentRoom.id) : false}
            onToggleSaveDebate={handleToggleSaveDebate}
            onOpenLibrary={() => setIsLibraryModalOpen(true)}
            onHostMuteParticipant={handleHostMute}
            onHostKickParticipant={handleHostKick}
            onHostEndRoom={handleHostEndRoom}
            onSubmitReport={handleSubmitReport}
          />
        ) : (
          <LobbyView
            rooms={rooms}
            onJoinRoom={handleJoinRoom}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onOpenAdminVoice={() => setIsAdminVoiceModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} مُـناظَـرة — منصة غرف النقاش والمناظرات الحية.</p>
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span>مقاعد محددة للمتحدثين</span>
            <span>•</span>
            <span>تفاعل حي للجمهور</span>
            <span>•</span>
            <span>تحكيم ذكي بالذكاء الاصطناعي</span>
          </div>
        </div>
      </footer>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        isCreating={isCreatingRoom}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
      />

      {/* Saved Debates Library Modal */}
      <SavedLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        savedDebates={savedDebates}
        onRemoveDebate={handleDeleteSavedDebate}
        onOpenLiveRoom={handleOpenSavedDebateLive}
      />

      {/* Admin Voice Monitor Modal */}
      <AdminVoiceRoomsModal
        isOpen={isAdminVoiceModalOpen}
        onClose={() => setIsAdminVoiceModalOpen(false)}
        onSelectRoom={(roomId) => {
          setIsAdminVoiceModalOpen(false);
          handleJoinRoom(roomId, 'audience');
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user, pin) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('munazara_user', JSON.stringify(user));
          } catch {}
          setIsAuthModalOpen(false);
          alert(`مرحباً بك ${user.name}! تم تسجيل دخولك بنجاح برمزك السري (${pin}).`);
        }}
      />
    </div>
  );
}
