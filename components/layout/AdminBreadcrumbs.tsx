
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { getCourse } from '../../services/db';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getLocalizedContent } from '../../i18n/config';

export const AdminBreadcrumbs: React.FC = () => {
    const location = useLocation();
    const params = useParams();
    const [titles, setTitles] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchTitles = async () => {
            const newTitles: Record<string, string> = {};
            
            if (params.courseId) {
                const c = await getCourse(params.courseId);
                if (c) newTitles[params.courseId] = getLocalizedContent(c.title);
            }
            
            if (params.topicId) {
                const tSnap = await getDoc(doc(db, 'topics', params.topicId));
                if (tSnap.exists()) {
                    newTitles[params.topicId] = getLocalizedContent(tSnap.data().title);
                }
            }

            if (params.moduleId) {
                const mSnap = await getDoc(doc(db, 'modules', params.moduleId));
                if (mSnap.exists()) {
                    newTitles[params.moduleId] = getLocalizedContent(mSnap.data().title);
                }
            }
            
            setTitles(newTitles);
        };
        
        fetchTitles();
    }, [params]);

    // Build paths
    const crumbs = [
        { label: <Home className="w-3 h-3" />, path: '/admin' }
    ];

    if (location.pathname.includes('/courses')) {
        crumbs.push({ label: 'Kurslar', path: '/admin/courses' });
        if (params.courseId) {
            crumbs.push({ label: titles[params.courseId] || '...', path: `/admin/courses/${params.courseId}` });
        }
        if (params.topicId) {
            crumbs.push({ label: titles[params.topicId] || '...', path: `/admin/courses/${params.courseId}/topics/${params.topicId}` });
        }
    }

    if (location.pathname.includes('/modules')) {
        crumbs.push({ label: 'Modül Editörü', path: '#' });
        if (params.moduleId) {
            crumbs.push({ label: titles[params.moduleId] || '...', path: '#' });
        }
    }

    return (
        <div className="bg-white border-b border-[#d8dfea] px-4 py-2 flex items-center gap-1 text-[11px] text-[#3b5998]">
            {crumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                    {crumb.path !== '#' ? (
                        <Link to={crumb.path} className="font-bold hover:underline">{crumb.label}</Link>
                    ) : (
                        <span className="text-gray-500 font-normal">{crumb.label}</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
