import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
}

export default function ProtectedRoute({ children, requireOwner = false }: ProtectedRouteProps) {
  const { isAuthenticated, isOwner } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
