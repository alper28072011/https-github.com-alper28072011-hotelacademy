export type LanguageCode = 'en' | 'tr' | 'ru' | 'de' | 'id' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string; // Emoji flag for simplicity
  dir: 'ltr' | 'rtl';
}

export interface UserState {
  isAuthenticated: boolean;
  user: {
    uid: string;
    displayName: string;
    role: 'staff' | 'manager' | 'admin';
  } | null;
}