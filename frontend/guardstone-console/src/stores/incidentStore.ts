/**
 * Incident & Investigation Store
 * Zustand store for managing security incidents and investigations
 */

import { create } from 'zustand';
import {
  Incident,
  IncidentStatus,
  IncidentPriority,
  AlertSeverity,
  Investigation,
  TimelineEntry,
  ErrorResponse,
} from '@/types';

interface IncidentStoreState {
  incidents: Map<string, Incident>;
  investigations: Map<string, Investigation>;
  selectedIncident: Incident | null;
  selectedInvestigation: Investigation | null;
  loading: boolean;
  error: ErrorResponse | null;
  totalIncidents: number;
  currentPage: number;
  pageSize: number;

  // Incident Actions
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (incidentId: string, updates: Partial<Incident>) => void;
  selectIncident: (incident: Incident | null) => void;
  removeIncident: (incidentId: string) => void;

  // Investigation Actions
  createInvestigation: (investigation: Investigation) => void;
  updateInvestigation: (investigationId: string, updates: Partial<Investigation>) => void;
  selectInvestigation: (investigation: Investigation | null) => void;

  // Workflow Actions
  changeIncidentStatus: (incidentId: string, status: IncidentStatus) => void;
  assignIncident: (incidentId: string, assignedTo: string) => void;
  addResponder: (incidentId: string, responderId: string) => void;
  addTimelineEntry: (incidentId: string, entry: TimelineEntry) => void;
  closeIncident: (incidentId: string) => void;
  reopenIncident: (incidentId: string) => void;

  // Query & Filter
  getIncidentsBy: (status?: IncidentStatus, priority?: IncidentPriority) => Incident[];
  getActiveIncidents: () => Incident[];
  getMyAssignedIncidents: (userId: string) => Incident[];

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: ErrorResponse | null) => void;
  clearIncidents: () => void;
}

export const useIncidentStore = create<IncidentStoreState>((set, get) => ({
  incidents: new Map(),
  investigations: new Map(),
  selectedIncident: null,
  selectedInvestigation: null,
  loading: false,
  error: null,
  totalIncidents: 0,
  currentPage: 1,
  pageSize: 25,

  setIncidents: (incidents: Incident[]) => {
    const incidentMap = new Map(incidents.map((inc) => [inc.id, inc]));
    set({ incidents: incidentMap });
  },

  addIncident: (incident: Incident) => {
    set((state) => {
      const newIncidents = new Map(state.incidents);
      newIncidents.set(incident.id, incident);
      return { incidents: newIncidents };
    });
  },

  updateIncident: (incidentId: string, updates: Partial<Incident>) => {
    set((state) => {
      const incident = state.incidents.get(incidentId);
      if (!incident) return state;

      const updated = { ...incident, ...updates, updatedAt: new Date() };
      const newIncidents = new Map(state.incidents);
      newIncidents.set(incidentId, updated);

      return {
        incidents: newIncidents,
        selectedIncident:
          state.selectedIncident?.id === incidentId ? updated : state.selectedIncident,
      };
    });
  },

  selectIncident: (incident: Incident | null) => set({ selectedIncident: incident }),

  removeIncident: (incidentId: string) => {
    set((state) => {
      const newIncidents = new Map(state.incidents);
      newIncidents.delete(incidentId);
      return {
        incidents: newIncidents,
        selectedIncident:
          state.selectedIncident?.id === incidentId ? null : state.selectedIncident,
      };
    });
  },

  createInvestigation: (investigation: Investigation) => {
    set((state) => {
      const newInvestigations = new Map(state.investigations);
      newInvestigations.set(investigation.id, investigation);
      return { investigations: newInvestigations };
    });
  },

  updateInvestigation: (investigationId: string, updates: Partial<Investigation>) => {
    set((state) => {
      const investigation = state.investigations.get(investigationId);
      if (!investigation) return state;

      const updated = { ...investigation, ...updates };
      const newInvestigations = new Map(state.investigations);
      newInvestigations.set(investigationId, updated);

      return {
        investigations: newInvestigations,
        selectedInvestigation:
          state.selectedInvestigation?.id === investigationId ? updated : state.selectedInvestigation,
      };
    });
  },

  selectInvestigation: (investigation: Investigation | null) =>
    set({ selectedInvestigation: investigation }),

  changeIncidentStatus: (incidentId: string, status: IncidentStatus) => {
    const updates: Partial<Incident> = { status, updatedAt: new Date() };
    if (status === IncidentStatus.CLOSED) {
      updates.closedAt = new Date();
    }
    get().updateIncident(incidentId, updates);
  },

  assignIncident: (incidentId: string, assignedTo: string) => {
    get().updateIncident(incidentId, {
      assignedTo,
      status: IncidentStatus.IN_PROGRESS,
      updatedAt: new Date(),
    });
  },

  addResponder: (incidentId: string, responderId: string) => {
    const incident = get().incidents.get(incidentId);
    if (!incident) return;

    const responders = Array.from(new Set([...incident.responders, responderId]));
    get().updateIncident(incidentId, { responders });
  },

  addTimelineEntry: (incidentId: string, entry: TimelineEntry) => {
    const incident = get().incidents.get(incidentId);
    if (!incident) return;

    get().updateIncident(incidentId, {
      timeline: [...incident.timeline, entry],
      updatedAt: new Date(),
    });
  },

  closeIncident: (incidentId: string) => {
    get().changeIncidentStatus(incidentId, IncidentStatus.CLOSED);
  },

  reopenIncident: (incidentId: string) => {
    get().updateIncident(incidentId, {
      status: IncidentStatus.REOPENED,
      closedAt: undefined,
      updatedAt: new Date(),
    });
  },

  getIncidentsBy: (status?: IncidentStatus, priority?: IncidentPriority): Incident[] => {
    return Array.from(get().incidents.values()).filter((incident) => {
      if (status && incident.status !== status) return false;
      if (priority && incident.priority !== priority) return false;
      return true;
    });
  },

  getActiveIncidents: (): Incident[] => {
    return get().getIncidentsBy(IncidentStatus.IN_PROGRESS);
  },

  getMyAssignedIncidents: (userId: string): Incident[] => {
    return Array.from(get().incidents.values()).filter(
      (incident) => incident.assignedTo === userId && incident.status !== IncidentStatus.CLOSED
    );
  },

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: ErrorResponse | null) => {
    set({ error, loading: false });
    if (error) {
      console.error('Incident Store Error:', error);
    }
  },

  clearIncidents: () =>
    set({
      incidents: new Map(),
      investigations: new Map(),
      selectedIncident: null,
      selectedInvestigation: null,
      error: null,
      totalIncidents: 0,
    }),
}));
