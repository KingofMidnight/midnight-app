import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import MfaChallenge from "@/components/MfaChallenge";

// Every page except the home page is loaded on demand, so visitors only download
// the code for the pages they open (the admin/creator tools, readers and the
// rich-text editor are large and most visitors never use them).
const Browse = lazy(() => import("./pages/Browse"));
const NovelReader = lazy(() => import("./pages/NovelReader"));
const MangaReader = lazy(() => import("./pages/MangaReader"));
const StoryDetail = lazy(() => import("./pages/StoryDetail"));
const AnimePlayer = lazy(() => import("./pages/AnimePlayer"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCreator = lazy(() => import("./pages/AuthCreator"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const CreatorDashboard = lazy(() => import("./pages/creator/CreatorDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notices = lazy(() => import("./pages/Notices"));

const PageLoading = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Loading...</div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MfaChallenge />
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
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
            <Route path="/notices" element={<Layout><Notices /></Layout>} />
            <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
            <Route path="/creator" element={<Layout><CreatorDashboard /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

