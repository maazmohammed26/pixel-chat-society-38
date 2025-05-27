
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StoryViewer } from './StoryViewer';
import { AddStoryDialog } from './AddStoryDialog';
import { ProfilePictureViewer } from './ProfilePictureViewer';

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  photo_urls: string[] | null;
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
  const [showProfilePicture, setShowProfilePicture] = useState<{
    show: boolean;
    user: any;
    showConfirm: boolean;
  }>({ show: false, user: null, showConfirm: false });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser(profile);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  const fetchStories = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    getCurrentUser();
    fetchStories();
    
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getCurrentUser, fetchStories]);

  const handleStoryClick = useCallback(async (story: Story) => {
    setSelectedStory(story);
    
    if (story.user_id !== currentUser?.id) {
      try {
        const { data, error } = await supabase.rpc('increment_story_views', {
          story_uuid: story.id,
          viewer_uuid: currentUser?.id
        });
        
        if (error) {
          console.error('Error tracking story view:', error);
        } else {
          setStories(prevStories => 
            prevStories.map(s => 
              s.id === story.id 
                ? { ...s, views_count: data || s.views_count + 1 }
                : s
            )
          );
        }
      } catch (error) {
        console.error('Error tracking story view:', error);
      }
    }
  }, [currentUser?.id]);

  const handleAvatarClick = useCallback((story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (story.user_id === currentUser?.id) {
      // For own story, open the story viewer directly
      handleStoryClick(story);
    } else {
      // For others, show profile picture confirmation
      setShowProfilePicture({ 
        show: false, 
        user: {
          id: story.user_id,
          name: story.profiles.name,
          avatar: story.profiles.avatar
        }, 
        showConfirm: true 
      });
    }
  }, [currentUser?.id, handleStoryClick]);

  const handleAddStoryClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddDialog(true);
  }, []);

  const confirmViewProfilePicture = useCallback(() => {
    setShowProfilePicture(prev => ({ 
      show: true, 
      user: prev.user, 
      showConfirm: false 
    }));
  }, []);

  const closeProfilePicture = useCallback(() => {
    setShowProfilePicture({ show: false, user: null, showConfirm: false });
  }, []);

  const userHasStory = useMemo(() => 
    stories.some(story => story.user_id === currentUser?.id), 
    [stories, currentUser?.id]
  );

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
            <Avatar className="w-12 h-12 border-2 border-dashed border-social-green">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} loading="eager" />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <Button
              size="icon"
              onClick={handleAddStoryClick}
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
          >
            <div className="relative">
              <Avatar 
                className="w-12 h-12 border-2 border-social-green hover:border-social-light-green transition-colors"
                onClick={(e) => handleAvatarClick(story, e)}
              >
                {story.profiles.avatar ? (
                  <AvatarImage src={story.profiles.avatar} alt={story.profiles.name} loading="eager" />
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
          onStoryDeleted={fetchStories}
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

      {/* Profile Picture Viewer */}
      <ProfilePictureViewer
        show={showProfilePicture.show}
        showConfirm={showProfilePicture.showConfirm}
        user={showProfilePicture.user}
        onConfirm={confirmViewProfilePicture}
        onClose={closeProfilePicture}
      />
    </>
  );
}
