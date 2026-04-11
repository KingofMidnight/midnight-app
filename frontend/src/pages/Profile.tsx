import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, Navigate } from "react-router-dom";
import { User, BookOpen, Star, CheckCircle, Bookmark, Settings, Eye, EyeOff, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ContentCard from "@/components/ContentCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Profile, Story, UserListWithStory, ListType } from "@/types/domain";

type ListsMap = Record<ListType, Story[]>;

interface Stats {
  reading: number;
  completed: number;
  plan_to_read: number;
  ratings: number;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lists, setLists] = useState<ListsMap>({ reading: [], completed: [], plan_to_read: [] });
  const [stats, setStats] = useState<Stats>({ reading: 0, completed: 0, plan_to_read: 0, ratings: 0 });
  const [hiddenStoryIds, setHiddenStoryIds] = useState<Set<string>>(new Set());
  const [createdStories, setCreatedStories] = useState<Story[]>([]);

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
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
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
          <TabsList className="bg-secondary border border-border">
            {listKeys.map((key) => {
              const Icon = listIcons[key];
              return (
                <TabsTrigger key={key} value={key} className="gap-1.5 data-[state=active]:bg-card">
                  <Icon className="h-3.5 w-3.5" /> {listLabels[key]}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="created" className="gap-1.5 data-[state=active]:bg-card">
              <Star className="h-3.5 w-3.5" /> My Stories
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-card">
              <Settings className="h-3.5 w-3.5" /> Privacy
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
            <div className="max-w-md space-y-6">
              <h3 className="text-lg font-bold">Public Profile Privacy</h3>
              <div className="space-y-4">
                {(["show_lists", "show_created_content"] as const).map((field) => (
                  <div key={field} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3">
                      {profile?.[field]
                        ? <Eye className="h-5 w-5 text-primary" />
                        : <EyeOff className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-sm">
                          {field === "show_lists" ? "Show Reading Lists" : "Show Created Content"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {field === "show_lists"
                            ? "Let others see your reading, completed, and planned lists"
                            : "Let others see stories you've published"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.[field] ?? true}
                      onCheckedChange={(v) => togglePrivacy(field, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
