export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar',
  RUSSIAN = 'ru',
  PORTUGUESE = 'pt',
  ITALIAN = 'it',
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.ENGLISH]: 'English',
  [Language.HINDI]: 'हिन्दी (Hindi)',
  [Language.SPANISH]: 'Español (Spanish)',
  [Language.FRENCH]: 'Français (French)',
  [Language.GERMAN]: 'Deutsch (German)',
  [Language.CHINESE]: '中文 (Chinese)',
  [Language.JAPANESE]: '日本語 (Japanese)',
  [Language.KOREAN]: '한국어 (Korean)',
  [Language.ARABIC]: 'العربية (Arabic)',
  [Language.RUSSIAN]: 'Русский (Russian)',
  [Language.PORTUGUESE]: 'Português (Portuguese)',
  [Language.ITALIAN]: 'Italiano (Italian)',
};

export interface Participant {
  id: string;
  userName: string;
  preferredLanguage: Language;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  stream?: MediaStream;
}

export interface TranslatedMessage {
  originalText: string;
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface RoomState {
  roomId: string | null;
  userId: string | null;
  userName: string | null;
  preferredLanguage: Language;
  participants: Map<string, Participant>;
  messages: TranslatedMessage[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
}
