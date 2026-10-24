import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CreateEvent from "./pages/CreateEvent";
import Feed from "./pages/Feed";
import EventDetail from "./pages/EventDetail";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Navbar from "./Components/NavBar";
import ProtectedRoute from "./Components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import EditProfile from "./pages/EditProfile";
import UserProfile from "./pages/UserProfile";

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Feed /> : <Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/profile/:userId" element={<UserProfile />} />

        {/* Login required */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
