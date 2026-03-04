import { MessageCircle, X } from 'lucide-react';

interface ChatToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ isOpen, onClick }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
      style={{
        backgroundColor: '#3B82F6',
        color: '#ffffff',
      }}
      title={isOpen ? '채팅 닫기' : 'AI 가이드'}
    >
      {isOpen ? (
        <X className="w-5 h-5" />
      ) : (
        <MessageCircle className="w-5 h-5" />
      )}
    </button>
  );
}
