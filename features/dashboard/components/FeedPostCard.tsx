
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Star, Users, Zap } from 'lucide-react';
import { FeedPost, KudosType } from '../../../types';
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

  // --- KUDOS RENDER LOGIC ---
  if (post.type === 'kudos' && post.kudosData) {
      const badgeConfig: Record<KudosType, { icon: any, gradient: string, label: string }> = {
          'STAR_PERFORMER': { icon: Star, gradient: 'from-yellow-400 to-orange-500', label: 'Yıldız Performans' },
          'TEAM_PLAYER': { icon: Users, gradient: 'from-blue-400 to-indigo-500', label: 'Takım Oyuncusu' },
          'GUEST_HERO': { icon: Heart, gradient: 'from-red-400 to-pink-500', label: 'Misafir Kahramanı' },
          'FAST_LEARNER': { icon: Zap, gradient: 'from-purple-400 to-violet-500', label: 'Hızlı Öğrenen' },
      };
      
      const config = badgeConfig[post.kudosData.badgeType];
      const BadgeIcon = config.icon;

      return (
          <div className="bg-white border-b border-gray-100 md:rounded-3xl md:border md:shadow-sm md:mb-6 overflow-hidden relative">
              {/* Animated Background Mesh */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5`} />
              
              {/* Header */}
              <div className="flex items-center justify-between p-3 md:p-4 relative z-10">
                  <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-r from-accent to-accent-light text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 fill-primary" /> Takdir
                      </div>
                  </div>
                  <div className="text-[10px] text-gray-400">{formatTime(post.createdAt)}</div>
              </div>

              {/* Kudos Content */}
              <div className="px-4 pb-6 pt-2 text-center relative z-10" onDoubleClick={handleLike}>
                  
                  {/* Badge Animation */}
                  <div className="relative w-32 h-32 mx-auto mb-6">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-gray-300 opacity-50"
                      />
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        className={`w-full h-full rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-2xl shadow-gray-200`}
                      >
                          <BadgeIcon className="w-16 h-16 text-white fill-white/20 drop-shadow-md" />
                      </motion.div>
                      {/* Floating Particles */}
                      <motion.div 
                         animate={{ y: [0, -10, 0] }}
                         transition={{ duration: 2, repeat: Infinity }}
                         className="absolute -top-2 -right-2 text-2xl"
                      >✨</motion.div>
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 mb-1">{config.label}</h2>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
                      <span className="font-bold">{post.authorName}</span>
                      <span className="text-gray-400">➔</span>
                      <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{post.kudosData.recipientName}</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl text-sm italic text-gray-600 border border-gray-100 relative mx-4">
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-50 border-t border-l border-gray-100 transform rotate-45" />
                      "{post.caption}"
                  </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 md:p-4 flex items-center justify-between border-t border-gray-50 bg-white/50 relative z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={handleLike} className="flex items-center gap-1 active:scale-95 transition-transform">
                          <Heart className={`w-6 h-6 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                          {likeCount > 0 && <span className="text-sm font-bold text-gray-600">{likeCount}</span>}
                      </button>
                  </div>
                  <div className="text-xs font-bold text-accent">+250 XP Awarded</div>
              </div>
              
              {/* Like Animation */}
              {isLikeAnimating && liked && (
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    onAnimationComplete={() => setIsLikeAnimating(false)}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                >
                    <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-2xl" />
                </motion.div>
            )}
          </div>
      );
  }

  // --- STANDARD POST RENDER ---
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
