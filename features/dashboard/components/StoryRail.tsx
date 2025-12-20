
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Hash, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChannelStoryData, User } from '../../../types';
import { getChannelStories } from '../../../services/db';

interface StoryRailProps {
    user: User;
}

export const StoryRail: React.FC<StoryRailProps> = ({ user }) => {
    const navigate = useNavigate();
    const [stories, setStories] = useState<ChannelStoryData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStories = async () => {
            setLoading(true);
            const data = await getChannelStories(user);
            setStories(data);
            setLoading(false);
        };
        loadStories();
    }, [user.subscribedChannelIds, user.completedCourses]);

    const handleStoryClick = (story: ChannelStoryData) => {
        if (story.status === 'EMPTY') return;
        
        // If all caught up, maybe navigate to channel archive or first course
        if (story.nextCourseId) {
            navigate(`/course/${story.nextCourseId}`);
        }
    };

    if (loading) {
        return (
            <div className="flex gap-4 px-4 py-4 overflow-x-auto no-scrollbar">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
                        <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
                        <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (stories.length === 0) return null;

    return (
        <div className="bg-white py-4 border-b border-gray-100 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 px-4 min-w-max">
                
                {stories.map((story) => {
                    const isNew = story.status === 'HAS_NEW';
                    
                    return (
                        <div 
                            key={story.channel.id} 
                            className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group relative"
                            onClick={() => handleStoryClick(story)}
                        >
                            {/* Ring Container */}
                            <div className={`relative p-[3px] rounded-full transition-all duration-300 group-hover:scale-105 ${
                                isNew 
                                ? 'bg-gradient-to-tr from-accent via-purple-500 to-blue-500 animate-pulse-slow' 
                                : 'bg-gray-200'
                            }`}>
                                <div className="bg-white rounded-full p-[2px]">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center relative overflow-hidden">
                                        <Hash className={`w-6 h-6 ${isNew ? 'text-primary' : 'text-gray-400'}`} />
                                        
                                        {/* Overlay for interaction hint */}
                                        {isNew && (
                                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play className="w-6 h-6 text-primary fill-primary" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge */}
                                {!isNew && story.status !== 'EMPTY' && (
                                    <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                                        <CheckCircle2 className="w-3 h-3" />
                                    </div>
                                )}
                            </div>

                            <span className={`text-xs font-bold text-center truncate w-20 ${isNew ? 'text-gray-900' : 'text-gray-500'}`}>
                                {story.channel.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
