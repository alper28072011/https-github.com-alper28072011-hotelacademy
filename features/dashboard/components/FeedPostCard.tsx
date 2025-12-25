
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Star, Users, Zap, Bookmark, Play, Clock, BadgeCheck, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedPost, KudosType, Course } from '../../../types';
import { toggleSaveCourse, getUserById, getOrganizationDetails } from '../../../services/db';
import { togglePostLikeScalable, hasUserLikedPost } from '../../../services/socialService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { getLocalizedContent } from '../../../i18n/config';
import { Avatar } from '../../../components/ui/Avatar';

interface FeedPostCardProps {
  post: FeedPost | (Course & { type: 'course' });
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({ post }) => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  
  // -- Common State --
  const isCourse = (post as any).type === 'course';
  
  // Like State (For Posts)
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(!isCourse ? (post as FeedPost).likesCount || 0 : 0);

  // Check Liked Status on Mount
  useEffect(() => {
      if (!isCourse && currentUser) {
          hasUserLikedPost(post.id, currentUser.id).then(setLiked);
      }
  }, [post.id, currentUser, isCourse]);

  const handleLike = async () => {
      if (!currentUser || isCourse) return;
      const newStatus = !liked;
      setLiked(newStatus);
      setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
      await togglePostLikeScalable(post.id, currentUser.id, newStatus);
  };

  // Author Logic
  const authorName = post.authorName || 'Kullanıcı';
  const authorAvatar = (post as any).authorAvatarUrl || (post as any).authorAvatar;
  const timeString = new Date(post.createdAt).toLocaleDateString();

  return (
    <div className="bg-white border border-[#d8dfea] mb-3 p-3">
        {/* Header */}
        <div className="flex gap-2 mb-2">
            <div className="w-10 h-10 border border-[#ccc] bg-[#f7f7f7] p-0.5">
                <Avatar src={authorAvatar} alt={authorName} size="md" className="rounded-none" />
            </div>
            <div>
                <div className="font-bold text-[#3b5998] text-sm cursor-pointer hover:underline">
                    {authorName}
                </div>
                <div className="text-[10px] text-[#999]">
                    {isCourse ? 'yeni bir eğitim yayınladı.' : 'bir gönderi paylaştı.'} • {timeString}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="mb-2">
            {!isCourse && (
                <div className="text-[13px] text-[#333] mb-2 font-normal">
                    {(post as FeedPost).caption}
                </div>
            )}
            
            {/* Media Box */}
            <div className="border border-[#ccc] bg-[#f7f7f7] p-1">
                {isCourse ? (
                    <div className="flex gap-2 cursor-pointer" onClick={() => navigate(`/course/${post.id}`)}>
                        <div className="w-24 h-16 bg-black shrink-0 relative">
                            <img src={post.thumbnailUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#3b5998] text-sm truncate">{getLocalizedContent((post as Course).title)}</div>
                            <div className="text-[11px] text-[#666] line-clamp-2">{getLocalizedContent((post as Course).description)}</div>
                            <div className="text-[10px] text-[#999] mt-1">{(post as Course).duration} dk • {(post as Course).xpReward} XP</div>
                        </div>
                    </div>
                ) : (
                    (post as FeedPost).mediaUrl && (
                        <img src={(post as FeedPost).mediaUrl} className="w-full h-auto border border-[#ccc]" />
                    )
                )}
            </div>
        </div>

        {/* Action Bar (The Classic Blue Bar) */}
        {!isCourse && (
            <div className="mt-2 pt-2 border-t border-[#e9e9e9]">
                <div className="flex gap-4 text-[11px] font-bold text-[#3b5998]">
                    <button onClick={handleLike} className="hover:underline flex items-center gap-1">
                        {liked ? 'Beğenmekten Vazgeç' : 'Beğen'}
                    </button>
                    <button className="hover:underline">Yorum Yap</button>
                    <button className="hover:underline">Paylaş</button>
                </div>
                {likeCount > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-[#666] bg-[#f7f7f7] p-1 border-t border-[#e9e9e9]">
                        <ThumbsUp className="w-3 h-3 text-[#3b5998] fill-[#3b5998]" />
                        {liked ? `Sen ve ${likeCount - 1} kişi daha beğendi` : `${likeCount} kişi beğendi`}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
