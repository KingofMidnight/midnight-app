import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { User, BookOpen, CheckCircle, Bookmark, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ContentCard from "@/components/ContentCard";
import ReportDialog from "@/components/ReportDialog";
import PaginationControls from "@/components/PaginationControls";
import { UserBlockButton } from "@/components/UserBlockButton";

const PublicProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [lists, setLists] = useState<Record<string, any[]>>({ reading: [], completed: [], plan_to_read: [] });
  const [createdStories, setCreatedStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCount, setFollowCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [favorites, setFavorites] = useState<Record<string, any[]>>({ novel: [], manga: [], anime: [] });
  const [showFavorites, setShowFavorites] = useState(false);

  const [createdPage, setCreatedPage] = useState(1);
  const [readingPage, setReadingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [planToReadPage, setPlanToReadPage] = useState(1);
  const [novelFavPage, setNovelFavPage] = useState(1);
  const [mangaFavPage, setMangaFavPage] = useState(1);
  const [animeFavPage, setAnimeFavPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [profRes, rolesRes, hiddenRes, followersRes, followingRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("user_roles").select("role").eq("user_id", id),
        supabase.from("hidden_stories").select("story_id").eq("user_id", id),
        supabase.from("creator_followers").select("follower_user_id").eq("creator_user_id", id),
        supabase.from("creator_followers").select("follower_user_id").eq("follower_user_id", id),
      ]);
      if (profRes.data) setProfile(profRes.data);
      if (hiddenRes.data) setHiddenIds(new Set(hiddenRes.data.map((h) => h.story_id)));
      const roles = rolesRes.data?.map((r) => r.role) || [];
      const creator = roles.includes("creator") || roles.includes("admin");
      setIsCreator(creator);
      const hiddenSet = new Set(hiddenRes.data?.map((h) => h.story_id) || []);

      if (followersRes.data) setFollowCount(followersRes.data.length);
      if (followingRes.data) setFollowingCount(followingRes.data.length);

      if (currentUser && creator) {
        const isFollowingRes = await supabase
          .from("creator_followers")
          .select("id")
          .eq("creator_user_id", id)
          .eq("follower_user_id", currentUser.id)
          .single();
        setIsFollowing(!!isFollowingRes.data);
      }

      if (profRes.data?.show_lists) {
        const { data: listsData } = await supabase.from("user_lists").select("*, stories(*)").eq("user_id", id);
        if (listsData) {
          const grouped: Record<string, any[]> = { reading: [], completed: [], plan_to_read: [] };
          listsData.forEach((l) => {
            if (grouped[l.list] && l.stories && !hiddenSet.has(l.stories.id)) {
              grouped[l.list].push(l.stories);
            }
          });
          setLists(grouped);
        }
      }

      if (profRes.data?.show_favorites) {
        setShowFavorites(true);
        const { data: favRes } = await supabase.from("user_favorites").select("*, stories(*)").eq("user_id", id);
        if (favRes) {
          const grouped: Record<string, any[]> = { novel: [], manga: [], anime: [] };
          favRes.forEach((fav: any) => {
            if (fav.stories) {
              const type = (fav.stories.type || "novel").toLowerCase();
              if (type in grouped) {
                grouped[type].push(fav.stories);
              }
            }
          });
          setFavorites(grouped);
        }
      }

      if (creator && profRes.data?.show_created_content) {
        const { data: stories } = await supabase
          .from("stories")
          .select("*")
          .eq("created_by", id)
          .eq("review_status", "approved")
          .order("created_at", { ascending: false });
        if (stories) setCreatedStories(stories.filter((s) => !hiddenSet.has(s.id)));
      }

      setLoading(false);
    };
    load();
  }, [id, currentUser]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">User not found.</p>
    </div>
  );

  const showLists = profile.show_lists;
  const showCreated = profile.show_created_content && isCreator;
  const isOwnProfile = currentUser?.id === id;

  const toggleFollow = async () => {
    if (!currentUser || !id) {
      toast({ title: "Sign in required", description: "Please sign in to follow creators" });
      return;
    }

    try {
      if (isFollowing) {
        await supabase.from("creator_followers").delete().eq("creator_user_id", id).eq("follower_user_id", currentUser.id);
        setIsFollowing(false);
        setFollowCount((prev) => Math.max(0, prev - 1));
        toast({ title: "Unfollowed" });
      } else {
        await supabase.from("creator_followers").insert({ creator_user_id: id, follower_user_id: currentUser.id });
        setIsFollowing(true);
        setFollowCount((prev) => prev + 1);
        toast({ title: "Following!" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.display_name || profile.username || "User"}</h1>
                {isCreator && <Badge variant="default" className="gap-1 !hover:bg-primary">Creator</Badge>}
              </div>
              {profile.bio && <p className="text-muted-foreground text-sm mt-1">{profile.bio}</p>}
              <div className="flex gap-3 mt-3 text-sm text-muted-foreground">
                {isCreator && (
                  <>
                    <div className="font-medium">{createdStories.length} works published</div>
                    <div className="font-medium">{followCount} followers</div>
                    <div className="font-medium">{followingCount} following</div>
                  </>
                )}
              </div>
            </div>
            {}
            {currentUser && !isOwnProfile && (
              <div className="flex-shrink-0 flex gap-2">
                {isCreator && (
                  <Button
                    onClick={toggleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="gap-2"
                  >
                    <Heart className={`h-4 w-4 ${isFollowing ? "fill-red-500 text-red-500" : ""}`} />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}
                <UserBlockButton userId={id} userName={profile.display_name || profile.username || "User"} />
                <ReportDialog reportedUserId={id} variant="outline" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {!showLists && !showCreated ? (
          <p className="text-muted-foreground text-center py-12">This user's profile is private.</p>
        ) : (
          <Tabs defaultValue={showCreated ? "created" : "reading"}>
            <TabsList className="bg-secondary border border-border">
              {showCreated && (
                <TabsTrigger value="created" className="gap-1.5 data-[state=active]:bg-card">
                  <BookOpen className="h-3.5 w-3.5" /> Created
                </TabsTrigger>
              )}
              {showLists && (
                <>
                  <TabsTrigger value="reading" className="gap-1.5 data-[state=active]:bg-card">
                    <BookOpen className="h-3.5 w-3.5" /> Reading
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="gap-1.5 data-[state=active]:bg-card">
                    <CheckCircle className="h-3.5 w-3.5" /> Completed
                  </TabsTrigger>
                  <TabsTrigger value="plan_to_read" className="gap-1.5 data-[state=active]:bg-card">
                    <Bookmark className="h-3.5 w-3.5" /> Planned
                  </TabsTrigger>
                </>
              )}
              {showFavorites && (
                <TabsTrigger value="favorites" className="gap-1.5 data-[state=active]:bg-card">
                  <Heart className="h-3.5 w-3.5" /> Favorites
                </TabsTrigger>
              )}
            </TabsList>

            {showCreated && (
              <TabsContent value="created" className="mt-6">
                {createdStories.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No published stories yet.</p>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {createdStories
                        .slice((createdPage - 1) * ITEMS_PER_PAGE, createdPage * ITEMS_PER_PAGE)
                        .map((story) => <ContentCard key={story.id} story={story} />)}
                    </div>
                    {Math.ceil(createdStories.length / ITEMS_PER_PAGE) > 1 && (
                      <div className="mt-6">
                        <PaginationControls
                          page={createdPage}
                          totalPages={Math.ceil(createdStories.length / ITEMS_PER_PAGE)}
                          onPageChange={setCreatedPage}
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}

            {showLists && (["reading", "completed", "plan_to_read"] as const).map((key) => (
              <TabsContent key={key} value={key} className="mt-6">
                {lists[key].length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No stories in this list.</p>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {lists[key]
                        .slice(
                          (((key === "reading" ? readingPage : key === "completed" ? completedPage : planToReadPage)) - 1) * ITEMS_PER_PAGE,
                          (((key === "reading" ? readingPage : key === "completed" ? completedPage : planToReadPage))) * ITEMS_PER_PAGE
                        )
                        .map((story) => story && <ContentCard key={story.id} story={story} />)}
                    </div>
                    {Math.ceil(lists[key].length / ITEMS_PER_PAGE) > 1 && (
                      <div className="mt-6">
                        <PaginationControls
                          page={(key === "reading" ? readingPage : key === "completed" ? completedPage : planToReadPage)}
                          totalPages={Math.ceil(lists[key].length / ITEMS_PER_PAGE)}
                          onPageChange={(page) => {
                            if (key === "reading") setReadingPage(page);
                            else if (key === "completed") setCompletedPage(page);
                            else setPlanToReadPage(page);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}

            {showFavorites && (
              <TabsContent value="favorites" className="mt-6">
                {Object.values(favorites).every((arr) => arr.length === 0) ? (
                  <p className="text-center py-12 text-muted-foreground">No favorite stories yet.</p>
                ) : (
                  <div className="space-y-8">
                    {(["novel", "manga", "anime"] as const).map((type) => {
                      const currentPage = type === "novel" ? novelFavPage : type === "manga" ? mangaFavPage : animeFavPage;
                      const setCurrentPage = type === "novel" ? setNovelFavPage : type === "manga" ? setMangaFavPage : setAnimeFavPage;
                      const paginatedFavs = favorites[type].slice(
                        (currentPage - 1) * ITEMS_PER_PAGE,
                        currentPage * ITEMS_PER_PAGE
                      );
                      const totalPages = Math.ceil(favorites[type].length / ITEMS_PER_PAGE);

                      return (
                        <div key={type}>
                          <h3 className="text-lg font-bold mb-4 capitalize">{type}s</h3>
                          {favorites[type].length === 0 ? (
                            <p className="text-muted-foreground text-sm">No {type}s in favorites</p>
                          ) : (
                            <div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {paginatedFavs.map((story) => (
                                  <ContentCard key={story.id} story={story} />
                                ))}
                              </div>
                              {totalPages > 1 && (
                                <div className="mt-4">
                                  <PaginationControls
                                    page={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;

