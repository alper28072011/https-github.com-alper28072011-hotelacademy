
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, MoreHorizontal, Star, Users, Zap, Bookmark, Play, Clock, Building2, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedPost, KudosType, Course } from '../../../types';
import { togglePostLike, toggleSaveCourse, getUserById, getOrganizationDetails } from '../../../services/db';
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
  const isKudos = (post as any).type === 'kudos';
  
  // Like State (For Posts)
  const isLikedByMe = !isCourse && (post as FeedPost).likedBy?.includes(currentUser?.id || '');
  const [liked, setLiked] = useState(isLikedByMe);
  const [likeCount, setLikeCount] = useState(!isCourse ? (post as FeedPost).likes : 0);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  // Bookmark State (For Courses)
  const isSavedByMe = isCourse && currentUser?.savedCourses?.includes(post.id);
  const [saved, setSaved] = useState(isSavedByMe);

  // -- Author Logic (Initial Static Data) --
  // Fallback to orgId if author info is missing (Legacy support)
  const initialAuthorName = post.authorName || (post.organizationId ? 'Kurumsal' : 'Anonim');
  const initialAuthorAvatar = isCourse ? (post as any).authorAvatarUrl : (post as any).authorAvatar;
  const authorType = (post as any).authorType || 'ORGANIZATION'; 
  const authorId = post.authorId || post.organizationId;

  // -- LIVE DATA FETCHING --
  // This ensures we always show the CURRENT avatar/name, not the one saved when posted.
  const [liveAuthor, setLiveAuthor] = useState<{ name: string; avatar: string | null } | null>(null);

  useEffect(() => {
      let isMounted = true;
      const fetchLiveAuthor = async () => {
          if (!authorId) return;

          try {
              if (authorType === 'USER') {
                  const user = await getUserById(authorId);
                  if (isMounted && user) {
                      setLiveAuthor({ name: user.name, avatar: user.avatar });
                  }
              } else {
                  // Organization
                  const org = await getOrganizationDetails(authorId);
                  if (isMounted && org) {
                      setLiveAuthor({ name: org.name, avatar: org.logoUrl });
                  }
              }
          } catch (e) {
              console.error("Failed to fetch live author data", e);
          }
      };

      fetchLiveAuthor();
      return () => { isMounted = false; };
  }, [authorId, authorType]);

  // Use live data if available, fallback to static snapshot
  const displayAvatar = liveAuthor?.avatar ?? initialAuthorAvatar;
  const displayName = liveAuthor?.name ?? initialAuthorName;

  const handleLike = async () => {
      if (!currentUser || isCourse) return;
      const newStatus = !liked;
      setLiked(newStatus);
      setLikeCount(prev => newStatus ? prev + 1 : prev - 1);
      setIsLikeAnimating(true);
      await togglePostLike(post.id, currentUser.id, !newStatus);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentUser || !isCourse) return;
      const newStatus = !saved;
      setSaved(newStatus);
      await toggleSaveCourse(currentUser.id, post.id, newStatus);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (authorType === 'USER') {
          navigate(`/user/${authorId}`);
      } else {
          navigate(`/org/${authorId}`);
      }
  };

  const handleCourseClick = () => {
      navigate(`/course/${post.id}`);
  };

  const formatTime = (timestamp: number) => {
      const now = Date.now();
      const diff = now - timestamp;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'Az önce';
      if (hours < 24) return `${hours} sa`;
      return new Date(timestamp).toLocaleDateString();
  };

  // --- RENDER: KUDOS CARD ---
  if (isKudos) {
      const p = post as FeedPost;
      const badgeConfig: Record<KudosType, { icon: any, gradient: string, label: string }> = {
          'STAR_PERFORMER': { icon: Star, gradient: 'from-yellow-400 to-orange-500', label: 'Yıldız Performans' },
          'TEAM_PLAYER': { icon: Users, gradient: 'from-blue-400 to-indigo-500', label: 'Takım Oyuncusu' },
          'GUEST_HERO': { icon: Heart, gradient: 'from-red-400 to-pink-500', label: 'Misafir Kahramanı' },
          'FAST_LEARNER': { icon: Zap, gradient: 'from-purple-400 to-violet-500', label: 'Hızlı Öğrenen' },
      };
      
      const config = p.kudosData ? badgeConfig[p.kudosData.badgeType] : badgeConfig['STAR_PERFORMER'];
      const BadgeIcon = config.icon;

      return (
          <div className="bg-white border-b border-gray-100 md:rounded-3xl md:border md:shadow-sm md:mb-6 overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5`} />
              
              <div className="flex items-center justify-between p-3 md:p-4 relative z-10">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={handleAuthorClick}>
                        <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm bg-white">
                            <Avatar src={displayAvatar} alt={displayName} size="sm" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-900">{displayName}</div>
                            <div className="text-[10px] text-gray-400">Takdir Gönderdi • {formatTime(p.createdAt)}</div>
                        </div>
                  </div>
              </div>

              <div className="px-4 pb-6 pt-2 text-center relative z-10" onDoubleClick={handleLike}>
                  <div className="relative w-32 h-32 mx-auto mb-6">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-dashed border-gray-300 opacity-50" />
                      <motion.div initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className={`w-full h-full rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-2xl shadow-gray-200`}>
                          <BadgeIcon className="w-16 h-16 text-white fill-white/20 drop-shadow-md" />
                      </motion.div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-1">{config.label}</h2>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
                      <span className="font-bold cursor-pointer hover:underline" onClick={handleAuthorClick}>{displayName}</span>
                      <span className="text-gray-400">➔</span>
                      <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded cursor-pointer hover:underline" onClick={() => navigate(`/user/${p.kudosData?.recipientId}`)}>
                          {p.kudosData?.recipientName}
                      </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl text-sm italic text-gray-600 border border-gray-100 relative mx-4">
                      "{p.caption}"
                  </div>
              </div>

              <div className="p-3 md:p-4 flex items-center justify-between border-t border-gray-50 bg-white/50 relative z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={handleLike} className="flex items-center gap-1 active:scale-95 transition-transform">
                          <Heart className={`w-6 h-6 ${liked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                          {likeCount > 0 && <span className="text-sm font-bold text-gray-600">{likeCount}</span>}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: COURSE CARD (Feed Style) ---
  if (isCourse) {
      const c = post as Course;
      return (
          <div className="bg-white border-b border-gray-100 md:rounded-3xl md:border md:shadow-sm md:mb-6 overflow-hidden group cursor-pointer" onClick={handleCourseClick}>
              {/* Dynamic Header */}
              <div className="flex items-center justify-between p-3 md:p-4">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={handleAuthorClick}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 border border-gray-200">
                          <Avatar src={displayAvatar} alt={displayName} size="md" />
                      </div>
                      <div>
                          <div className="font-bold text-sm text-gray-900 leading-none flex items-center gap-1">
                              {displayName}
                              {authorType === 'ORGANIZATION' && <BadgeCheck className="w-3 h-3 text-blue-500" />}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                              {c.organizationId && c.visibility === 'PRIVATE' ? 'Kurumsal Eğitim' : 'Paylaşım'} • {formatTime(c.createdAt || Date.now())}
                          </div>
                      </div>
                  </div>
                  <button onClick={handleBookmark} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                      {saved ? <Bookmark className="w-6 h-6 text-primary fill-primary" /> : <Bookmark className="w-6 h-6 text-gray-400" />}
                  </button>
              </div>

              {/* Media */}
              <div className="relative aspect-[4/5] md:aspect-video w-full bg-gray-100 overflow-hidden">
                  <img src={c.thumbnailUrl} alt={getLocalizedContent(c.title)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                  
                  {/* Overlay Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <div className="flex items-center gap-2 mb-2">
                          <span className="bg-accent text-primary text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Zap className="w-3 h-3 fill-current" /> +{c.xpReward} XP
                          </span>
                          <span className="bg-black/40 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-white/20">
                              <Clock className="w-3 h-3" /> {c.duration} dk
                          </span>
                      </div>
                      <h2 className="text-xl font-bold leading-tight mb-1">{getLocalizedContent(c.title)}</h2>
                      <p className="text-sm text-gray-300 line-clamp-1 opacity-90">{getLocalizedContent(c.description)}</p>
                  </div>

                  {/* Play Button CTA */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                          <Play className="w-8 h-8 text-white fill-white" />
                      </div>
                  </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 md:p-4 bg-blue-50/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Hemen İzle</span>
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-bold group-hover:translate-x-1 transition-transform">
                      Eğitime Git <Share2 className="w-4 h-4 rotate-180" />
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: STANDARD POST ---
  const p = post as FeedPost;
  return (
    <div className="bg-white border-b border-gray-100 md:rounded-3xl md:border md:shadow-sm md:mb-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleAuthorClick}>
                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                    <Avatar src={displayAvatar} alt={displayName} size="md" />
                </div>
                <div>
                    <div className="font-bold text-sm text-gray-900 leading-none">{displayName}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatTime(p.createdAt)}</div>
                </div>
            </div>
            <button className="text-gray-400">
                <MoreHorizontal className="w-5 h-5" />
            </button>
        </div>

        {/* Media */}
        <div className="relative w-full bg-black/5" onDoubleClick={handleLike}>
            {p.type === 'video' ? (
                <video src={p.mediaUrl} className="w-full h-auto max-h-[600px] object-cover" controls playsInline />
            ) : (
                <img src={p.mediaUrl} alt="Post" className="w-full h-auto object-cover max-h-[600px]" />
            )}
            
            {/* Heart Animation */}
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
            
            <div className="font-bold text-sm text-gray-900 mb-2">{likeCount} beğeni</div>
            <div className="text-sm text-gray-800 mb-1">
                <span className="font-bold mr-2 cursor-pointer hover:underline" onClick={handleAuthorClick}>{displayName}</span>
                {p.caption}
            </div>
        </div>
    </div>
  );
};
