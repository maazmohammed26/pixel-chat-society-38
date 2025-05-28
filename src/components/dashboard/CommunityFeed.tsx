import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, MoreHorizontal, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    email?: string;
    created_at?: string;
  };
  likes: Array<{
    id: string;
    user_id: string;
  }>;
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

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchPosts();
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

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            username,
            avatar,
            email,
            created_at
          ),
          likes (
            id,
            user_id
          ),
          comments (
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (
              name,
              username,
              avatar
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load posts',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;

    try {
      const post = posts.find(p => p.id === postId);
      const isLiked = post?.likes.some(like => like.user_id === currentUser.id);

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: currentUser.id });

        if (error) throw error;
      }

      // Refresh posts to get updated likes
      fetchPosts();
    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update like',
      });
    }
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || !currentUser) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content
        });

      if (error) throw error;

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add comment',
      });
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
        title: 'Post deleted',
        description: 'Your post has been deleted',
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

  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="w-full animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="space-y-1">
                  <div className="w-24 h-3 bg-muted rounded" />
                  <div className="w-16 h-2 bg-muted rounded" />
                </div>
              </div>
              <div className="w-full h-20 bg-muted rounded mb-3" />
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-muted rounded" />
                <div className="w-8 h-8 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => {
          const isLiked = post.likes.some(like => like.user_id === currentUser?.id);
          const likesCount = post.likes.length;
          const commentsCount = post.comments.length;

          return (
            <Card key={post.id} className="w-full border-border">
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleUserClick(post.profiles)}
                  >
                    <Avatar className="w-10 h-10">
                      {post.profiles.avatar ? (
                        <AvatarImage src={post.profiles.avatar} alt={post.profiles.name} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-sm">
                          {post.profiles.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <h3 className="font-pixelated text-sm text-foreground hover:underline">
                        {post.profiles.name}
                      </h3>
                      <p className="font-pixelated text-xs text-muted-foreground">
                        @{post.profiles.username} • {timeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUserClick(post.profiles)}
                        className="font-pixelated"
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      {currentUser?.id === post.user_id && (
                        <DropdownMenuItem
                          onClick={() => setDeletePostId(post.id)}
                          className="font-pixelated text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Post Content */}
                <div className="mb-3">
                  <p className="font-pixelated text-sm text-foreground whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="mb-3">
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-full rounded-lg object-cover max-h-96"
                    />
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`font-pixelated text-xs ${isLiked ? 'text-red-500' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                    {likesCount > 0 && <span>{likesCount}</span>}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="font-pixelated text-xs"
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {commentsCount > 0 && <span>{commentsCount}</span>}
                  </Button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="mt-4 space-y-3">
                    {/* Existing Comments */}
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-6 h-6">
                          {comment.profiles.avatar ? (
                            <AvatarImage src={comment.profiles.avatar} alt={comment.profiles.name} />
                          ) : (
                            <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                              {comment.profiles.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-2">
                            <p className="font-pixelated text-xs font-medium">
                              {comment.profiles.name}
                            </p>
                            <p className="font-pixelated text-xs text-foreground">
                              {comment.content}
                            </p>
                          </div>
                          <p className="font-pixelated text-xs text-muted-foreground mt-1">
                            {timeAgo(comment.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Avatar className="w-6 h-6">
                        {currentUser?.avatar ? (
                          <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        ) : (
                          <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                            {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs(prev => ({ 
                            ...prev, 
                            [post.id]: e.target.value 
                          }))}
                          className="font-pixelated text-xs resize-none"
                          rows={1}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="font-pixelated text-xs"
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
        user={selectedUser}
      />

      {/* Delete Post Confirmation */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
