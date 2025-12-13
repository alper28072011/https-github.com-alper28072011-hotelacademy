
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { FeedPost } from '../../../types';
import { togglePostLike } from '../../../services/db';
import { useAuthStore } from '../../../stores/useAuthStore';

interface FeedPostCardProps {
  post: FeedPost;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({ post }) => {
  const { currentUser } = useAuthStore();
  
  const isLikedByMe = post.likedBy?.includes(currentUser?.id || '');
  const [liked, setLiked] = useState(isLikedByMe);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  const handleLike = async () => {
      if (!currentUser) return;
      
      const newStatus = !liked;
      setLiked(newStatus);
      setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
      setIsLikeAnimating(true);
      
      // Update DB
      await togglePostLike(post.id, currentUser.id, !newStatus);
  };

  const formatTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'Az önce';
      if (hours < 24) return `${hours} saat önce`;
      return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-white border-b border-gray-100 md:rounded-3xl md:border md:shadow-sm md:mb-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                    <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                </div>
                <div>
                    <div className="font-bold text-sm text-gray-900 leading-none">{post.authorName}</div>
                    <div className="text-xs text-gray-500 mt-1">{post.targetDepartments.join(', ').replace('_', ' ')}</div>
                </div>
            </div>
            <button className="text-gray-400">
                <MoreHorizontal className="w-5 h-5" />
            </button>
        </div>

        {/* Media */}
        <div className="relative w-full bg-black/5" onDoubleClick={handleLike}>
            {post.type === 'video' ? (
                <video 
                    src={post.mediaUrl} 
                    className="w-full h-auto max-h-[600px] object-cover" 
                    controls 
                    playsInline
                />
            ) : (
                <img 
                    src={post.mediaUrl} 
                    alt="Post" 
                    className="w-full h-auto object-cover max-h-[600px]"
                />
            )}
            
            {/* Heart Animation Overlay */}
            {isLikeAnimating && liked && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    onAnimationComplete={() => setIsLikeAnimating(false)}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                    <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
                </motion.div>
            )}
        </div>

        {/* Action Bar */}
        <div className="p-3 md:p-4">
            <div className="flex items-center gap-4 mb-2">
                <button onClick={handleLike} className="active:scale-90 transition-transform">
                    <Heart className={`w-7 h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-800'}`} />
                </button>
                <button className="active:scale-90 transition-transform">
                    <MessageCircle className="w-7 h-7 text-gray-800" />
                </button>
                <button className="ml-auto active:scale-90 transition-transform">
                    <Share2 className="w-7 h-7 text-gray-800" />
                </button>
            </div>
            
            <div className="font-bold text-sm text-gray-900 mb-2">
                {likeCount} beğeni
            </div>

            <div className="text-sm text-gray-800 mb-1">
                <span className="font-bold mr-2">{post.authorName}</span>
                {post.caption}
            </div>

            <div className="text-[10px] text-gray-400 uppercase mt-2">
                {formatTime(post.createdAt)}
            </div>
        </div>
    </div>
  );
};
