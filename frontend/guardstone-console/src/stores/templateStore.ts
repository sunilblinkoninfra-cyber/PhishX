import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Template, PREBUILT_TEMPLATES } from '@/types/templates';

interface TemplateStore {
  // State
  templates: Template[];
  selectedTemplate: Template | null;
  loading: boolean;

  // Template Management
  addTemplate: (template: Template) => void;
  removeTemplate: (templateId: string) => void;
  updateTemplate: (template: Template) => void;
  setTemplates: (templates: Template[]) => void;

  // Selection
  selectTemplate: (template: Template) => void;
  deselectTemplate: () => void;

  // Usage Tracking
  incrementUsageCount: (templateId: string) => void;

  // Filtering
  getTemplatesByType: (type: string) => Template[];
  getTemplatesByCategory: (category: string) => Template[];
  searchTemplates: (query: string) => Template[];

  // Persistence
  saveTemplates: () => void;
  loadTemplates: () => void;

  // Loading State
  setLoading: (loading: boolean) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  persist(
    (set, get) => ({
      // Initial State
      templates: PREBUILT_TEMPLATES,
      selectedTemplate: null,
      loading: false,

      // Add Template
      addTemplate: (template: Template) =>
        set((state) => ({
          templates: [...state.templates, template],
        })),

      // Remove Template
      removeTemplate: (templateId: string) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
          selectedTemplate:
            state.selectedTemplate?.id === templateId ? null : state.selectedTemplate,
        })),

      // Update Template
      updateTemplate: (template: Template) =>
        set((state) => ({
          templates: state.templates.map((t) => (t.id === template.id ? template : t)),
          selectedTemplate:
            state.selectedTemplate?.id === template.id ? template : state.selectedTemplate,
        })),

      // Set all templates
      setTemplates: (templates: Template[]) =>
        set(() => ({
          templates,
        })),

      // Select Template
      selectTemplate: (template: Template) =>
        set(() => ({
          selectedTemplate: template,
        })),

      // Deselect Template
      deselectTemplate: () =>
        set(() => ({
          selectedTemplate: null,
        })),

      // Increment Usage Count
      incrementUsageCount: (templateId: string) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId
              ? { ...t, usageCount: t.usageCount + 1, updatedAt: new Date().toISOString() }
              : t
          ),
        })),

      // Get Templates by Type
      getTemplatesByType: (type: string) => {
        const { templates } = get();
        return templates.filter((t) => t.type === type);
      },

      // Get Templates by Category
      getTemplatesByCategory: (category: string) => {
        const { templates } = get();
        return templates.filter((t) => t.category === category);
      },

      // Search Templates
      searchTemplates: (query: string) => {
        const { templates } = get();
        const lowerQuery = query.toLowerCase();
        return templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      },

      // Save Templates to localStorage
      saveTemplates: () => {
        const { templates } = get();
        localStorage.setItem('templates', JSON.stringify(templates));
      },

      // Load Templates from localStorage
      loadTemplates: () => {
        const stored = localStorage.getItem('templates');
        if (stored) {
          try {
            const templates = JSON.parse(stored);
            set(() => ({ templates }));
          } catch (error) {
            console.error('Failed to load templates:', error);
          }
        }
      },

      // Set Loading State
      setLoading: (loading: boolean) =>
        set(() => ({
          loading,
        })),
    }),
    {
      name: 'template-store',
      partialState: {
        templates: 'templates',
      },
    }
  )
);
