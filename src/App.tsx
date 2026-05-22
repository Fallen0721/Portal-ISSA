import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./routes/router.tsx";
import { ToastProvider } from "./hooks/useToast";
import { AuthProvider } from "./hooks/useAuth";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
