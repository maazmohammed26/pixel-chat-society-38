import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send, ChevronDown, ChevronUp, Image, Trash, Edit, CheckCircle, X, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export function PostCard({ post, onAction }: { 
  post: PostProps; 
  onAction?: () => void;
}) {
  const [isLiked, setIsLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(post.showComments || false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentProps[]>(post.comments || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const likeUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if current user is the post author
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    checkUser();
  }, []);
  
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Optimistic update for immediate UI feedback
      const wasLiked = isLiked;
      const prevCount = likeCount;
      
      // Update UI immediately for better UX
      setIsLiked(!wasLiked);
      setLikeCount(prevCount + (wasLiked ? -1 : 1));
      
      // Clear any pending timeouts
      if (likeUpdateTimeoutRef.current) {
        clearTimeout(likeUpdateTimeoutRef.current);
      }
      
      // Debounce actual API call
      likeUpdateTimeoutRef.current = setTimeout(async () => {
        try {
          if (!wasLiked) {
            // Like
            await supabase
              .from('likes')
              .insert({ user_id: user.id, post_id: post.id });
          } else {
            // Unlike
            await supabase
              .from('likes')
              .delete()
              .match({ user_id: user.id, post_id: post.id });
          }
        } catch (error) {
          // If API call fails, revert the UI changes
          console.error('Error updating like:', error);
          setIsLiked(wasLiked);
          setLikeCount(prevCount);
        }
      }, 300); // Short delay to reduce API calls but still feel responsive
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };
  
  const handleShare = () => {
    toast({
      title: 'Shared!',
      description: 'Post has been shared.',
    });
  };
  
  const toggleComments = async () => {
    if (!showComments) {
      await fetchComments();
    }
    setShowComments(!showComments);
  };
  
  const fetchComments = async () => {
    try {
      setIsLoadingComments(true);
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          author:user_id (id, name, username, avatar)
        `)
        .eq('post_id', post.id);
        
      if (error) throw error;
      
      // Format the comments
      const formattedComments: CommentProps[] = data.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          id: comment.author.id,
          name: comment.author.name || 'User',
          username: comment.author.username || 'guest',
          avatar: comment.author.avatar || ''
        }
      }));
      
      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load comments',
      });
    } finally {
      setIsLoadingComments(false);
    }
  };
  
  const submitComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to comment',
        });
        return;
      }
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, username, avatar')
        .eq('id', user.id)
        .single();
        
      // Insert comment
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentText.trim()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add the new comment to the list
      const newComment: CommentProps = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        author: {
          id: user.id,
          name: profile.name || 'User',
          username: profile.username || 'guest',
          avatar: profile.avatar || ''
        }
      };
      
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to post comment',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', post.id);
        
      if (error) throw error;
      
      setIsEditing(false);
      if (onAction) onAction();
      
      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully',
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update post',
      });
    }
  };
  
  const handleDeletePost = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
        
      if (error) throw error;
      
      setIsDeleting(false);
      if (onAction) onAction();
      
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

  const handleCommentClick = () => {
    toggleComments();
    setTimeout(() => {
      if (!showComments && commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 100);
  };

  // Set up real-time comment updates
  useEffect(() => {
    if (!post.id) return;
    
    const commentChannel = supabase
      .channel(`post-${post.id}-comments`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
        async (payload) => {
          // Only refetch if it's not our own comment (which we already added to the UI)
          const newComment = payload.new as any;
          const existingComment = comments.find(c => c.id === newComment.id);
          
          if (!existingComment) {
            await fetchComments();
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(commentChannel);
    };
  }, [post.id, comments]);

  // Set up real-time updates for likes on this specific post
  useEffect(() => {
    if (!post.id) return;
    
    const likesChannel = supabase
      .channel(`post-${post.id}-likes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` },
        async () => {
          // Get the current like count without full post refetch
          const { count: newCount } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          // Get current user's like status
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: userLike } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .maybeSingle();
              
            // Only update if different from current state to avoid UI flicker
            if (typeof newCount === 'number' && newCount !== likeCount) {
              setLikeCount(newCount);
            }
            
            const hasLiked = !!userLike;
            if (hasLiked !== isLiked) {
              setIsLiked(hasLiked);
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(likesChannel);
      // Clear any pending timeouts on unmount
      if (likeUpdateTimeoutRef.current) {
        clearTimeout(likeUpdateTimeoutRef.current);
      }
    };
  }, [post.id, likeCount, isLiked]);

  // Format the timestamp
  const timestamp = post.created_at ? 
    formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : '';
  
  // Convert UTC date to local time for tooltip
  const fullDate = post.created_at ? 
    format(new Date(post.created_at), 'PPpp') : '';

  return (
    <Card className="mb-4 border-muted/60 hover:border-muted transition-colors overflow-hidden">
      <CardHeader className="pb-3 space-y-0 flex flex-row items-center gap-3">
        <Avatar>
          {post.author.avatar ? (
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
          ) : (
            <AvatarFallback className="bg-primary/20 text-primary">
              {post.author.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1">
          <p className="font-medium font-pixelated">{post.author.name}</p>
          <p className="text-xs text-muted-foreground font-pixelated">
            @{post.author.username} · <span title={fullDate}>{timestamp}</span>
          </p>
        </div>
        {currentUserId === post.author.id && (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground hover:text-primary"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsDeleting(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <Textarea 
              value={editContent} 
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[100px] font-pixelated"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleUpdatePost}
                className="bg-social-green text-white"
              >
                Update Post
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-line font-pixelated">{post.content}</p>
            {post.image_url && (
              <div className="mt-4">
                <img 
                  src={post.image_url} 
                  alt="Post attachment" 
                  className="rounded-md max-h-96 w-auto object-contain pixel-border"
                  loading="lazy" 
                />
              </div>
            )}
            {post.video_url && (
              <div className="mt-4">
                <video 
                  src={post.video_url} 
                  alt="Post attachment" 
                  className="rounded-md max-h-96 w-auto object-contain pixel-border"
                  controls
                  muted
                  loop
                />
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLike} 
            className={`flex items-center gap-1 text-muted-foreground ${isLiked ? 'text-social-magenta' : 'hover:text-social-magenta'}`}
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-social-magenta text-social-magenta' : ''}`} 
            />
            {likeCount > 0 && <span className={`text-xs ${isLiked ? 'text-social-magenta' : ''} font-pixelated`}>{likeCount}</span>}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCommentClick} 
            className="flex items-center gap-1 text-muted-foreground hover:text-social-blue"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && <span className="text-xs font-pixelated">{comments.length}</span>}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleShare} 
            className="flex items-center gap-1 text-muted-foreground hover:text-social-green"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
      {showComments && (
        <div className="px-4 pb-4 pt-1 bg-muted/10">
          <Separator className="mb-3" />
          
          {/* Comments */}
          <div className="space-y-4 mb-4">
            {isLoadingComments ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-muted"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-24 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Avatar className="h-8 w-8">
                    {comment.author.avatar ? (
                      <AvatarImage src={comment.author.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary/20 text-primary font-pixelated">
                        {comment.author.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm font-pixelated">{comment.author.name}</p>
                        <span className="text-xs text-muted-foreground font-pixelated" title={format(new Date(comment.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap font-pixelated">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-2 font-pixelated">@{comment.author.username}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-2 font-pixelated">No comments yet</p>
            )}
          </div>
          
          {/* Comment input */}
          <div className="flex gap-2">
            <Textarea 
              ref={commentInputRef}
              placeholder="Write a comment..." 
              className="min-h-[60px] text-sm font-pixelated"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <Button 
              size="icon" 
              className="self-end hover:bg-social-blue bg-social-blue/90 text-white pixel-shadow"
              onClick={submitComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-md font-pixelated">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between mt-4">
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePost}
              className="font-pixelated"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function PostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [isVideMuted, setIsVideoMuted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  
  // Handle media selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset other media type
    if (type === 'image') {
      setVideo(null);
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Image must be less than 5MB'
        });
        return;
      }
      
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview({ type: 'image', url: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else if (type === 'video') {
      setImage(null);
      
      // Check file size (10MB limit) and duration
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Video must be less than 10MB'
        });
        return;
      }
      
      setVideo(file);
      
      // Create preview
      const URL = window.URL || window.webkitURL;
      const videoUrl = URL.createObjectURL(file);
      setMediaPreview({ type: 'video', url: videoUrl });
      
      // Check video duration
      const videoEl = document.createElement('video');
      videoEl.src = videoUrl;
      videoEl.onloadedmetadata = () => {
        if (videoEl.duration > 15) {
          toast({
            variant: 'destructive',
            title: 'Video too long',
            description: 'Videos must be 15 seconds or less'
          });
          setVideo(null);
          setMediaPreview(null);
          if (videoInputRef.current) {
            videoInputRef.current.value = '';
          }
        }
      };
    }
  };
  
  // Handle removing media
  const removeMedia = () => {
    setImage(null);
    setVideo(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };
  
  // Toggle video mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsVideMuted(!isVideMuted);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image && !video) return;
    
    setIsPosting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to post',
        });
        return;
      }
      
      let imageUrl = null;
      let videoUrl = null;
      
      // If we have media, convert it to base64 for storage
      if (image && mediaPreview?.type === 'image') {
        imageUrl = mediaPreview.url;
      } else if (video && mediaPreview?.type === 'video') {
        videoUrl = mediaPreview.url;
      }
      
      // Insert the post
      await supabase
        .from('posts')
        .insert([
          { 
            user_id: user.id, 
            content,
            image_url: imageUrl,
            video_url: videoUrl
          }
        ]);
      
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community.',
      });
      
      setContent('');
      setImage(null);
      setVideo(null);
      setMediaPreview(null);
      
      // Callback to refresh posts
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-6 overflow-hidden border-muted/60">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <Textarea 
            placeholder="What's on your mind?" 
            className="min-h-[120px] resize-none focus-visible:ring-social-blue font-pixelated"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          
          {/* Media preview */}
          {mediaPreview && (
            <div className="mt-4 relative">
              {mediaPreview.type === 'image' ? (
                <img 
                  src={mediaPreview.url} 
                  alt="Preview" 
                  className="rounded-md max-h-60 w-auto object-contain pixel-border"
                />
              ) : (
                <div className="relative">
                  <video 
                    ref={videoRef}
                    src={mediaPreview.url} 
                    className="rounded-md max-h-60 w-auto object-contain pixel-border"
                    controls
                    muted={isVideMuted}
                    loop
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 left-2 bg-background opacity-90 text-xs"
                    onClick={toggleMute}
                  >
                    {isVideMuted ? "Unmute" : "Mute"}
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-90"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Hidden file inputs */}
          <input 
            type="file"
            ref={fileInputRef} 
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'image')}
          />
          <input 
            type="file"
            ref={videoInputRef} 
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'video')}
          />
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4 bg-muted/10">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPosting || !!video}
              className="font-pixelated"
            >
              <Image className="h-4 w-4 mr-2" />
              Add Image
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => videoInputRef.current?.click()}
              disabled={isPosting || !!image}
              className="font-pixelated"
            >
              <Video className="h-4 w-4 mr-2" />
              Add Video (15s)
            </Button>
          </div>
          <Button 
            type="submit" 
            className="px-6 bg-gradient-to-r from-social-blue to-social-magenta hover:opacity-90 text-white font-pixelated"
            disabled={(!content.trim() && !image && !video) || isPosting}
          >
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function CommunityFeed() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostProps[]>([]);
  const { toast } = useToast();
  const postsRef = useRef<PostProps[]>([]);
  
  const fetchPosts = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          image_url,
          video_url,
          author:user_id (id, name, username, avatar)
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      
      // Get likes count and user's like status for each post
      const postsWithLikes = await Promise.all(postsData.map(async (post) => {
        // Count likes
        const { count: likesCount } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
          
        // Count comments
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
          
        // Check if current user has liked this post
        let hasLiked = false;
        if (user) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();
            
          hasLiked = !!userLike;
        }
        
        // Create a properly formatted post object  
        return {
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          image_url: post.image_url,
          video_url: post.video_url,
          author: {
            id: post.author?.id || 'unknown',
            name: post.author?.name || 'User',
            username: post.author?.username || 'guest',
            avatar: post.author?.avatar || ''
          },
          likes: likesCount || 0,
          comments: [],
          liked: hasLiked
        };
      }));
      
      // Use this approach to avoid unnecessary re-renders when data hasn't changed
      if (JSON.stringify(postsWithLikes) !== JSON.stringify(postsRef.current)) {
        setPosts(postsWithLikes);
        postsRef.current = postsWithLikes;
        
        if (showToast) {
          toast({
            title: "Feed updated",
            description: "New posts have been loaded",
          });
        }
      }
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
  }, [toast]);
  
  useEffect(() => {
    fetchPosts();
    
    // Set up realtime subscription for posts, comments and likes
    const channel = supabase
      .channel('public:posts-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' }, 
        (payload) => {
          // When a new post is created, add it to the list without full refetch
          const newPost = payload.new as any;
          fetchPosts();
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          // When a post is updated, find it and update it
          const updatedPost = payload.new as any;
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post.id === updatedPost.id ? {
                ...post,
                content: updatedPost.content,
                image_url: updatedPost.image_url,
                video_url: updatedPost.video_url,
              } : post
            )
          );
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          // When a post is deleted, remove it from the list
          const deletedId = (payload.old as any).id;
          setPosts(prevPosts => 
            prevPosts.filter(post => post.id !== deletedId)
          );
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  return (
    <div className="animate-fade-in">
      <PostForm onPostCreated={fetchPosts} />
      <h2 className="text-xl font-semibold mb-4 font-pixelated">Community Feed</h2>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="mb-4 animate-pulse">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div>
                  <div className="h-5 bg-muted rounded w-24"></div>
                  <div className="h-3 bg-muted rounded w-32 mt-1"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
              <CardFooter className="flex gap-4">
                <div className="h-8 w-16 bg-muted rounded"></div>
                <div className="h-8 w-16 bg-muted rounded"></div>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onAction={fetchPosts} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed border-2">
          <p className="text-muted-foreground mb-4 font-pixelated">No posts yet!</p>
          <p className="font-pixelated">Be the first to share something with the community.</p>
        </Card>
      )}
    </div>
  );
}

export default CommunityFeed;
