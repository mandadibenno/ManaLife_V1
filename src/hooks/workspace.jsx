import { MODULE_ORDER, SHARED_MODULES } from "../config/modules";
import { createContext, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { ensurePersonalSpace, listSpaces } from "../services/spaces";
import { SHARED_TYPE_KEYS, SPACE_TYPES } from "../config/spaceTypes";
import { readLocal, writeLocal } from "../lib/storage";

const WorkspaceContext = createContext(null);
const TYPE_ORDER = ["personal", ...SHARED_TYPE_KEYS];

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Creates "My Space" on first use. Resolves to null if migration 001 isn't installed.
  const personal = useQuery({
    queryKey: ["personal-space", user.id],
    queryFn: ensurePersonalSpace,
    staleTime: 30_000,
    retry: 1,
  });

  const spaces = useQuery({
    queryKey: ["spaces", user.id],
    queryFn: () => listSpaces(user.id),
    enabled: personal.isFetched,
    refetchInterval: 60_000,
  });

  const value = useMemo(() => {
    const list = [...(spaces.data || [])].sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
        a.name.localeCompare(b.name),
    );
    const personalSpace = list.find((s) => s.isPersonal) || null;
    return {
      spaces: list,
      personal: personalSpace,
      shared: list.filter((s) => !s.isPersonal),
      byId: (id) => list.find((s) => s.id === id) || null,
      // v2 = migration 001 present (personal spaces, couple type, appearance, remove member)
      v2: personal.data != null || Boolean(personalSpace),
      isLoading: personal.isLoading || (personal.isFetched && spaces.isLoading),
      error:
        spaces.error ||
        (personal.error && !personal.data ? personal.error : null),
      refetch: () => qc.invalidateQueries({ queryKey: ["spaces", user.id] }),
      lastSpaceId: () => readLocal(`manalife-active-room-${user.id}`, null),
      rememberSpace: (id) => writeLocal(`manalife-active-room-${user.id}`, id),
    };
  }, [
    spaces.data,
    spaces.isLoading,
    spaces.error,
    personal.data,
    personal.isLoading,
    personal.isFetched,
    personal.error,
    qc,
    user.id,
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);

/** Enabled modules for a space, falling back to type defaults for legacy rows with none stored. */

export function enabledModules(space) {
  if (!space) return [];

  const base = space.enabled.length
    ? space.enabled
    : SPACE_TYPES[space.type].modules;

  const allowed = space.isPersonal ? MODULE_ORDER : SHARED_MODULES;

  return [...new Set(base.filter((key) => allowed.includes(key)))];
}
