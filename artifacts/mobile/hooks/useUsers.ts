import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type PlanType = "monthly" | "yearly";
export type UserStatus = "pending" | "active" | "expired";

export interface MonitonUser {
  id: string;
  name: string;
  phone: string;
  plan: PlanType;
  status: UserStatus;
  expiryDate: string | null;
  registeredAt: string;
}

const STORAGE_KEY = "@moniton_users";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function resolveStatus(user: MonitonUser): UserStatus {
  if (user.status === "pending") return "pending";
  if (!user.expiryDate) return "expired";
  return new Date(user.expiryDate) > new Date() ? "active" : "expired";
}

async function loadUsers(): Promise<MonitonUser[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const users: MonitonUser[] = JSON.parse(raw);
  return users.map((u) => ({ ...u, status: resolveStatus(u) }));
}

async function saveUsers(users: MonitonUser[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export function useUsers() {
  const [users, setUsers] = useState<MonitonUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addUser = useCallback(async (name: string, phone: string, plan: PlanType): Promise<MonitonUser> => {
    const current = await loadUsers();
    const newUser: MonitonUser = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      plan,
      status: "pending",
      expiryDate: null,
      registeredAt: new Date().toISOString(),
    };
    const updated = [...current, newUser];
    await saveUsers(updated);
    setUsers(updated);
    return newUser;
  }, []);

  const activateUser = useCallback(async (userId: string, months: number) => {
    const current = await loadUsers();
    const now = new Date();
    const updated = current.map((u) => {
      if (u.id !== userId) return u;
      const expiry = months >= 12 ? addYears(now, months / 12) : addMonths(now, months);
      return {
        ...u,
        status: "active" as UserStatus,
        expiryDate: expiry.toISOString(),
      };
    });
    await saveUsers(updated);
    setUsers(updated.map((u) => ({ ...u, status: resolveStatus(u) })));
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    const current = await loadUsers();
    const updated = current.filter((u) => u.id !== userId);
    await saveUsers(updated);
    setUsers(updated);
  }, []);

  return { users, loading, refresh, addUser, activateUser, deleteUser };
}
