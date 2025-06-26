import { create } from "zustand"

export interface Document {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "processing" | "completed" | "error"
  upload_progress: number
  created_at: Date
  chunk_count?: number
  error_message?: string
}

interface DocumentState {
  documents: Document[]
  isUploading: boolean

  // Actions
  setDocuments: (documents: Document[]) => void
  addDocument: (document: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  deleteDocument: (id: string) => void
  setIsUploading: (uploading: boolean) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  isUploading: false,

  setDocuments: (documents) => set({ documents }),

  addDocument: (document) =>
    set((state) => ({
      documents: [document, ...state.documents],
    })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)),
    })),

  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    })),

  setIsUploading: (isUploading) => set({ isUploading }),
}))
