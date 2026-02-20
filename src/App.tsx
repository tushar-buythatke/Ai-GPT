import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { ChatHistoryProvider } from "@/hooks/useChatHistory";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import ApiDocs from "@/pages/ApiDocs";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import NotFound from "./pages/NotFound";

const ChatPlayground = lazy(() => import("@/pages/ChatPlayground"));
const VisionPlayground = lazy(() => import("@/pages/VisionPlayground"));
const ImageUrlPlayground = lazy(() => import("@/pages/ImageUrlPlayground"));
const FilePlayground = lazy(() => import("@/pages/FilePlayground"));
const VoicePlayground = lazy(() => import("@/pages/VoicePlayground"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ChatHistoryProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />

                {/* Dashboard routes */}
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Suspense fallback={<PageLoader />}><ChatPlayground /></Suspense>} />
                  <Route path="/chat/:chatId" element={<Suspense fallback={<PageLoader />}><ChatPlayground /></Suspense>} />
                  <Route path="/vision" element={<Suspense fallback={<PageLoader />}><VisionPlayground /></Suspense>} />
                  <Route path="/image-url" element={<Suspense fallback={<PageLoader />}><ImageUrlPlayground /></Suspense>} />
                  <Route path="/file-upload" element={<Suspense fallback={<PageLoader />}><FilePlayground /></Suspense>} />
                  <Route path="/voice" element={<Suspense fallback={<PageLoader />}><VoicePlayground /></Suspense>} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ChatHistoryProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
