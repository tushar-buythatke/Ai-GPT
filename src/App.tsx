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
import ChatPlayground from "@/pages/ChatPlayground";
import VisionPlayground from "@/pages/VisionPlayground";
import ImageUrlPlayground from "@/pages/ImageUrlPlayground";
import FilePlayground from "@/pages/FilePlayground";
import VoicePlayground from "@/pages/VoicePlayground";
import ApiDocs from "@/pages/ApiDocs";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import NotFound from "./pages/NotFound";

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
                  <Route path="/" element={<ChatPlayground />} />
                  <Route path="/chat/:chatId" element={<ChatPlayground />} />
                  <Route path="/vision" element={<VisionPlayground />} />
                  <Route path="/image-url" element={<ImageUrlPlayground />} />
                  <Route path="/file-upload" element={<FilePlayground />} />
                  <Route path="/voice" element={<VoicePlayground />} />
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
