import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  getFirestore,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const initAuth = async () => {
  await setPersistence(auth, browserLocalPersistence);
};

export const observeAuth = (cb) => onAuthStateChanged(auth, cb);

export const registerWithEmail = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateAuthProfile(cred.user, { displayName });
  }
  return cred.user;
};

export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const createUserProfile = async (uid, profile) => {
  const payload = {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', uid), payload);
};

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
};

export const fetchUserProfile = (uid) => getDoc(doc(db, 'users', uid));

export const subscribeToProfile = (uid, cb) => onSnapshot(doc(db, 'users', uid), cb);

export const addPost = async (post) => {
  const payload = { ...post, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db, 'posts'), payload);
  return ref.id;
};

export const subscribeToPosts = (cb) =>
  onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), cb);

export const addComment = (postId, comment) =>
  addDoc(collection(db, 'posts', postId, 'comments'), {
    ...comment,
    createdAt: serverTimestamp(),
  });

export const subscribeToComments = (postId, cb) =>
  onSnapshot(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')), cb);

export const toggleLike = async (postId, uid) => {
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  const existing = await getDoc(likeRef);
  if (existing.exists()) {
    await deleteDoc(likeRef);
  } else {
    await setDoc(likeRef, { createdAt: serverTimestamp() });
  }
};

export const subscribeToLikes = (postId, cb) => onSnapshot(collection(db, 'posts', postId, 'likes'), cb);

