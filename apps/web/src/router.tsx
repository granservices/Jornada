import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShellLayout } from './shell/app-shell-layout';
import { AuthLayout } from './shell/auth-layout';
import { DashboardPage } from './views/dashboard-page';
import { ForgotPasswordPage } from './views/forgot-password-page';
import { LoginPage } from './views/login-page';
import { RegisterPage } from './views/register-page';
import { ResetPasswordPage } from './views/reset-password-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPasswordPage />,
      },
      {
        path: '/reset-password',
        element: <ResetPasswordPage />,
      },
    ],
  },
  {
    path: '/app',
    element: <AppShellLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
    ],
  },
]);
