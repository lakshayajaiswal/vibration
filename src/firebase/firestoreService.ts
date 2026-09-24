import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errors';

export interface UserProfileData {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  totalEscapes: number;
  blindfoldEscapes: number;
  bestTimeSeconds: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonalRunData {
  id?: string;
  levelId: string;
  levelName: string;
  userId: string;
  timeSeconds: number;
  collisionsCount: number;
  sonarPingsCount: number;
  blindfoldMode: boolean;
  completedAt: string;
}

export interface LeaderboardRecordData {
  id?: string;
  levelId: string;
  levelName: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  timeSeconds: number;
  collisionsCount: number;
  sonarPingsCount: number;
  blindfoldMode: boolean;
  achievedAt: string;
}

/**
 * Initializes or syncs a user's profile document upon login
 */
export async function syncUserProfile(user: { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null }): Promise<UserProfileData> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfileData;
      // Update display name or photo if changed
      const updates: Partial<UserProfileData> = {
        updatedAt: new Date().toISOString(),
      };
      if (user.displayName && user.displayName !== data.displayName) {
        updates.displayName = user.displayName.slice(0, 100);
      }
      if (user.photoURL && user.photoURL !== data.photoURL) {
        updates.photoURL = user.photoURL.slice(0, 500);
      }
      if (Object.keys(updates).length > 1) {
        await updateDoc(userRef, updates);
      }
      return { ...data, ...updates };
    } else {
      const now = new Date().toISOString();
      const newProfile: UserProfileData = {
        uid: user.uid,
        displayName: (user.displayName || 'Shadow Navigator').slice(0, 100),
        photoURL: (user.photoURL || '').slice(0, 500),
        email: (user.email || '').slice(0, 200),
        totalEscapes: 0,
        blindfoldEscapes: 0,
        bestTimeSeconds: 0,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Records an escape run into user history, updates cumulative profile stats,
 * and updates public chamber leaderboard if qualified.
 */
export async function recordRunSubmission(params: {
  levelId: string;
  levelName: string;
  timeSeconds: number;
  collisionsCount: number;
  sonarPingsCount: number;
  blindfoldMode: boolean;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const now = new Date().toISOString();
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const runPath = `users/${currentUser.uid}/runs/${runId}`;

  const personalRun: PersonalRunData = {
    levelId: params.levelId.slice(0, 64),
    levelName: params.levelName.slice(0, 100),
    userId: currentUser.uid,
    timeSeconds: Math.round(params.timeSeconds * 10) / 10,
    collisionsCount: params.collisionsCount,
    sonarPingsCount: params.sonarPingsCount,
    blindfoldMode: params.blindfoldMode,
    completedAt: now,
  };

  // 1. Write personal run record
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'runs', runId), personalRun);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, runPath);
  }

  // 2. Update user profile stats
  const userPath = `users/${currentUser.uid}`;
  let currentProfile: UserProfileData | null = null;
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      currentProfile = snap.data() as UserProfileData;
      const newTotal = (currentProfile.totalEscapes || 0) + 1;
      const newBlindfold = params.blindfoldMode ? (currentProfile.blindfoldEscapes || 0) + 1 : (currentProfile.blindfoldEscapes || 0);
      const currentBest = currentProfile.bestTimeSeconds || 0;
      const newBest = currentBest === 0 ? personalRun.timeSeconds : Math.min(currentBest, personalRun.timeSeconds);

      await updateDoc(userRef, {
        totalEscapes: newTotal,
        blindfoldEscapes: newBlindfold,
        bestTimeSeconds: newBest,
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  // 3. Update public level leaderboard if this is user's first or best record on this level
  const recordPath = `leaderboards/${params.levelId}/records/${currentUser.uid}`;
  try {
    const recordRef = doc(db, 'leaderboards', params.levelId, 'records', currentUser.uid);
    const existingRecordSnap = await getDoc(recordRef);

    let shouldUpdateLeaderboard = false;
    if (!existingRecordSnap.exists()) {
      shouldUpdateLeaderboard = true;
    } else {
      const existingData = existingRecordSnap.data() as LeaderboardRecordData;
      // Prioritize faster time; if blindfold, grant bonus parity
      if (personalRun.timeSeconds < existingData.timeSeconds) {
        shouldUpdateLeaderboard = true;
      } else if (params.blindfoldMode && !existingData.blindfoldMode && personalRun.timeSeconds <= existingData.timeSeconds * 1.2) {
        shouldUpdateLeaderboard = true;
      }
    }

    if (shouldUpdateLeaderboard) {
      const leaderboardEntry: LeaderboardRecordData = {
        levelId: params.levelId.slice(0, 64),
        levelName: params.levelName.slice(0, 100),
        userId: currentUser.uid,
        userName: (currentUser.displayName || 'Blind Navigator').slice(0, 100),
        userPhoto: (currentUser.photoURL || '').slice(0, 500),
        timeSeconds: personalRun.timeSeconds,
        collisionsCount: params.collisionsCount,
        sonarPingsCount: params.sonarPingsCount,
        blindfoldMode: params.blindfoldMode,
        achievedAt: now,
      };

      await setDoc(recordRef, leaderboardEntry);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, recordPath);
  }

  return personalRun;
}

/**
 * Subscribe to real-time level leaderboard
 */
export function subscribeToLevelLeaderboard(
  levelId: string,
  onUpdate: (records: LeaderboardRecordData[]) => void,
  onError?: (err: unknown) => void
) {
  const path = `leaderboards/${levelId}/records`;
  const q = collection(db, 'leaderboards', levelId, 'records');

  return onSnapshot(
    q,
    (snapshot) => {
      const records: LeaderboardRecordData[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...(docSnap.data() as LeaderboardRecordData) });
      });
      // Sort by fastest time ascending
      records.sort((a, b) => a.timeSeconds - b.timeSeconds);
      onUpdate(records);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Subscribe to user's personal runs
 */
export function subscribeToUserRuns(
  userId: string,
  onUpdate: (runs: PersonalRunData[]) => void
) {
  const path = `users/${userId}/runs`;
  const q = collection(db, 'users', userId, 'runs');

  return onSnapshot(
    q,
    (snapshot) => {
      const runs: PersonalRunData[] = [];
      snapshot.forEach((docSnap) => {
        runs.push({ id: docSnap.id, ...(docSnap.data() as PersonalRunData) });
      });
      // Sort newest first
      runs.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      onUpdate(runs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
