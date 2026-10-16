import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DrakeWorkerPreview } from '../schedule/schedule-api';

type AdminWorkerPreviewContextValue = {
  selectedWorker: DrakeWorkerPreview | null;
  setSelectedWorker: (worker: DrakeWorkerPreview) => void;
  clearSelectedWorker: () => void;
};

const AdminWorkerPreviewContext = createContext<AdminWorkerPreviewContextValue>({
  selectedWorker: null,
  setSelectedWorker: () => undefined,
  clearSelectedWorker: () => undefined,
});

export function AdminWorkerPreviewProvider({
  children,
  initialSelectedWorker = null,
}: {
  children: ReactNode;
  initialSelectedWorker?: DrakeWorkerPreview | null;
}) {
  const [selectedWorker, setSelectedWorkerState] = useState<DrakeWorkerPreview | null>(initialSelectedWorker);
  const value = useMemo<AdminWorkerPreviewContextValue>(
    () => ({
      selectedWorker,
      setSelectedWorker: setSelectedWorkerState,
      clearSelectedWorker: () => setSelectedWorkerState(null),
    }),
    [selectedWorker],
  );

  return (
    <AdminWorkerPreviewContext.Provider value={value}>
      {children}
    </AdminWorkerPreviewContext.Provider>
  );
}

export function useAdminWorkerPreview() {
  return useContext(AdminWorkerPreviewContext);
}
