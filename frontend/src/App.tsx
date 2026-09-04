
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { PaymentsList } from './pages/PaymentsList';
import { PaymentDetail } from './pages/PaymentDetail';
import { Escalations } from './pages/Escalations';
import { Evaluation } from './pages/Evaluation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/payments" element={<PaymentsList />} />
          <Route path="/payments/:id" element={<PaymentDetail />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route path="/evaluation" element={<Evaluation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
