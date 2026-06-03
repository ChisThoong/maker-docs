"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ProfileData {
  email: string;
  name: string;
  image: string | null;
  googleImage: string | null;
  avatarUrl: string | null;
  displayName: string | null;
  bio: string | null;
  role: string | null;
  jobPosition: string | null;
  permissions: string[];
  isActive: boolean | null;
}

interface ProfileContextValue {
  profile: ProfileData | null;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<Pick<ProfileData, "avatarUrl" | "displayName" | "bio">>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.ok) setProfile((await res.json()) as ProfileData);
    } catch {
      // ignore — keep previous value
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (patch: Partial<Pick<ProfileData, "avatarUrl" | "displayName" | "bio">>) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, update }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
