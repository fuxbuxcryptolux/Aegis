import "@/App.css";
import { Toaster } from "sonner";
import Game from "@/pages/Game";
import { useEffect, useState } from "react";
import AuthScreen from "@/components/auth/AuthScreen";
import { getCurrentUser } from "@/lib/api";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aegis_auth_token");
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    getCurrentUser(token)
      .then(setUser)
      .catch(() => localStorage.removeItem("aegis_auth_token"))
      .finally(() => setCheckingAuth(false));
  }, []);

  return (
    <div className="App">
      {checkingAuth ? <div className="min-h-screen bg-[#090d16]" /> : user ? <Game user={user} /> : <AuthScreen onAuthenticated={setUser} />}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(6,182,212,0.35)",
            color: "#f8fafc",
            fontFamily: "IBM Plex Sans, sans-serif",
          },
        }}
      />
    </div>
  );
}

export default App;
