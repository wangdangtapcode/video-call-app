import "./App.css";
import { Routers } from "./router/routes";
import { AppProvider } from "./context/AppProvider";

function App() {
  return (
    <AppProvider>
      <Routers />
    </AppProvider>
  );
}

export default App;
