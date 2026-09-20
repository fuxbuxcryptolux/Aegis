import "@/App.css";
import { Toaster } from "sonner";
import Game from "@/pages/Game";

function App() {
  return (
    <div className="App">
      <Game />
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
