import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Campaigns from "./pages/Campaigns";
import Discover from "./pages/Discover";
import History from "./pages/History";
import Home from "./pages/Home";
import OptOuts from "./pages/OptOuts";
import Prospects from "./pages/Prospects";
import Sources from "./pages/Sources";
import Unsubscribe from "./pages/Unsubscribe";

function Router() {
  return (
    <Switch>
      {/* Public route reachable from the footer of a sent email. */}
      <Route path={"/leiratkozas"} component={Unsubscribe} />
      <Route path={"/"}>
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      <Route path={"/forrasok"}>
        <DashboardLayout>
          <Sources />
        </DashboardLayout>
      </Route>
      <Route path={"/kereses"}>
        <DashboardLayout>
          <Discover />
        </DashboardLayout>
      </Route>
      <Route path={"/kontaktok"}>
        <DashboardLayout>
          <Prospects />
        </DashboardLayout>
      </Route>
      <Route path={"/kampanyok"}>
        <DashboardLayout>
          <Campaigns />
        </DashboardLayout>
      </Route>
      <Route path={"/elozmenyek"}>
        <DashboardLayout>
          <History />
        </DashboardLayout>
      </Route>
      <Route path={"/leiratkozasok"}>
        <DashboardLayout>
          <OptOuts />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
