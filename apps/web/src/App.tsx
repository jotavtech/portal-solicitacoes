import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.js';
import { Shell } from './components/Shell.js';
import { LoginPage } from './pages/LoginPage.js';
import { RequestsPage } from './pages/RequestsPage.js';
import { NewPage, EditPage } from './pages/FormPages.js';
import { DetailPage } from './pages/DetailPage.js';
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Shell />}>
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/new" element={<NewPage />} />
            <Route path="/requests/:id" element={<DetailPage />} />
            <Route path="/requests/:id/edit" element={<EditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
