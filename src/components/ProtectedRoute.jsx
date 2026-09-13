import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, allowedRoles, children, redirectTo = '/login' }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  const role = user.role;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin' : '/treasurer'} replace />;
  }

  return children;
}
