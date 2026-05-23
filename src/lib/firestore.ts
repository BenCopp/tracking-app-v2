import { auth, db } from './firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncDoc(collectionName: string, docId: string, data: any) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/${collectionName}/${docId}`;
  try {
    await setDoc(doc(db, 'users', auth.currentUser.uid, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function addDocument(collectionName: string, data: any) {
  if (!auth.currentUser) return null;
  const path = `users/${auth.currentUser.uid}/${collectionName}`;
  try {
    const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, collectionName), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return null;
  }
}

export async function updateDocument(collectionName: string, docId: string, data: any) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/${collectionName}/${docId}`;
  try {
    await updateDoc(doc(db, 'users', auth.currentUser.uid, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteDocument(collectionName: string, docId: string) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, collectionName, docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateProfile(data: any) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}`;
  try {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}
