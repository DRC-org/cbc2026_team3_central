import { BrowserRouter, Link as RouterLink } from "react-router-dom";
import { useRobotSocket } from "./hooks/useRobotSocket";
import { RobotProvider } from "./context/RobotContext";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { EStopButton } from "./components/EStopButton";
import { AppRoutes } from "./router";

export function App() {
  const socket = useRobotSocket();

  const handleEStop = () => {
    socket.send({ type: "e_stop" });
  };

  return (
    <BrowserRouter>
      <RobotProvider value={socket}>
        <div className="min-h-screen bg-white text-gray-900">
          <header className="sticky top-0 z-50 flex items-center gap-6 border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur">
            <RouterLink
              to="/"
              className="text-lg font-bold text-gray-900 no-underline"
            >
              CBC2026 Team3
            </RouterLink>

            <nav className="flex items-center gap-4 text-sm">
              <RouterLink
                to="/main-hand"
                className="text-gray-600 no-underline hover:text-primary"
              >
                メインハンド
              </RouterLink>
              <RouterLink
                to="/sub-hand"
                className="text-gray-600 no-underline hover:text-primary"
              >
                サブハンド
              </RouterLink>
            </nav>

            <div className="ml-auto">
              <ConnectionStatus connected={socket.connected} />
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-8">
            <AppRoutes />
          </main>
        </div>

        <EStopButton onStop={handleEStop} />
      </RobotProvider>
    </BrowserRouter>
  );
}
