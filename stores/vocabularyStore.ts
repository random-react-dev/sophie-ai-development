import {
    createFolder,
    deleteFromVocabulary,
    getFolders,
    getVocabulary,
    saveToVocabulary,
    updateVocabularyItem,
    VocabularyFolder,
    VocabularyItem,
} from '@/services/supabase/vocabulary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VocabularyState {
    items: VocabularyItem[];
    folders: VocabularyFolder[];
    isLoading: boolean;

    // Actions
    fetchVocabulary: () => Promise<void>;
    addItem: (item: Omit<VocabularyItem, 'user_id'>) => Promise<boolean>;
    updateItem: (id: string, updates: Partial<Omit<VocabularyItem, 'user_id' | 'id' | 'created_at'>>) => Promise<boolean>;
    removeItem: (id: string) => Promise<boolean>;
    fetchFolders: () => Promise<void>;
    addFolder: (name: string) => Promise<VocabularyFolder | null>;
}

export const useVocabularyStore = create<VocabularyState>()(
    persist(
        (set, get) => ({
            items: [],
            folders: [],
            isLoading: false,

            fetchVocabulary: async () => {
                if (get().items.length === 0) {
                    set({ isLoading: true });
                }
                try {
                    const [vocabData, foldersData] = await Promise.all([
                        getVocabulary(),
                        getFolders(),
                    ]);
                    set({ items: vocabData, folders: foldersData });
                } catch (error) {
                    console.error('Error fetching vocabulary:', error);
                } finally {
                    set({ isLoading: false });
                }
            },

            addItem: async (item) => {
                set({ isLoading: true });
                try {
                    const newItem = await saveToVocabulary(item);
                    if (newItem) {
                        // Optimistically update the list by adding the new item at the beginning
                        set((state) => ({
                            items: [newItem, ...state.items],
                        }));
                        return true;
                    }
                    return false;
                } catch (error) {
                    console.error('Error adding item:', error);
                    return false;
                } finally {
                    set({ isLoading: false });
                }
            },

            updateItem: async (id, updates) => {
                const previousItems = get().items;
                // Optimistic update
                set((state) => ({
                    items: state.items.map((item) =>
                        item.id === id ? { ...item, ...updates } : item
                    ),
                }));

                try {
                    const updated = await updateVocabularyItem(id, updates);
                    if (!updated) {
                        set({ items: previousItems });
                        return false;
                    }
                    // Update with server data (includes folder relation)
                    set((state) => ({
                        items: state.items.map((item) => (item.id === id ? updated : item)),
                    }));
                    return true;
                } catch (error) {
                    console.error('Error updating item:', error);
                    set({ items: previousItems });
                    return false;
                }
            },

            removeItem: async (id) => {
                // Optimistically remove from UI first
                const previousItems = get().items;
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                }));

                try {
                    const success = await deleteFromVocabulary(id);
                    if (!success) {
                        // Revert if failed
                        set({ items: previousItems });
                        return false;
                    }
                    return true;
                } catch (error) {
                    console.error('Error removing item:', error);
                    set({ items: previousItems }); // Revert on error
                    return false;
                }
            },

            fetchFolders: async () => {
                try {
                    const folders = await getFolders();
                    set({ folders });
                } catch (error) {
                    console.error('Error fetching folders:', error);
                }
            },

            addFolder: async (name) => {
                try {
                    const newFolder = await createFolder(name);
                    if (newFolder) {
                        set((state) => ({
                            folders: [...state.folders, newFolder],
                        }));
                    }
                    return newFolder;
                } catch (error) {
                    console.error('Error adding folder:', error);
                    return null;
                }
            },
        }),
        {
            name: 'vocabulary-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ items: state.items, folders: state.folders }),
        }
    )
);

// ============================================
// Atomic Selectors
// ============================================

export const useVocabularyItems = () => useVocabularyStore((s) => s.items);
export const useVocabularyFolders = () => useVocabularyStore((s) => s.folders);
export const useVocabularyLoading = () => useVocabularyStore((s) => s.isLoading);
