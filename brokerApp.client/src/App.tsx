import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import SubmissionsPage from './SubmissionsPage';
import AdvisorsPage from './AdvisorsPage';
import FinancialsPage from './FinancialsPage';
import PerformancePage from './PerformancePage';
import AdvisorPayslipsPage from './AdvisorPayslipsPage';
import AdvancesPage from './AdvancesPage';
import PromotionalGiftsPage from './PromotionalGiftsPage';
import SettlementsPage from './SettlementsPage';
import ReportsPage from './ReportsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/advisors" element={<AdvisorsPage />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/settlements" element={<SettlementsPage />} />
            <Route path="/advances" element={<AdvancesPage />} />
            <Route path="/promotional-gifts" element={<PromotionalGiftsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/payslips" element={<AdvisorPayslipsPage />} />
            <Route path="/payslips/:advisorId" element={<AdvisorPayslipsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;
