import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { validateImageUpload, imageExtension } from "@/lib/uploads";
import { Link, Navigate } from "react-router-dom";
import { User, BookOpen, Star, CheckCircle, Bookmark, Settings, Eye, EyeOff, Camera, Shield, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ContentCard from "@/components/ContentCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SessionSecurity } from "@/components/SessionSecurity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Profile, Story, UserListWithStory, ListType } from "@/types/domain";

type ListsMap = Record<ListType, Story[]>;

interface Stats {
  reading: number;
  completed: number;
  plan_to_read: number;
  ratings: number;
}

const Profile = () => {
  const { user, loading: authLoading, isCreator, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lists, setLists] = useState<ListsMap>({ reading: [], completed: [], plan_to_read: [] });
  const [stats, setStats] = useState<Stats>({ reading: 0, completed: 0, plan_to_read: 0, ratings: 0 });
  const [hiddenStoryIds, setHiddenStoryIds] = useState<Set<string>>(new Set());
  const [createdStories, setCreatedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profRes, listsRes, ratingsRes, hiddenRes, storiesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_lists").select("*, stories(*)").eq("user_id", user.id),
        supabase.from("ratings").select("id").eq("user_id", user.id),
        supabase.from("hidden_stories").select("story_id").eq("user_id", user.id),
        supabase.from("stories").select("*").eq("created_by", user.id).eq("review_status", "approved").order("created_at", { ascending: false }),
      ]);

      if (profRes.data) setProfile(profRes.data);
      if (hiddenRes.data) setHiddenStoryIds(new Set(hiddenRes.data.map((h) => h.story_id)));
      if (storiesRes.data) setCreatedStories(storiesRes.data);

      if (listsRes.data) {
        const grouped: ListsMap = { reading: [], completed: [], plan_to_read: [] };
        (listsRes.data as UserListWithStory[]).forEach((l) => {
          if (l.stories) grouped[l.list].push(l.stories);
        });
        setLists(grouped);
        setStats({
          reading: grouped.reading.length,
          completed: grouped.completed.length,
          plan_to_read: grouped.plan_to_read.length,
          ratings: ratingsRes.data?.length ?? 0,
        });
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadRoles = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setUserRoles(data?.map(r => r.role) || []);
    };
    loadRoles();
  }, [user]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" />;

  const togglePrivacy = async (field: "show_lists" | "show_created_content", value: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", user.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
    toast({ title: "Privacy updated" });
  };

  const toggleStoryVisibility = async (storyId: string) => {
    const isHidden = hiddenStoryIds.has(storyId);
    if (isHidden) {
      await supabase.from("hidden_stories").delete().eq("user_id", user.id).eq("story_id", storyId);
      setHiddenStoryIds((prev) => { const n = new Set(prev); n.delete(storyId); return n; });
      toast({ title: "Story now visible on profile" });
    } else {
      await supabase.from("hidden_stories").insert({ user_id: user.id, story_id: storyId });
      setHiddenStoryIds((prev) => new Set(prev).add(storyId));
      toast({ title: "Story hidden from profile" });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const problem = await validateImageUpload(file, "covers");
    if (problem) {
      toast({ title: "Can't upload this file", description: problem, variant: "destructive" });
      return;
    }
    const path = `${user.id}/avatar.${imageExtension(file)}`;
    const { error: uploadErr } = await supabase.storage
      .from("covers")
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    toast({ title: "Avatar updated" });
  };

  const handleRoleToggle = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (isCreator) {
        await api.creator.leave();

        toast({
          title: "Account changed",
          description: "You are no longer a creator. All your works have been archived.",
        });
      } else {
        await api.creator.become();

        toast({
          title: "Account changed",
          description: "You are now a creator! You can publish your stories.",
        });
      }

      await refreshUser();
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to change account type.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    { label: "Reading",      value: stats.reading,      icon: BookOpen },
    { label: "Completed",    value: stats.completed,    icon: CheckCircle },
    { label: "Plan to Read", value: stats.plan_to_read, icon: Bookmark },
    { label: "Ratings",      value: stats.ratings,      icon: Star },
  ];

  const listKeys: ListType[] = ["reading", "completed", "plan_to_read"];
  const listLabels: Record<ListType, string> = { reading: "Reading", completed: "Completed", plan_to_read: "Planned" };
  const listIcons: Record<ListType, typeof BookOpen> = { reading: BookOpen, completed: CheckCircle, plan_to_read: Bookmark };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
                <AvatarFallback><User className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile?.display_name ?? profile?.username ?? user.email}</h1>
              {profile?.bio && <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>}
              <Link to={`/profile/${user.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                View public profile
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {statItems.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <stat.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs defaultValue="reading">
          <TabsList className="bg-secondary border border-border w-full justify-center sm:justify-start overflow-x-auto overflow-y-hidden">
            {listKeys.map((key) => {
              const Icon = listIcons[key];
              return (
                <TabsTrigger key={key} value={key} className="gap-1.5 data-[state=active]:bg-card flex-shrink-0">
                  <Icon className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">{listLabels[key]}</span>
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="created" className="gap-1.5 data-[state=active]:bg-card flex-shrink-0">
              <Star className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">My Stories</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-card flex-shrink-0">
              <Settings className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {listKeys.map((key) => (
            <TabsContent key={key} value={key} className="mt-6">
              {lists[key].length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No stories in this list yet. <Link to="/browse" className="text-primary hover:underline">Browse stories</Link></p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {lists[key].map((story) => (
                    <div key={story.id} className="relative">
                      <ContentCard story={story} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                        onClick={(e) => { e.preventDefault(); toggleStoryVisibility(story.id); }}
                        title={hiddenStoryIds.has(story.id) ? "Hidden from profile" : "Visible on profile"}
                      >
                        {hiddenStoryIds.has(story.id)
                          ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          : <Eye className="h-3.5 w-3.5 text-primary" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="created" className="mt-6">
            {createdStories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>No created stories yet.</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {createdStories.map((story) => (
                  <div key={story.id} className="relative">
                    <ContentCard story={story} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm z-10"
                      onClick={(e) => { e.preventDefault(); toggleStoryVisibility(story.id); }}
                    >
                      {hiddenStoryIds.has(story.id)
                        ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        : <Eye className="h-3.5 w-3.5 text-primary" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Account Profile
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Basic information about your account
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{user.user_metadata?.display_name || user.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {userRoles.map((role) => (
                      <Badge key={role} variant={role === "creator" ? "default" : "secondary"} className="text-xs">
                        {role === "creator" ? "Creator" : role === "admin" ? "Administrator" : role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    Account Type
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Switch between normal account and creator account
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {isCreator ? "Creator Account" : "Normal Account"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isCreator
                          ? "You can publish and manage your stories."
                          : "Basic account for reading and interaction."
                        }
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loading} className="w-full sm:w-auto">
                          {isCreator ? "Switch to Normal Account" : "Become a Creator"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            {isCreator ? "Stop being a creator?" : "Become a creator?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {isCreator ? (
                              <>
                                <strong>Warning:</strong> When you stop being a creator, all your published works will be automatically archived.
                                You can only recover them manually by changing the status back to "published".
                                <br /><br />
                                Are you sure you want to continue?
                              </>
                            ) : (
                              "By becoming a creator, you will be able to publish your own stories on the platform. Do you want to continue?"
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRoleToggle} className={isCreator ? "bg-destructive hover:bg-destructive/90" : ""}>
                            {isCreator ? "Archive works and continue" : "Become a creator"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {isCreator && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">About archiving</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            If you stop being a creator, your works will be archived automatically.
                            To publish them again, access your creator dashboard and manually change the status.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-base sm:text-lg font-semibold">Public Profile Privacy</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Control what other users can see on your profile
                  </p>
                </div>
                <div className="space-y-4">
                  {(["show_lists", "show_created_content"] as const).map((field) => (
                    <div key={field} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-3 flex-1">
                        {profile?.[field]
                          ? <Eye className="h-5 w-5 text-primary flex-shrink-0" />
                          : <EyeOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            {field === "show_lists" ? "Show Reading Lists" : "Show Created Content"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {field === "show_lists"
                              ? "Allow others to see your reading, completed, and planned lists"
                              : "Allow others to see stories you've published"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end sm:justify-start">
                        <Switch
                          checked={profile?.[field] ?? true}
                          onCheckedChange={(v) => togglePrivacy(field, v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
                <SessionSecurity />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
