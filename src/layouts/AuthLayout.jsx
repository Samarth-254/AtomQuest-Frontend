import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="bg-surface antialiased min-h-screen flex flex-col items-center justify-center p-padding-lg sm:p-8">
      <Outlet />
    </div>
  );
}