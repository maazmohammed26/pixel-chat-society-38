
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageSquare, Send, Image, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
  likes: Array<{ id: string; user_id: string }>;
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      name: string;
      username: string;
      avatar: string | null;
    };
  }>;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    
    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('posts-channel')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' }, 
        () => fetchPosts()
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'posts' }, 
        () => fetchPosts()
      )
      .subscribe();

    const likesChannel = supabase
      .channel('likes-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'likes' }, 
        () => fetchPosts()
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('comments-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'comments' }, 
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser({ ...user, profile });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            name,
            username,
            avatar
          ),
          likes (*),
          comments (
            *,
            profiles:user_id (
              name,
              username,
              avatar
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() || !currentUser) return;

    try {
      setPosting(true);
      const { error } = await supabase
        .from('posts')
        .insert({
          content: newPost.trim(),
          user_id: currentUser.id
        });

      if (error) throw error;
      
      setNewPost('');
      toast({
        title: 'Post created',
        description: 'Your post has been shared successfully!',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post',
      });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      const isLiked = post?.likes.some(like => like.user_id === currentUser.id);

      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = commentInputs[postId];
    if (!commentText?.trim() || !currentUser) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: commentText.trim(),
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) throw error;
      
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;

    try {
      // Delete likes first
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId);

      // Delete comments
      await supabase
        .from('comments')
        .delete()
        .eq('post_id', postId);

      // Delete the post
      await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id);

      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete post',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
              </div>
              <div className="h-4 w-full bg-muted rounded mb-2"></div>
              <div className="h-3 w-3/4 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create Post */}
      <Card className="card-gradient">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Avatar className="h-8 w-8">
              {currentUser?.profile?.avatar ? (
                <AvatarImage src={currentUser.profile.avatar} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {currentUser?.profile?.name ? currentUser.profile.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="What's on your mind?"
                className="min-h-[60px] font-pixelated text-xs resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2" disabled>
                    <Image className="h-3 w-3 mr-1" />
                    <Badge variant="secondary" className="text-xs font-pixelated">Coming Soon</Badge>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2" disabled>
                    <Video className="h-3 w-3 mr-1" />
                    <Badge variant="secondary" className="text-xs font-pixelated">Coming Soon</Badge>
                  </Button>
                </div>
                <Button
                  onClick={handlePost}
                  disabled={!newPost.trim() || posting}
                  className="h-6 px-3 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.map((post) => (
        <Card key={post.id} className="card-gradient">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {post.profiles?.avatar ? (
                    <AvatarImage src={post.profiles.avatar} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                      {post.profiles?.name ? post.profiles.name.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-pixelated text-xs font-medium">{post.profiles?.name}</p>
                  <p className="text-xs text-muted-foreground font-pixelated">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              {currentUser?.id === post.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePost(post.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  ×
                </Button>
              )}
            </div>
            
            <p className="text-sm font-pixelated mb-3 whitespace-pre-wrap">{post.content}</p>
            
            <div className="flex items-center gap-4 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLike(post.id)}
                className={`h-6 px-2 font-pixelated text-xs ${
                  post.likes.some(like => like.user_id === currentUser?.id)
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                <Heart className={`h-3 w-3 mr-1 ${
                  post.likes.some(like => like.user_id === currentUser?.id) ? 'fill-current' : ''
                }`} />
                {post.likes.length}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-pixelated text-xs text-muted-foreground"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {post.comments.length}
              </Button>
            </div>

            {/* Comments */}
            {post.comments.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.comments.map((comment: Comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-6 w-6">
                      {comment.profiles?.avatar ? (
                        <AvatarImage src={comment.profiles.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {comment.profiles?.name ? comment.profiles.name.substring(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 bg-muted rounded-lg p-2">
                      <p className="font-pixelated text-xs font-medium">{comment.profiles?.name}</p>
                      <p className="text-xs font-pixelated">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment */}
            <div className="flex gap-2 mt-3">
              <Avatar className="h-6 w-6">
                {currentUser?.profile?.avatar ? (
                  <AvatarImage src={currentUser.profile.avatar} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {currentUser?.profile?.name ? currentUser.profile.name.substring(0, 2).toUpperCase() : 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 flex gap-1">
                <Textarea
                  placeholder="Write a comment..."
                  className="min-h-[24px] text-xs font-pixelated resize-none"
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                />
                <Button
                  onClick={() => handleComment(post.id)}
                  disabled={!commentInputs[post.id]?.trim()}
                  size="sm"
                  className="h-6 w-6 p-0 bg-social-green hover:bg-social-light-green text-white"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {posts.length === 0 && (
        <Card className="card-gradient">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground font-pixelated text-sm">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
