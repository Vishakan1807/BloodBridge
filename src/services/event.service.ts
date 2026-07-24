import { ref, push, set, get, update, remove, onValue, type Unsubscribe } from 'firebase/database';
import { db } from '@/core/config/firebase';

export interface CharityDrive {
  id:          string;
  name:        string;
  address:     string;
  city:        string;
  startDate:   number;
  endDate:     number;
  isActive:    boolean;
  createdBy:   string;
  createdAt:   number;
}

// ── Charity Drives Service ────────────────────────────────────

export function subscribeCharityDrives(callback: (drives: CharityDrive[]) => void): Unsubscribe {
  const drivesRef = ref(db, 'charityDrives');
  return onValue(drivesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.values(data) as CharityDrive[];
    callback(list.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function createCharityDrive(
  data: Omit<CharityDrive, 'id' | 'createdAt'>,
): Promise<string> {
  const drivesRef = ref(db, 'charityDrives');
  const newRef = push(drivesRef);
  const id = newRef.key!;
  const newDrive: CharityDrive = {
    ...data,
    id,
    createdAt: Date.now(),
  };
  await set(newRef, newDrive);
  return id;
}

export async function updateCharityDrive(
  id: string,
  data: Partial<Omit<CharityDrive, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await update(ref(db, `charityDrives/${id}`), data);
}

export async function deleteCharityDrive(id: string): Promise<void> {
  await remove(ref(db, `charityDrives/${id}`));
}
