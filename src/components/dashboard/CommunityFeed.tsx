
import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface PostProps {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  liked?: boolean;
}

export function PostCard({ post }: { post: PostProps }) {
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

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3 space-y-0 flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={post.author.avatar} alt={post.author.name} />
          <AvatarFallback>{post.author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{post.author.name}</p>
          <p className="text-xs text-muted-foreground">@{post.author.username} · {post.timestamp}</p>
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

export function PostForm() {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsPosting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community.',
      });
      setContent('');
      setIsPosting(false);
      
      // In a real app, we would add the new post to the state
    }, 1000);
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
  // Mock data for posts
  const posts: PostProps[] = [
    {
      id: '1',
      author: {
        name: 'Jane Smith',
        username: 'janesmith',
        avatar: 'https://i.pravatar.cc/150?u=janesmith',
      },
      content: 'Just discovered this amazing new social platform! The UI is so clean and intuitive. Loving the community so far. What do you all think?',
      timestamp: '2m ago',
      likes: 12,
      comments: 4,
      liked: true,
    },
    {
      id: '2',
      author: {
        name: 'John Doe',
        username: 'johndoe',
        avatar: 'https://i.pravatar.cc/150?u=johndoe',
      },
      content: 'Working on a new project today. Really excited about the possibilities of AI in modern web applications!',
      timestamp: '1h ago',
      likes: 8,
      comments: 2,
    },
    {
      id: '3',
      author: {
        name: 'Alex Johnson',
        username: 'alexj',
        avatar: 'https://i.pravatar.cc/150?u=alexj',
      },
      content: 'Anyone here interested in forming a group for discussing web development best practices? Let me know in the comments!',
      timestamp: '3h ago',
      likes: 15,
      comments: 7,
    },
  ];

  return (
    <div className="animate-fade-in">
      <PostForm />
      <h2 className="text-xl font-semibold mb-4">Community Feed</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

export default CommunityFeed;
