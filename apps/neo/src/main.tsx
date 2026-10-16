import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { initializeThemePreference } from './features/theme/theme-preference';
import { AdminWorkerPreviewProvider } from './features/admin-worker-preview/admin-worker-preview-context';
import { router } from './router';
import './styles.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

initializeThemePreference();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <AdminWorkerPreviewProvider>
      <RouterProvider router={router} />
    </AdminWorkerPreviewProvider>
  </QueryClientProvider>,
);
