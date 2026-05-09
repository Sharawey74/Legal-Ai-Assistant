import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";
import LoginPage     from "./pages/LoginPage";
import RegisterPage  from "./pages/RegisterPage";
import DocumentsPage from "./pages/DocumentsPage";
import ChatPage      from "./pages/ChatPage";
import HistoryPage   from "./pages/HistoryPage";
import DashboardLayout from "./components/layout/DashboardLayout";

function ProtectedRoute({ children, noPadding = false }: { children: ReactNode, noPadding?: boolean }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DashboardLayout noPadding={noPadding}>{children}</DashboardLayout> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  { path: "/",         element: <Navigate to="/login" replace /> },
  { path: "/login",    element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/documents",
    element: <ProtectedRoute><DocumentsPage /></ProtectedRoute>,
  },
  {
    path: "/chat",
    element: <ProtectedRoute noPadding><ChatPage /></ProtectedRoute>,
  },
  {
    path: "/chat/:sessionId",
    element: <ProtectedRoute noPadding><ChatPage /></ProtectedRoute>,
  },
  {
    path: "/history",
    element: <ProtectedRoute><HistoryPage /></ProtectedRoute>,
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
