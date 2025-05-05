
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

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
  const { toast } = useToast();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .match({ user_id: user.id, post_id: post.id });
        
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: post.id });
        
        setLikeCount(prev => prev + 1);
      }
      
      setIsLiked(!isLiked);
      
      toast({
        title: isLiked ? 'Post unliked' : 'Post liked!',
        description: isLiked ? 'You have unliked this post' : 'You have liked this post',
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update like',
      });
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
          profiles:user_id (id, name, username, avatar)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      const formattedComments = data.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: {
          id: comment.profiles.id,
          name: comment.profiles.name,
          username: comment.profiles.username,
          avatar: comment.profiles.avatar,
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
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
        }
      };
      
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      
      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added.',
      });
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

  const handleCommentClick = () => {
    toggleComments();
    setTimeout(() => {
      if (!showComments && commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 100);
  };

  // Format the timestamp
  const timestamp = post.created_at ? 
    formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : '';
  
  // Convert UTC date to local time for tooltip
  const fullDate = post.created_at ? 
    format(new Date(post.created_at), 'PPpp') : '';

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3 space-y-0 flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={post.author.avatar} alt={post.author.name} />
          <AvatarFallback>{post.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{post.author.name}</p>
          <p className="text-xs text-muted-foreground">
            @{post.author.username} · <span title={fullDate}>{timestamp}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line">{post.content}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between pt-2">
        <div className="flex gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLike} 
            className="flex items-center gap-1 text-muted-foreground hover:text-social-magenta"
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-social-magenta text-social-magenta' : ''}`} 
            />
            {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCommentClick} 
            className="flex items-center gap-1 text-muted-foreground hover:text-social-blue"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 && <span className="text-xs">{comments.length}</span>}
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
        <div className="px-4 pb-4 pt-1">
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
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatar} />
                    <AvatarFallback>{comment.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{comment.author.name}</p>
                        <span className="text-xs text-muted-foreground" title={format(new Date(comment.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-2">@{comment.author.username}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-2">No comments yet</p>
            )}
          </div>
          
          {/* Comment input */}
          <div className="flex gap-2">
            <Textarea 
              ref={commentInputRef}
              placeholder="Write a comment..." 
              className="min-h-[60px] text-sm"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <Button 
              size="icon" 
              className="self-end hover:bg-social-blue"
              onClick={submitComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
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
      
      // Insert the post
      await supabase
        .from('posts')
        .insert([
          { user_id: user.id, content }
        ]);
      
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community.',
      });
      
      setContent('');
      
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
    <Card className="mb-6">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6">
          <Textarea 
            placeholder="What's on your mind?" 
            className="min-h-[120px] resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex justify-end border-t px-6 py-4">
          <Button 
            type="submit" 
            className="px-6 btn-gradient"
            disabled={!content.trim() || isPosting}
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
  
  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          profiles:user_id (id, name, username, avatar)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Get likes count for each post
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
          
        return {
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          author: {
            id: post.profiles.id,
            name: post.profiles.name,
            username: post.profiles.username,
            avatar: post.profiles.avatar,
          },
          likes: likesCount || 0,
          comments: [],
          liked: hasLiked
        };
      }));
      
      setPosts(postsWithLikes);
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
  
  useEffect(() => {
    fetchPosts();
    
    // Set up realtime subscription for new posts
    const postsSubscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();
    
    // Set up subscriptions for new comments and likes
    const commentsSubscription = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => {
        fetchPosts(); 
      })
      .subscribe();
      
    const likesSubscription = supabase
      .channel('public:likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchPosts();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(commentsSubscription);
      supabase.removeChannel(likesSubscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in">
      <PostForm onPostCreated={fetchPosts} />
      <h2 className="text-xl font-semibold mb-4">Community Feed</h2>
      
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
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No posts yet!</p>
          <p>Be the first to share something with the community.</p>
        </Card>
      )}
    </div>
  );
}

export default CommunityFeed;
