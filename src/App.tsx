import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { FarmDataProvider } from "@/contexts/FarmDataContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import CowProfiles from "./pages/CowProfiles";
import RecordCowData from "./pages/RecordCowData";
import FeedRecords from "./pages/FeedRecords";
import HealthRecords from "./pages/HealthRecords";
import Reports from "./pages/Reports";
import AdminDashboard from "./pages/AdminDashboard";
import MilkSales from "./pages/MilkSales";
import SalesReceipts from "./pages/SalesReceipts";
import CreditDetails from "@/pages/CreditDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FarmDataProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/cows" element={<ProtectedRoute><CowProfiles /></ProtectedRoute>} />
              <Route path="/record" element={<ProtectedRoute><RecordCowData /></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute><FeedRecords /></ProtectedRoute>} />
              <Route path="/health" element={<ProtectedRoute><HealthRecords /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><MilkSales /></ProtectedRoute>} />
              <Route path="/credit-details" element={<CreditDetails />} />
              <Route path="/receipts" element={<ProtectedRoute><SalesReceipts /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FarmDataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
