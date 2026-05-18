import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from '../layouts/ProtectedRoute';

import LoginPage from '../pages/auth/LoginPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

import EmployeeDashboard from '../pages/employee/Dashboard';
import MyGoals from '../pages/employee/MyGoals';
import GoalSheetBuilder from '../pages/employee/GoalSheetBuilder';
import CheckinPage from '../pages/employee/CheckinPage';

import ManagerDashboard from '../pages/manager/Dashboard';
import TeamSheets from '../pages/manager/TeamSheets';
import SheetReview from '../pages/manager/SheetReview';
import CheckinReview from '../pages/manager/CheckinReview';
import SharedGoals from '../pages/manager/SharedGoals';
import TeamMembers from '../pages/manager/TeamMembers';

import AdminDashboard from '../pages/admin/Dashboard';
import CycleManagement from '../pages/admin/CycleManagement';
import AuditLogs from '../pages/admin/AuditLogs';
import Reports from '../pages/admin/Reports';
import Analytics from '../pages/admin/Analytics';
import UsersManagement from '../pages/admin/UsersManagement';
import EscalationLogs from '../pages/admin/EscalationLogs';
import GoalSheetsAdmin from '../pages/admin/GoalSheetsAdmin';
import ProfilePage from '../pages/ProfilePage';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<EmployeeDashboard />} />
            <Route path="/my-goals" element={<MyGoals />} />
            <Route path="/goal-builder" element={<GoalSheetBuilder />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
          <Route element={<AppLayout />}>
            <Route path="/manager/dashboard" element={<ManagerDashboard />} />
            <Route path="/manager/team-members" element={<TeamMembers />} />
            <Route path="/manager/team" element={<TeamMembers />} />
            <Route path="/manager/review/:sheetId" element={<SheetReview />} />
            <Route path="/manager/checkin/:sheetId" element={<CheckinReview />} />
            <Route path="/manager/shared-goals" element={<SharedGoals />} />
            <Route path="/manager/reports" element={<Reports />} />
            <Route path="/manager/analytics" element={<Analytics />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UsersManagement />} />
            <Route path="/admin/team-members" element={<TeamMembers />} />
            <Route path="/admin/cycles" element={<CycleManagement />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
            <Route path="/admin/escalations" element={<EscalationLogs />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/goal-sheets" element={<GoalSheetsAdmin />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}