import { Navigate, useLocation } from "react-router-dom";
import Loader from "../../components/Loader.jsx";
import { useAuth } from "../../hooks/useAuth.js";

const ProtectedRoute = ({ roles, children }) => {
  const { user, authReady, loading } = useAuth();
  const location = useLocation();

  if (!authReady || loading) {
    return <Loader label="Checking your session..." />;
  }

  if (!user) {
    const destination =
      roles?.includes("vendor") && !roles.includes("customer")
        ? "/vendor/login"
        : "/customer/login";

    return <Navigate to={destination} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : user.role === "vendor" ? "/vendor/dashboard" : "/app"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
