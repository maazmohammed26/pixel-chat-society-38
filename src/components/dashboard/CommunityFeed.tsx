
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageSquare, Send, Image, Video, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ImageViewer } from '@/components/ui/image-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    comment_likes: Array<{ id: string; user_id: string }>;
  }>;
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    const commentLikesChannel = supabase
      .channel('comment-likes-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'comment_likes' }, 
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(commentLikesChannel);
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
      
      // Fetch comment likes separately for each comment
      const postsWithCommentLikes = await Promise.all(
        (postsData || []).map(async (post) => {
          const commentsWithLikes = await Promise.all(
            post.comments.map(async (comment) => {
              const { data: commentLikes } = await supabase
                .from('comment_likes')
                .select('id, user_id')
                .eq('comment_id', comment.id);
              
              return {
                ...comment,
                comment_likes: commentLikes || []
              };
            })
          );
          
          return {
            ...post,
            comments: commentsWithLikes
          };
        })
      );
      
      setPosts(postsWithCommentLikes);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageToUpload(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('posts')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handlePost = async () => {
    if ((!newPost.trim() && !imageToUpload) || !currentUser) return;

    try {
      setPosting(true);
      
      let imageUrl = null;
      if (imageToUpload) {
        imageUrl = await uploadImage(imageToUpload);
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          content: newPost.trim(),
          image_url: imageUrl,
          user_id: currentUser.id
        });

      if (error) throw error;
      
      setNewPost('');
      setImageToUpload(null);
      setImagePreview(null);
      
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

  const handleCommentLike = async (commentId: string) => {
    if (!currentUser) return;

    try {
      // Find the comment in all posts
      let targetComment = null;
      for (const post of posts) {
        targetComment = post.comments.find(c => c.id === commentId);
        if (targetComment) break;
      }

      if (!targetComment) return;

      const isLiked = targetComment.comment_likes?.some(like => like.user_id === currentUser.id);

      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: currentUser.id
          });
      }
    } catch (error) {
      console.error('Error handling comment like:', error);
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

  const toggleComments = (postId: string) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;

    try {
      // Delete likes first
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId);

      // Delete comment likes
      const { data: comments } = await supabase
        .from('comments')
        .select('id')
        .eq('post_id', postId);

      if (comments && comments.length > 0) {
        await supabase
          .from('comment_likes')
          .delete()
          .in('comment_id', comments.map(c => c.id));
      }

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

      setDeleteConfirm(null);
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
    <div className="space-y-3 pb-20">
      {/* Create Post */}
      <Card className="card-gradient">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Avatar className="h-8 w-8 flex-shrink-0">
              {currentUser?.profile?.avatar ? (
                <AvatarImage src={currentUser.profile.avatar} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {currentUser?.profile?.name ? currentUser.profile.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <Textarea
                placeholder="What's on your mind?"
                className="min-h-[60px] font-pixelated text-xs resize-none border-0 bg-transparent p-0 focus-visible:ring-0"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              
              {imagePreview && (
                <div className="relative mt-2">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-w-full h-32 object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedImage(imagePreview)}
                  />
                  <Button
                    onClick={() => {
                      setImageToUpload(null);
                      setImagePreview(null);
                    }}
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-5 w-5"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex gap-1 flex-wrap">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-3 w-3 mr-1" />
                    <span className="font-pixelated text-xs">Photo</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled>
                    <Video className="h-3 w-3 mr-1" />
                    <Badge variant="secondary" className="text-xs font-pixelated ml-1">Soon</Badge>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <Button
                  onClick={handlePost}
                  disabled={(!newPost.trim() && !imageToUpload) || posting}
                  className="h-6 px-3 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs flex-shrink-0"
                >
                  {posting ? 'Posting...' : 'Post'}
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
                  onClick={() => setDeleteConfirm(post.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  ×
                </Button>
              )}
            </div>
            
            {post.content && (
              <p className="text-sm font-pixelated mb-3 whitespace-pre-wrap">{post.content}</p>
            )}

            {post.image_url && (
              <div className="mb-3">
                <img 
                  src={post.image_url} 
                  alt="Post image" 
                  className="w-full max-h-64 object-cover rounded-lg cursor-pointer"
                  onClick={() => setSelectedImage(post.image_url)}
                />
              </div>
            )}
            
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
                onClick={() => toggleComments(post.id)}
                className="h-6 px-2 font-pixelated text-xs text-muted-foreground"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {post.comments.length}
              </Button>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="mt-3">
                {/* Existing Comments */}
                {post.comments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {post.comments.map((comment) => (
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
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-2">
                            <p className="font-pixelated text-xs font-medium">{comment.profiles?.name}</p>
                            <p className="text-xs font-pixelated">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCommentLike(comment.id)}
                              className={`h-4 px-1 font-pixelated text-xs ${
                                comment.comment_likes?.some(like => like.user_id === currentUser?.id)
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              <Heart className={`h-2 w-2 mr-1 ${
                                comment.comment_likes?.some(like => like.user_id === currentUser?.id) ? 'fill-current' : ''
                              }`} />
                              {comment.comment_likes?.length || 0}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex gap-2">
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
              </div>
            )}
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

      {/* Image Viewer */}
      {selectedImage && (
        <ImageViewer
          src={selectedImage}
          alt="Full size image"
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-sm">Delete Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="font-pixelated text-xs text-muted-foreground">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => deleteConfirm && handleDeletePost(deleteConfirm)}
                variant="destructive"
                className="flex-1 font-pixelated text-xs h-6"
              >
                Delete
              </Button>
              <Button
                onClick={() => setDeleteConfirm(null)}
                variant="outline"
                className="flex-1 font-pixelated text-xs h-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
