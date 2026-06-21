"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Condition = "ok" | "not_ok" | "not_available";

export interface ChecklistEntry {
  itemId: string;
  itemLabel: string;
  condition: Condition | null;
  remarks: string;
}

export interface RoomDraft {
  id: string; // local uuid
  roomNumber: string;
  checklist: ChecklistEntry[];
  savedToDb: boolean;
}

export interface CommonAreaDraft {
  areaKey: string;
  areaLabel: string;
  moduleType: "remarks" | "checklist";
  remarks: string;
  checklist: ChecklistEntry[];
}

export interface ManpowerDraft {
  section: string;
  label: string;
  count: number | null;
  remarks: string;
}

export interface EquipmentDraft {
  item: string;
  label: string;
  moduleType: "status" | "count";
  condition: Condition | null;
  count: number | null;
  remarks: string;
}

export interface HotelSubAreaDraft {
  subAreaKey: string;
  subAreaLabel: string;
  moduleType: "remarks" | "checklist";
  remarks: string;
  checklist: ChecklistEntry[];
}

export interface AuditDraft {
  auditId: string;
  propertyId: string;
  propertyName: string;
  propertyType: "hostel" | "hotel";
  auditorName: string;
  auditDate: string;
  currentStep: string;

  // Hostel sections
  process: {
    admissionsRemarks: string;
    paymentsRemarks: string;
  };
  rooms: RoomDraft[];
  commonAreas: CommonAreaDraft[];
  manpower: ManpowerDraft[];
  equipment: EquipmentDraft[];

  // Hotel sections
  frontOffice: HotelSubAreaDraft[];
  housekeeping: HotelSubAreaDraft[];
  engineering: HotelSubAreaDraft[];
  foodBeverage: HotelSubAreaDraft[];
  propertyManagement: HotelSubAreaDraft[];
  security: HotelSubAreaDraft[];
  finance: HotelSubAreaDraft[];
  humanResources: HotelSubAreaDraft[];
  guestExperience: HotelSubAreaDraft[];

  lastSyncedAt: string | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuditStore {
  drafts: Record<string, AuditDraft>; // keyed by auditId
  activeDraftId: string | null;

  setActiveDraft: (auditId: string) => void;
  initDraft: (draft: AuditDraft) => void;
  updateDraft: (auditId: string, partial: Partial<AuditDraft>) => void;
  updateProcess: (auditId: string, data: AuditDraft["process"]) => void;
  upsertRoom: (auditId: string, room: RoomDraft) => void;
  removeRoom: (auditId: string, roomId: string) => void;
  updateCommonArea: (auditId: string, area: CommonAreaDraft) => void;
  updateManpower: (auditId: string, manpower: ManpowerDraft[]) => void;
  updateEquipment: (auditId: string, equipment: EquipmentDraft[]) => void;
  updateHotelSection: (
    auditId: string,
    sectionKey: keyof Pick<
      AuditDraft,
      | "frontOffice"
      | "housekeeping"
      | "engineering"
      | "foodBeverage"
      | "propertyManagement"
      | "security"
      | "finance"
      | "humanResources"
      | "guestExperience"
    >,
    subAreas: HotelSubAreaDraft[]
  ) => void;
  markSynced: (auditId: string) => void;
  clearDraft: (auditId: string) => void;
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set) => ({
      drafts: {},
      activeDraftId: null,

      setActiveDraft: (auditId) => set({ activeDraftId: auditId }),

      initDraft: (draft) =>
        set((state) => ({
          drafts: { ...state.drafts, [draft.auditId]: draft },
          activeDraftId: draft.auditId,
        })),

      updateDraft: (auditId, partial) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: { ...state.drafts[auditId], ...partial },
          },
        })),

      updateProcess: (auditId, data) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: { ...state.drafts[auditId], process: data },
          },
        })),

      upsertRoom: (auditId, room) =>
        set((state) => {
          const draft = state.drafts[auditId];
          const existing = draft.rooms.findIndex((r) => r.id === room.id);
          const rooms =
            existing >= 0
              ? draft.rooms.map((r) => (r.id === room.id ? room : r))
              : [...draft.rooms, room];
          return {
            drafts: { ...state.drafts, [auditId]: { ...draft, rooms } },
          };
        }),

      removeRoom: (auditId, roomId) =>
        set((state) => {
          const draft = state.drafts[auditId];
          return {
            drafts: {
              ...state.drafts,
              [auditId]: {
                ...draft,
                rooms: draft.rooms.filter((r) => r.id !== roomId),
              },
            },
          };
        }),

      updateCommonArea: (auditId, area) =>
        set((state) => {
          const draft = state.drafts[auditId];
          const existing = draft.commonAreas.findIndex(
            (a) => a.areaKey === area.areaKey
          );
          const commonAreas =
            existing >= 0
              ? draft.commonAreas.map((a) =>
                  a.areaKey === area.areaKey ? area : a
                )
              : [...draft.commonAreas, area];
          return {
            drafts: { ...state.drafts, [auditId]: { ...draft, commonAreas } },
          };
        }),

      updateManpower: (auditId, manpower) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: { ...state.drafts[auditId], manpower },
          },
        })),

      updateEquipment: (auditId, equipment) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: { ...state.drafts[auditId], equipment },
          },
        })),

      updateHotelSection: (auditId, sectionKey, subAreas) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: {
              ...state.drafts[auditId],
              [sectionKey]: subAreas,
            },
          },
        })),

      markSynced: (auditId) =>
        set((state) => ({
          drafts: {
            ...state.drafts,
            [auditId]: {
              ...state.drafts[auditId],
              lastSyncedAt: new Date().toISOString(),
            },
          },
        })),

      clearDraft: (auditId) =>
        set((state) => {
          const { [auditId]: _, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    {
      name: "pa-audit-drafts",
      // Debounce localStorage writes — state updates in memory instantly (UI is reactive),
      // but the expensive JSON.stringify + localStorage.setItem runs at most once per second.
      storage: (() => {
        const timers: Record<string, ReturnType<typeof setTimeout>> = {};
        return {
          getItem: (key: string) => {
            if (typeof window === "undefined") return null;
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : null;
          },
          setItem: (key: string, value: unknown) => {
            clearTimeout(timers[key]);
            timers[key] = setTimeout(() => {
              if (typeof window !== "undefined") {
                localStorage.setItem(key, JSON.stringify(value));
              }
            }, 1000);
          },
          removeItem: (key: string) => {
            clearTimeout(timers[key]);
            if (typeof window !== "undefined") localStorage.removeItem(key);
          },
        };
      })(),
    }
  )
);
