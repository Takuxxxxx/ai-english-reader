export interface Topic {
  id: number;
  name: string;
  displayOrder: number;
  enabled: number;
  unreadCount: number;
  latestTitle: string | null;
}

export interface Article {
  id: number;
  topicId: number;
  topic: string;
  title: string;
  body: string[];
  wordCount: number;
  level: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  isNew: boolean;
}

export interface SettingsState {
  articleLength: string;
  difficulty: string;
  fontSize: string;
  theme: string;
  [key: string]: string;
}
