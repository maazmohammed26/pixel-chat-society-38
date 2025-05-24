
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CommentProps {
  id: string;
  content: string;
  created_at: string;
  likes: number;
  liked?: boolean;
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
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{[key: string]: string}>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    
    // Real-time updates
    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const likesChannel = supabase
      .channel('likes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchPosts();
      })
      .subscribe();

    const commentsChannel = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchPosts();
      })
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
          profiles!posts_user_id_fkey(name, username, avatar)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          // Get likes count and check if current user liked
          const { count: likesCount } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', currentUser?.id)
            .single();

          // Get comments with likes
          const { data: comments } = await supabase
            .from('comments')
            .select(`
              id,
              content,
              created_at,
              user_id
            `)
            .eq('post_id', post.id)
            .order('created_at');

          const commentsWithData = await Promise.all(
            (comments || []).map(async (comment: any) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, name, username, avatar')
                .eq('id', comment.user_id)
                .single();

              const { count: commentLikes } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('comment_id', comment.id);

              const { data: userCommentLike } = await supabase
                .from('likes')
                .select('id')
                .eq('comment_id', comment.id)
                .eq('user_id', currentUser?.id)
                .single();

              return {
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                likes: commentLikes || 0,
                liked: !!userCommentLike,
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
            author: {
              id: post.user_id,
              name: post.profiles?.name || 'User',
              username: post.profiles?.username || 'guest',
              avatar: post.profiles?.avatar || ''
            },
            likes: likesCount || 0,
            liked: !!userLike,
            comments: commentsWithData,
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

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.liked) {
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

      // Update local state immediately for better UX
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentLike = async (commentId: string, postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      const comment = post?.comments.find(c => c.id === commentId);
      if (!comment) return;

      if (comment.liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            comment_id: commentId,
            user_id: currentUser.id
          });
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleAddComment = async (postId: string) => {
    const commentText = newComment[postId];
    if (!commentText?.trim() || !currentUser) return;

    try {
      await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: commentText.trim()
        });

      setNewComment(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newPost.trim() || !currentUser) return;

    try {
      setIsSubmitting(true);

      await supabase
        .from('posts')
        .insert({
          content: newPost.trim(),
          user_id: currentUser.id
        });

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
      await supabase
        .from('posts')
        .delete()
        .eq('id', deletePostId);

      setDeletePostId(null);
      toast({
        title: 'Deleted',
        description: 'Post has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const toggleComments = (postId: string) => {
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p.id === postId 
          ? { ...p, showComments: !p.showComments }
          : p
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2 p-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted"></div>
                <div className="space-y-1">
                  <div className="h-2 w-16 bg-muted rounded"></div>
                  <div className="h-2 w-12 bg-muted rounded"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0">
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
    <div className="space-y-2">
      {/* Create Post */}
      <Card className="card-gradient">
        <CardContent className="p-2">
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
                className="min-h-[40px] border-none bg-muted/30 resize-none focus-visible:ring-1 font-pixelated text-xs p-2"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
              />
              <div className="flex justify-end mt-1">
                <Button 
                  onClick={handleSubmit}
                  disabled={!newPost.trim() || isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white font-pixelated text-xs h-6 px-2"
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
        <Card className="text-center py-4">
          <CardContent>
            <p className="text-muted-foreground font-pixelated text-xs">No posts yet. Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id} className="card-gradient">
            <CardHeader className="pb-1 p-2">
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
                  <p className="text-xs text-muted-foreground font-pixelated">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                  {currentUser?.id === post.author.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:text-destructive"
                      onClick={() => setDeletePostId(post.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-2">
              <p className="whitespace-pre-wrap break-words font-pixelated text-xs leading-relaxed">{post.content}</p>
            </CardContent>
            <CardFooter className="pt-0 p-2">
              <div className="flex items-center gap-3 w-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`font-pixelated text-xs h-5 px-2 ${post.liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                  onClick={() => handleLike(post.id)}
                >
                  <Heart className={`h-3 w-3 mr-1 ${post.liked ? 'fill-current' : ''}`} />
                  {post.likes}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-primary font-pixelated text-xs h-5 px-2"
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {post.comments.length}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-pixelated text-xs h-5 px-2">
                  <Share className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </CardFooter>

            {/* Comments Section */}
            {post.showComments && (
              <div className="px-2 pb-2 border-t">
                <div className="space-y-2 mt-2">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <Avatar className="h-4 w-4">
                        {comment.author.avatar ? (
                          <AvatarImage src={comment.author.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                            {comment.author.name ? comment.author.name.substring(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-pixelated text-xs">{comment.author.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <p className="font-pixelated text-xs">{comment.content}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`mt-1 h-4 px-1 text-xs ${comment.liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                          onClick={() => handleCommentLike(comment.id, post.id)}
                        >
                          <Heart className={`h-2 w-2 mr-1 ${comment.liked ? 'fill-current' : ''}`} />
                          {comment.likes}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Comment */}
                  <div className="flex gap-2 mt-2">
                    <Avatar className="h-4 w-4">
                      {currentUser?.avatar ? (
                        <AvatarImage src={currentUser.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white font-pixelated text-xs">
                          {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 flex gap-1">
                      <Textarea
                        placeholder="Write a comment..."
                        className="flex-1 min-h-[30px] text-xs font-pixelated resize-none"
                        value={newComment[post.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-[30px] w-[30px] p-0 bg-primary"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newComment[post.id]?.trim()}
                      >
                        <Send className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              className="font-pixelated text-xs h-6"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              className="font-pixelated text-xs h-6"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
