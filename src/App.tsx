import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProfileGate } from "./components/layout/ProfileGate";
import { ProfileProvider } from "./context/ProfileContext";
import { ToastProvider } from "./context/ToastContext";
import { ComprasEMetas } from "./pages/ComprasEMetas";
import { Configuracoes } from "./pages/Configuracoes";
import { Contas } from "./pages/Contas";
import { CreateProfile } from "./pages/CreateProfile";
import { Dashboard } from "./pages/Dashboard";
import { Movimentacoes } from "./pages/Movimentacoes";
import { TagsManager } from "./pages/TagsManager";

export default function App() {
  return (
    <ToastProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/perfil/novo" element={<CreateProfile />} />
            <Route element={<ProfileGate />}>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="movimentacoes" element={<Movimentacoes />} />
                <Route path="contas" element={<Contas />} />
                <Route path="metas" element={<ComprasEMetas />} />
                <Route path="tags" element={<TagsManager />} />
                <Route path="configuracoes" element={<Configuracoes />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </ToastProvider>
  );
}
