
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

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
  comments: number;
  liked?: boolean;
}

export function PostCard({ post, onAction }: { 
  post: PostProps; 
  onAction?: () => void;
}) {
  const [isLiked, setIsLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { toast } = useToast();
  
  const handleLike = () => {
    if (isLiked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setIsLiked(!isLiked);
    
    toast({
      title: isLiked ? 'Post unliked' : 'Post liked!',
      description: isLiked ? 'You have unliked this post' : 'You have liked this post',
    });
  };
  
  const handleShare = () => {
    toast({
      title: 'Shared!',
      description: 'Post has been shared.',
    });
  };
  
  const handleComment = () => {
    setShowCommentForm(!showCommentForm);
  };
  
  const submitComment = () => {
    if (!commentText.trim()) return;
    
    toast({
      title: 'Comment posted!',
      description: 'Your comment has been added.',
    });
    
    setCommentText('');
    setShowCommentForm(false);
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
            onClick={handleComment} 
            className="flex items-center gap-1 text-muted-foreground hover:text-social-blue"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments > 0 && <span className="text-xs">{post.comments}</span>}
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
      {showCommentForm && (
        <div className="px-4 pb-4 pt-1">
          <Separator className="mb-3" />
          <div className="flex gap-2">
            <Textarea 
              placeholder="Write a comment..." 
              className="min-h-[60px] text-sm"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button 
              size="icon" 
              className="self-end hover:bg-social-blue"
              onClick={submitComment}
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
      
      // Format posts data
      const formattedPosts = postsData.map((post: any) => ({
        id: post.id,
        content: post.content,
        created_at: post.created_at,
        author: {
          id: post.profiles.id,
          name: post.profiles.name,
          username: post.profiles.username,
          avatar: post.profiles.avatar,
        },
        likes: 0,
        comments: 0
      }));
      
      setPosts(formattedPosts);
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
      
    return () => {
      supabase.removeChannel(postsSubscription);
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
