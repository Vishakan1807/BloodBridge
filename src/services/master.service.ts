import { ref, set, push, update, remove, get, onValue, type Unsubscribe } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { BloodGroup, Camp, Hospital, CampInventory } from '@/types/master.types';

// ── Blood Groups Service ──────────────────────────────────────

export function subscribeBloodGroups(callback: (groups: BloodGroup[]) => void): Unsubscribe {
  const bloodGroupsRef = ref(db, 'master/bloodGroups');
  return onValue(bloodGroupsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.values(data) as BloodGroup[];
    callback(list);
  });
}

export async function createBloodGroup(
  label: string,
  description: string,
  createdBy: string,
): Promise<string> {
  const bloodGroupsRef = ref(db, 'master/bloodGroups');
  const newRef = push(bloodGroupsRef);
  const id = newRef.key!;
  const newGroup: BloodGroup = {
    id,
    label: label.trim().toUpperCase(),
    description: description.trim(),
    isActive: true,
    createdBy,
    createdAt: Date.now(),
  };
  await set(newRef, newGroup);
  return id;
}

export async function updateBloodGroup(
  id: string,
  data: Partial<Omit<BloodGroup, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await update(ref(db, `master/bloodGroups/${id}`), data);
}

export async function deleteBloodGroup(id: string): Promise<void> {
  await remove(ref(db, `master/bloodGroups/${id}`));
}

// ── Camps Service ─────────────────────────────────────────────

export function subscribeCamps(callback: (camps: Camp[]) => void): Unsubscribe {
  const campsRef = ref(db, 'master/camps');
  return onValue(campsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.values(data) as Camp[];
    callback(list);
  });
}

export async function createCamp(
  data: Omit<Camp, 'id' | 'createdAt'>,
): Promise<string> {
  const campsRef = ref(db, 'master/camps');
  const newRef = push(campsRef);
  const id = newRef.key!;
  const newCamp: Camp = {
    ...data,
    id,
    createdAt: Date.now(),
  };
  await set(newRef, newCamp);
  return id;
}

export async function updateCamp(
  id: string,
  data: Partial<Omit<Camp, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await update(ref(db, `master/camps/${id}`), data);
}

export async function deleteCamp(id: string): Promise<void> {
  await remove(ref(db, `master/camps/${id}`));
}

// ── Hospitals Service ─────────────────────────────────────────

export function subscribeHospitals(callback: (hospitals: Hospital[]) => void): Unsubscribe {
  const hospitalsRef = ref(db, 'master/hospitals');
  return onValue(hospitalsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.values(data) as Hospital[];
    callback(list);
  });
}

export async function createHospital(
  data: Omit<Hospital, 'id' | 'createdAt'>,
): Promise<string> {
  const hospitalsRef = ref(db, 'master/hospitals');
  const newRef = push(hospitalsRef);
  const id = newRef.key!;
  const newHospital: Hospital = {
    ...data,
    id,
    createdAt: Date.now(),
  };
  await set(newRef, newHospital);
  return id;
}

export async function updateHospital(
  id: string,
  data: Partial<Omit<Hospital, 'id' | 'createdBy' | 'createdAt'>>,
): Promise<void> {
  await update(ref(db, `master/hospitals/${id}`), data);
}

export async function deleteHospital(id: string): Promise<void> {
  await remove(ref(db, `master/hospitals/${id}`));
}

// ── Inventory Service ─────────────────────────────────────────

export function subscribeCampInventory(
  campId: string,
  callback: (inventory: CampInventory) => void,
): Unsubscribe {
  const invRef = ref(db, `inventory/${campId}`);
  return onValue(invRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    callback(snapshot.val() as CampInventory);
  });
}

export function subscribeAllInventory(
  callback: (inventory: Record<string, CampInventory>) => void,
): Unsubscribe {
  const invRef = ref(db, 'inventory');
  return onValue(invRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    callback(snapshot.val() as Record<string, CampInventory>);
  });
}

export async function updateInventoryStock(
  campId: string,
  bloodGroupLabel: string,
  units: number,
  updatedBy: string,
): Promise<void> {
  const itemRef = ref(db, `inventory/${campId}/${bloodGroupLabel}`);
  await set(itemRef, {
    units: Math.max(0, units),
    lastUpdatedBy: updatedBy,
    lastUpdatedAt: Date.now(),
  });
}
