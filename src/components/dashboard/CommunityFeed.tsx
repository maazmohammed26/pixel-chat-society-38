
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send, Image, Video, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CommentProps {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  }
}

interface PostProps {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  created_at: string;
  likes: number;
  comments: CommentProps[];
  liked?: boolean;
  showComments?: boolean;
  image_url?: string;
  video_url?: string;
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, username, avatar')
          .eq('id', user.id)
          .single();
          
        setCurrentUser({
          id: user.id,
          name: profile?.name || 'User',
          username: profile?.username || 'guest',
          avatar: profile?.avatar || ''
        });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          image_url,
          video_url,
          profiles!posts_user_id_fkey(name, username, avatar)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: comments } = await supabase
            .from('comments')
            .select(`
              id,
              content,
              created_at,
              user_id
            `)
            .eq('post_id', post.id);

          const commentsWithProfiles = await Promise.all(
            (comments || []).map(async (comment: any) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, username, avatar')
                .eq('id', comment.user_id)
                .single();

              return {
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: {
                  id: profile?.id || comment.user_id,
                  name: profile?.name || 'User',
                  username: profile?.username || 'guest',
                  avatar: profile?.avatar || ''
                }
              };
            })
          );

          return {
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            image_url: post.image_url,
            video_url: post.video_url,
            author: {
              id: post.user_id,
              name: post.profiles?.name || 'User',
              username: post.profiles?.username || 'guest',
              avatar: post.profiles?.avatar || ''
            },
            likes: likesCount || 0,
            comments: commentsWithProfiles,
            liked: false,
            showComments: false
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPost.trim() || !currentUser) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('posts')
        .insert({
          content: newPost.trim(),
          user_id: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      const newPostData: PostProps = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        likes: 0,
        comments: [],
        liked: false,
        showComments: false
      };

      setPosts(prev => [newPostData, ...prev]);
      setNewPost('');

      toast({
        title: 'Posted!',
        description: 'Your post has been shared.',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletePostId);

      if (error) throw error;

      setPosts(prev => prev.filter(post => post.id !== deletePostId));
      setDeletePostId(null);

      toast({
        title: 'Deleted',
        description: 'Post has been deleted.',
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2 p-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted"></div>
                <div className="space-y-1">
                  <div className="h-2 w-16 bg-muted rounded"></div>
                  <div className="h-2 w-12 bg-muted rounded"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                <div className="h-2 w-full bg-muted rounded"></div>
                <div className="h-2 w-3/4 bg-muted rounded"></div>
              </div>
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
          <div className="flex gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0">
              {currentUser?.avatar ? (
                <AvatarImage src={currentUser.avatar} />
              ) : (
                <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                  {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <Textarea
                placeholder="What's on your mind?"
                className="min-h-[50px] border-none bg-muted/30 resize-none focus-visible:ring-1 font-pixelated text-xs p-2"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-pixelated text-xs h-6 px-2" disabled>
                    <Image className="h-3 w-3 mr-1" />
                    Image
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-pixelated text-xs h-6 px-2" disabled>
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </Button>
                </div>
                <Button 
                  onClick={handleSubmit}
                  disabled={!newPost.trim() || isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white font-pixelated text-xs h-6 px-3"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card className="text-center py-6">
          <CardContent>
            <p className="text-muted-foreground font-pixelated text-xs">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id} className="card-gradient">
            <CardHeader className="pb-2 p-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {post.author.avatar ? (
                    <AvatarImage src={post.author.avatar} />
                  ) : (
                    <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                      {post.author.name ? post.author.name.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-pixelated text-xs truncate">{post.author.name}</p>
                  <p className="text-xs text-muted-foreground font-pixelated truncate">@{post.author.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground font-pixelated whitespace-nowrap">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                  {currentUser?.id === post.author.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeletePostId(post.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-3">
              <p className="whitespace-pre-wrap break-words font-pixelated text-xs leading-relaxed">{post.content}</p>
              {post.image_url && (
                <img 
                  src={post.image_url} 
                  alt="Post image" 
                  className="mt-2 rounded-lg max-w-full h-auto"
                />
              )}
              {post.video_url && (
                <video 
                  src={post.video_url} 
                  controls 
                  className="mt-2 rounded-lg max-w-full h-auto"
                />
              )}
            </CardContent>
            <CardFooter className="pt-0 p-3">
              <div className="flex items-center gap-3 w-full">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 font-pixelated text-xs h-6 px-2">
                  <Heart className="h-3 w-3 mr-1" />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-pixelated text-xs h-6 px-2">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {post.comments.length}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-pixelated text-xs h-6 px-2">
                  <Share className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-sm">Delete Post?</DialogTitle>
          </DialogHeader>
          <p className="font-pixelated text-xs text-muted-foreground">
            This action cannot be undone. The post will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletePostId(null)}
              className="font-pixelated text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              className="font-pixelated text-xs h-8"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
