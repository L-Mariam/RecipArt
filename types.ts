export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Comment {
  id: string;
  user: string;
  userId: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  receiptId: string;
  parentId?: string;
  replies?: Comment[];
}

export interface GuessRecord {
  id: string;
  userId: string;
  receiptId: string;
  guessAmount: number;
  actualAmount: number;
  isCorrect: boolean; // within 5% margin
  timestamp: number;
}

export interface UserStats {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
}

export interface Receipt {
  id: string;
  creatorId?: string;
  title: string;
  description: string;
  artist: string;
  year: string;
  medium: string;
  location?: string;
  isLocationPrivate?: boolean;
  artUrl: string;
  billOriginalUrl: string;
  billSensitiveUrl: string;
  billBlurredUrl: string;
  items: ReceiptItem[];
  total: number;
  createdAt: number;
  comments: Comment[];
}

export interface ReceiptFormData {
  title: string;
  description: string;
  artist: string;
  year: string;
  medium: string;
  location: string;
  isLocationPrivate: boolean;
  artFile: File | null;
  billFile: File | null;
  billSensitiveBlob: Blob | null;
  billBlurredBlob: Blob | null;
  items: ReceiptItem[];
  total: number;
  creatorId?: string;
}