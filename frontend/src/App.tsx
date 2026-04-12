import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import NovelReader from "./pages/NovelReader";
import MangaReader from "./pages/MangaReader";
import StoryDetail from "./pages/StoryDetail";
import AnimePlayer from "./pages/AnimePlayer";
import Auth from "./pages/Auth";
import AuthCreator from "./pages/AuthCreator";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/browse" element={<Layout><Browse /></Layout>} />
            <Route path="/story/:id" element={<Layout><StoryDetail /></Layout>} />
            <Route path="/read/novel/:storyId/:chapterId" element={<NovelReader />} />
            <Route path="/read/manga/:storyId/:chapterId" element={<MangaReader />} />
            <Route path="/watch/:storyId/:episodeId?" element={<AnimePlayer />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/creator" element={<AuthCreator />} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/profile/:id" element={<Layout><PublicProfile /></Layout>} />
            <Route path="/terms" element={<Layout><TermsOfService /></Layout>} />
            <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
            <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
            <Route path="/creator" element={<Layout><CreatorDashboard /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

