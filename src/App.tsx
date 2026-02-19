import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { ChatHistoryProvider } from "@/hooks/useChatHistory";
import DashboardLayout from "@/components/DashboardLayout";
import ChatPlayground from "@/pages/ChatPlayground";
import VisionPlayground from "@/pages/VisionPlayground";
import ImageUrlPlayground from "@/pages/ImageUrlPlayground";
import FilePlayground from "@/pages/FilePlayground";
import VoicePlayground from "@/pages/VoicePlayground";
import ApiDocs from "@/pages/ApiDocs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ChatHistoryProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
