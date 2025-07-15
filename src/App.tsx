import React, { useState } from "react";
import { BrowserRouter as Router, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import { useAuth } from "./hooks/useAuth";
import { AuthForm } from "./components/AuthForm";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Accounts } from "./components/Accounts";
import { Transactions } from "./components/Transactions";
import { Transfers } from "./components/Transfers";
import { CreditCards } from "./components/CreditCards";
import { Categories } from "./components/Categories";
import { Budgets } from "./components/Budgets";
import { Reports } from "./components/Reports";
import { Settings } from "./components/Settings";
import { Patients } from "./components/Patients";
import { Sessions } from "./components/Sessions";
import { PatientPayments } from "./components/PatientPayments";

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "accounts":
        return <Accounts />;
      case "transactions":
        return <Transactions />;
      case "transfers":
        return <Transfers />;
      case "credit-cards":
        return <CreditCards />;
      case "categories":
        return <Categories />;
      case "budgets":
        return <Budgets />;
      case "reports":
        return <Reports />;
      case "patients":
        return <Patients />;
      case "sessions":
        return <Sessions />;
      case "patient-payments":
        return <PatientPayments />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Router>
      <AppContent
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        renderPage={renderPage}
      />
    </Router>
  );
}

function AppContent({
  currentPage,
  setCurrentPage,
  renderPage,
}: {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  renderPage: () => React.ReactNode;
}) {
  // Tempo routes - now inside Router context
  if (import.meta.env.VITE_TEMPO) {
    const tempoRoutes = useRoutes(routes);
    if (tempoRoutes) return tempoRoutes;
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
