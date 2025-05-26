import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StoryViewer } from './StoryViewer';
import { AddStoryDialog } from './AddStoryDialog';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  expires_at: string;
  views_count: number;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function StoriesContainer() {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchStories();
    
    // Set up realtime subscription for stories
    const channel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    // Clean up expired stories every minute
    const interval = setInterval(() => {
      fetchStories();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    }
  };

  const fetchStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (
            name,
            username,
            avatar
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group stories by user and keep only the latest story per user
      const groupedStories = data?.reduce((acc: Record<string, Story>, story: any) => {
        if (!acc[story.user_id] || new Date(story.created_at) > new Date(acc[story.user_id].created_at)) {
          acc[story.user_id] = story;
        }
        return acc;
      }, {});

      setStories(Object.values(groupedStories || {}));
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load stories',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = async (story: Story) => {
    setSelectedStory(story);
    
    // Mark story as viewed
    if (story.user_id !== currentUser?.id) {
      try {
        await supabase
          .from('story_views')
          .insert({
            story_id: story.id,
            viewer_id: currentUser?.id
          });
        
        // Update views count
        await supabase
          .from('stories')
          .update({ views_count: story.views_count + 1 })
          .eq('id', story.id);
      } catch (error) {
        console.error('Error tracking story view:', error);
      }
    }
  };

  const userHasStory = stories.some(story => story.user_id === currentUser?.id);

  if (loading) {
    return (
      <div className="flex gap-2 p-3 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="w-8 h-2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 p-3 overflow-x-auto bg-background border-b">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-dashed border-social-green cursor-pointer hover:border-social-light-green transition-colors">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <Button
              size="icon"
              onClick={() => setShowAddDialog(true)}
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-social-green hover:bg-social-light-green text-white"
            >
              <Plus className="h-2 w-2" />
            </Button>
          </div>
          <span className="text-xs font-pixelated text-center">
            {userHasStory ? 'Your Story' : 'Add Story'}
          </span>
        </div>

        {/* Stories */}
        {stories.map((story) => (
          <div
            key={story.id}
            className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer"
            onClick={() => handleStoryClick(story)}
          >
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-social-green hover:border-social-light-green transition-colors">
                {story.profiles.avatar ? (
                  <AvatarImage src={story.profiles.avatar} alt={story.profiles.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {story.profiles.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-social-green to-social-blue opacity-20" />
            </div>
            <span className="text-xs font-pixelated text-center truncate max-w-[60px]">
              {story.user_id === currentUser?.id ? 'You' : story.profiles.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer */}
      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          currentUserId={currentUser?.id}
        />
      )}

      {/* Add Story Dialog */}
      <AddStoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onStoryAdded={fetchStories}
        currentUser={currentUser}
      />
    </>
  );
}
