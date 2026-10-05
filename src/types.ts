export type Role = 'assistant' | 'user' | 'system';

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  base64Data?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  isWidget?: boolean;
  widgetType?: 'slider' | 'genre_select' | 'yes_no';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  isAutoNamed?: boolean;
}

export type DialogueStep =
  | 'auth'
  | 'name'
  | 'age'
  | 'country'
  | 'ever_watched'
  | 'anime_choice'
  | 'fav_char'
  | 'anime_type'
  | 'number_anime'
  | 'when_started'
  | 'rating'
  | 'more_questions'
  | 'open_chat'
  | 'done';

export interface UserSessionData {
  name: string;
  age: number | null;
  country: string;
  watchedAnime: boolean | null;
  selectedAnime: string;
  favoriteCharacter: string;
  animeType: string;
  numberWatched: string;
  whenStarted: string;
  rating: number;
}
