import { db, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, arrayUnion, query, where, limit, orderBy, setDoc, increment } from 'firebase/firestore';
import { Receipt, ReceiptFormData, Comment, GuessRecord, UserStats } from '../types';
import { MOCK_RECEIPTS } from '../data/mockData';

const COLLECTION_NAME = 'receipts';
const GUESSES_COLLECTION = 'guesses';
const STATS_COLLECTION = 'userStats';
let firebaseFailed = false;
let mockStore = [...MOCK_RECEIPTS];
let mockGuesses: GuessRecord[] = [];
let mockStats: UserStats[] = [];

/**
 * Deep copy a comment and its replies recursively to ensure no reference sharing.
 */
const deepCopyComment = (c: Comment): Comment => ({
  ...c,
  replies: c.replies ? c.replies.map(deepCopyComment) : []
});

/**
 * Deep copy a receipt and all its nested properties.
 */
const deepCopy = (receipt: Receipt): Receipt => ({
  ...receipt,
  items: [...receipt.items],
  comments: (receipt.comments || []).map(deepCopyComment)
});

export const recordGuess = async (guess: Omit<GuessRecord, 'id' | 'timestamp'>): Promise<void> => {
  const newGuess: GuessRecord = {
    ...guess,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  };

  if (!db || firebaseFailed || localStorage.getItem('isMockSession') === 'true') {
    mockGuesses.push(newGuess);
    let stats = mockStats.find(s => s.uid === guess.userId);
    if (!stats) {
      stats = { uid: guess.userId, displayName: 'User', totalGuesses: 0, correctGuesses: 0, accuracy: 0 };
      mockStats.push(stats);
    }
    stats.totalGuesses++;
    if (guess.isCorrect) stats.correctGuesses++;
    stats.accuracy = (stats.correctGuesses / stats.totalGuesses) * 100;
    return;
  }

  try {
    await addDoc(collection(db, GUESSES_COLLECTION), newGuess);
    const statsRef = doc(db, STATS_COLLECTION, guess.userId);
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      const total = data.totalGuesses + 1;
      const correct = data.correctGuesses + (guess.isCorrect ? 1 : 0);
      await updateDoc(statsRef, {
        totalGuesses: total,
        correctGuesses: correct,
        accuracy: (correct / total) * 100
      });
    } else {
      await setDoc(statsRef, {
        uid: guess.userId,
        totalGuesses: 1,
        correctGuesses: guess.isCorrect ? 1 : 0,
        accuracy: guess.isCorrect ? 100 : 0
      });
    }
  } catch (e) {
    console.error("Failed to record guess", e);
  }
};

export const getLeaderboard = async (): Promise<UserStats[]> => {
  if (!db || firebaseFailed || localStorage.getItem('isMockSession') === 'true') {
    return [...mockStats].sort((a, b) => b.accuracy - a.accuracy || b.correctGuesses - a.correctGuesses);
  }
  try {
    const q = query(collection(db, STATS_COLLECTION), orderBy('accuracy', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserStats);
  } catch (e) {
    return [];
  }
};

export const getUserGuesses = async (userId: string): Promise<GuessRecord[]> => {
  if (!db || firebaseFailed || localStorage.getItem('isMockSession') === 'true') {
    return mockGuesses.filter(g => g.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  }
  try {
    const q = query(collection(db, GUESSES_COLLECTION), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GuessRecord);
  } catch (e) {
    return [];
  }
};

export const getAllReceipts = async (): Promise<Receipt[]> => {
  const isMockSession = localStorage.getItem('isMockSession') === 'true';
  if (!db || firebaseFailed || isMockSession) return Promise.resolve(mockStore.map(deepCopy));
  try {
    const fetchPromise = getDocs(query(collection(db, COLLECTION_NAME), limit(50)));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
    const querySnapshot: any = await Promise.race([fetchPromise, timeoutPromise]);
    const remoteData = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Receipt));
    // Ensure deep copy for local store items as well
    const localOnly = mockStore
      .filter(ls => !remoteData.find((rs: Receipt) => rs.id === ls.id))
      .map(deepCopy);
    return [...localOnly, ...remoteData];
  } catch (error) {
    firebaseFailed = true; 
    return mockStore.map(deepCopy);
  }
};

export const uploadReceipt = async (data: ReceiptFormData): Promise<string> => {
  const newId = Date.now().toString();
  const isMockUser = data.creatorId?.startsWith('mock-user-');
  const isMockSession = localStorage.getItem('isMockSession') === 'true';
  
  const baseData = {
    creatorId: data.creatorId,
    title: data.title,
    description: data.description,
    artist: data.artist || 'Anonymous',
    year: data.year || new Date().getFullYear().toString(),
    medium: data.medium || 'Ink on Paper',
    location: data.location,
    isLocationPrivate: data.isLocationPrivate,
    items: data.items,
    total: data.total,
    createdAt: Date.now(),
    comments: []
  };

  if (!db || !storage || isMockUser || firebaseFailed || isMockSession) {
    const newReceipt: Receipt = {
      ...baseData,
      id: newId,
      artUrl: data.artFile ? URL.createObjectURL(data.artFile) : '',
      billOriginalUrl: data.billFile ? URL.createObjectURL(data.billFile) : '',
      billSensitiveUrl: data.billSensitiveBlob ? URL.createObjectURL(data.billSensitiveBlob) : '',
      billBlurredUrl: data.billBlurredBlob ? URL.createObjectURL(data.billBlurredBlob) : '',
    };
    mockStore.unshift(newReceipt);
    return newId;
  }
  try {
    const metadata = { cacheControl: 'public, max-age=31536000, immutable' };
    const uploadAndGetUrl = async (path: string, blob: Blob | File) => {
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, blob, metadata);
      return await getDownloadURL(fileRef);
    };
    
    const [artUrl, billUrl, sensitiveUrl, blurredUrl] = await Promise.all([
      data.artFile ? uploadAndGetUrl(`receipts/${newId}/art.jpg`, data.artFile) : Promise.resolve(''),
      data.billFile ? uploadAndGetUrl(`receipts/${newId}/bill_original.jpg`, data.billFile) : Promise.resolve(''),
      data.billSensitiveBlob ? uploadAndGetUrl(`receipts/${newId}/bill_sensitive.png`, data.billSensitiveBlob) : Promise.resolve(''),
      data.billBlurredBlob ? uploadAndGetUrl(`receipts/${newId}/bill_blurred.png`, data.billBlurredBlob) : Promise.resolve(''),
    ]);

    const receiptData = {
      ...baseData,
      artUrl,
      billOriginalUrl: billUrl,
      billSensitiveUrl: sensitiveUrl,
      billBlurredUrl: blurredUrl,
    };
    const docRef = await addDoc(collection(db, COLLECTION_NAME), receiptData);
    return docRef.id;
  } catch (error) {
    return uploadReceipt({ ...data, creatorId: 'mock-user-fallback' });
  }
};

export const deleteReceipt = async (id: string): Promise<void> => {
  mockStore = mockStore.filter(r => r.id !== id);
  if (!db || firebaseFailed || localStorage.getItem('isMockSession') === 'true') return;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    if (storage) {
        const deleteFileIfExist = async (fileName: string) => {
            try {
                await deleteObject(ref(storage, `receipts/${id}/${fileName}`));
            } catch (e) {}
        };
        await Promise.all([
            deleteFileIfExist('art.jpg'),
            deleteFileIfExist('bill_original.jpg'),
            deleteFileIfExist('bill_sensitive.png'),
            deleteFileIfExist('bill_blurred.png'),
        ]);
    }
  } catch (error) {
    console.error("Error deleting receipt:", error);
  }
};

export const getReceiptById = async (id: string): Promise<Receipt | undefined> => {
  const foundInMock = mockStore.find(r => r.id === id);
  if (foundInMock) return Promise.resolve(deepCopy(foundInMock));
  const isMockSession = localStorage.getItem('isMockSession') === 'true';
  if (!db || firebaseFailed || isMockSession) return undefined;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Receipt;
    return undefined;
  } catch (error) {
    return undefined;
  }
};

export const getUserReceipts = async (userId: string): Promise<Receipt[]> => {
  const isMock = userId.startsWith('mock-user-');
  const isMockSession = localStorage.getItem('isMockSession') === 'true';
  if (!db || isMock || firebaseFailed || isMockSession) {
    return Promise.resolve(mockStore.filter(r => r.creatorId === userId).map(deepCopy));
  }
  try {
    const q = query(collection(db, COLLECTION_NAME), where("creatorId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
  } catch (error) {
    return mockStore.filter(r => r.creatorId === userId).map(deepCopy);
  }
};

export const addComment = async (receiptId: string, text: string, user: {uid: string, name: string, avatar?: string}, parentId?: string): Promise<Comment> => {
  const newComment: Comment = {
    // Enhanced uniqueness to prevent clashing and accidental double rendering
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    user: user.name,
    userId: user.uid,
    userAvatar: user.avatar,
    text,
    timestamp: Date.now(),
    receiptId,
    parentId,
    replies: []
  };

  const receipt = mockStore.find(r => r.id === receiptId);
  const isMock = !!receipt || !db || firebaseFailed || localStorage.getItem('isMockSession') === 'true';

  if (isMock) {
    if (receipt) {
      if (!receipt.comments) receipt.comments = [];
      if (parentId) {
          const parent = receipt.comments.find(c => c.id === parentId);
          if (parent) {
              if (!parent.replies) parent.replies = [];
              // Return a fresh copy after pushing to store to maintain decoupling
              parent.replies.push(deepCopyComment(newComment));
          }
      } else {
          receipt.comments.push(deepCopyComment(newComment));
      }
    }
    return deepCopyComment(newComment);
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, receiptId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        let updatedComments = [...(data.comments || [])];
        if (parentId) {
            updatedComments = updatedComments.map(c => {
                if (c.id === parentId) {
                    return { ...c, replies: [...(c.replies || []), newComment] };
                }
                return c;
            });
        } else {
            updatedComments.push(newComment);
        }
        await updateDoc(docRef, { comments: updatedComments });
    }
    return newComment;
  } catch (e) {
    return newComment; 
  }
};

export const deleteComment = async (receiptId: string, commentId: string): Promise<void> => {
    const receipt = mockStore.find(r => r.id === receiptId);
    if (receipt) {
        receipt.comments = (receipt.comments || []).filter(c => c.id !== commentId);
        receipt.comments.forEach(c => {
            if (c.replies) c.replies = c.replies.filter(r => r.id !== commentId);
        });
    }
    if (!db || firebaseFailed || localStorage.getItem('isMockSession') === 'true') return;
    try {
        const docRef = doc(db, COLLECTION_NAME, receiptId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            let updatedComments = (data.comments || []).filter((c: any) => c.id !== commentId);
            updatedComments = updatedComments.map((c: any) => ({
                ...c,
                replies: (c.replies || []).filter((r: any) => r.id !== commentId)
            }));
            await updateDoc(docRef, { comments: updatedComments });
        }
    } catch (e) {}
};

export const getAllUserComments = async (userId: string): Promise<Comment[]> => {
    const receipts = await getAllReceipts();
    const userComments: Comment[] = [];
    receipts.forEach(r => {
        (r.comments || []).forEach(c => {
            if (c.userId === userId) userComments.push(c);
            (c.replies || []).forEach(rp => {
                if (rp.userId === userId) userComments.push(rp);
            });
        });
    });
    return userComments;
};