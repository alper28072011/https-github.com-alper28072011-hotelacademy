
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit, 
    orderBy,
    startAt,
    endAt,
    doc,
    setDoc,
    increment,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Course, Organization, User, SearchResult, SearchTrend, LearningJourney } from '../types';
import { expandSearchQuery } from './geminiService';
import { getLocalizedContent } from '../i18n/config';

// Constants
const SEARCH_LIMIT_PER_CATEGORY = 10;

/**
 * Perform a Global Search across multiple collections.
 * 
 * Strategy:
 * 1. Expand query using Gemini (semantic tags).
 * 2. Parallel fetch from Courses, Orgs, Users.
 * 3. Client-side scoring and merging.
 */
export const performGlobalSearch = async (
    rawQuery: string, 
    userLang: string = 'en'
): Promise<SearchResult[]> => {
    const term = rawQuery.trim().toLowerCase();
    if (term.length < 2) return [];

    // 1. Semantic Expansion (Gemini) - Optional, can be toggled for performance
    // For demo speed, we might only do this if results are low, but let's do it always for "Intelligence" factor.
    let searchTerms = [term];
    try {
        const expanded = await expandSearchQuery(term);
        if (expanded && expanded.length > 0) {
            searchTerms = expanded; 
        }
    } catch (e) {
        console.warn("Semantic expansion failed, using raw query.");
    }

    console.log("Searching for:", searchTerms);

    // 2. Parallel Fetches
    const promises = [
        searchCourses(searchTerms, userLang),
        searchOrganizations(searchTerms),
        searchUsers(searchTerms)
    ];

    const [courses, orgs, users] = await Promise.all(promises);

    // 3. Merge & Sort
    const allResults = [...courses, ...orgs, ...users];
    
    // Sort by relevance score (Descending)
    return allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// --- COLLECTION SEARCHERS ---

const searchCourses = async (terms: string[], lang: string): Promise<SearchResult[]> => {
    try {
        const coursesRef = collection(db, 'courses');
        
        // Firestore limitation: array-contains-any max 10
        const queryTerms = terms.slice(0, 10);
        
        // Query 1: Tag Match
        const tagQ = query(
            coursesRef, 
            where('tags', 'array-contains-any', queryTerms), 
            limit(SEARCH_LIMIT_PER_CATEGORY)
        );
        
        // Query 2: Topic Match
        const topicQ = query(
            coursesRef,
            where('topics', 'array-contains-any', queryTerms),
            limit(SEARCH_LIMIT_PER_CATEGORY)
        );

        // Fetch (Simple OR logic by executing both)
        const [tagSnap, topicSnap] = await Promise.all([getDocs(tagQ), getDocs(topicQ)]);
        
        const results = new Map<string, SearchResult>();

        const processDoc = (doc: any, baseScore: number) => {
            const data = doc.data() as Course;
            const title = getLocalizedContent(data.title);
            
            // Client-side text match boost
            let score = baseScore;
            if (title.toLowerCase().includes(terms[0])) score += 20; // Exact partial match boost
            
            results.set(doc.id, {
                type: 'COURSE',
                id: doc.id,
                title: title,
                subtitle: `${data.duration} dk • ${data.authorName}`,
                imageUrl: data.thumbnailUrl,
                relevanceScore: score,
                url: `/course/${doc.id}`
            });
        };

        tagSnap.forEach(d => processDoc(d, 50));
        topicSnap.forEach(d => processDoc(d, 60)); // Topics are stronger than general tags

        return Array.from(results.values());
    } catch (e) {
        console.error("Course Search Error:", e);
        return [];
    }
};

const searchOrganizations = async (terms: string[]): Promise<SearchResult[]> => {
    try {
        const orgsRef = collection(db, 'organizations');
        // Simple name search using the raw term (first item)
        // Firestore doesn't support full-text, so we rely on client-filtering of popular/recent or specific "startAt" logic
        // For prototype: Fetch generic list and filter. Ideally use Algolia.
        
        const q = query(orgsRef, limit(50)); // Fetch top 50 active
        const snap = await getDocs(q);
        
        const results: SearchResult[] = [];
        const mainTerm = terms[0];

        snap.forEach(doc => {
            const data = doc.data() as Organization;
            const name = data.name.toLowerCase();
            const sector = data.sector.toLowerCase();
            
            let score = 0;
            if (name.includes(mainTerm)) score = 80;
            else if (terms.some(t => sector.includes(t))) score = 40;

            if (score > 0) {
                results.push({
                    type: 'ORGANIZATION',
                    id: doc.id,
                    title: data.name,
                    subtitle: `${data.memberCount} Üye • ${data.location}`,
                    imageUrl: data.logoUrl,
                    relevanceScore: score,
                    url: `/org/${doc.id}`
                });
            }
        });

        return results;
    } catch (e) {
        return [];
    }
};

const searchUsers = async (terms: string[]): Promise<SearchResult[]> => {
    try {
        // Only search public profiles
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef, 
            where('privacySettings.showInSearch', '==', true),
            limit(50)
        );
        
        const snap = await getDocs(q);
        const results: SearchResult[] = [];
        const mainTerm = terms[0];

        snap.forEach(doc => {
            const data = doc.data() as User;
            const name = data.name.toLowerCase();
            const role = (data.roleTitle || '').toLowerCase();
            const dept = (data.department || '').toLowerCase();

            let score = 0;
            if (name.includes(mainTerm)) score = 70;
            else if (terms.some(t => role.includes(t) || dept.includes(t))) score = 30;

            if (score > 0) {
                results.push({
                    type: 'USER',
                    id: doc.id,
                    title: data.name,
                    subtitle: data.roleTitle || 'Üye',
                    imageUrl: data.avatar,
                    relevanceScore: score,
                    url: `/user/${doc.id}`
                });
            }
        });

        return results;
    } catch (e) {
        return [];
    }
};

// --- TRENDS ---

export const getTrendingSearches = async (): Promise<SearchTrend[]> => {
    try {
        const q = query(collection(db, 'search_trends'), orderBy('count', 'desc'), limit(5));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as SearchTrend);
    } catch (e) {
        // Fallback trends
        return [
            { term: 'Housekeeping', count: 100, lastSearchedAt: Date.now() },
            { term: 'Şarap Servisi', count: 80, lastSearchedAt: Date.now() },
            { term: 'Misafir İlişkileri', count: 60, lastSearchedAt: Date.now() }
        ];
    }
};

export const trackSearch = async (term: string) => {
    if (!term || term.length < 3) return;
    const cleanTerm = term.toLowerCase().trim();
    const docRef = doc(db, 'search_trends', cleanTerm);
    
    try {
        await setDoc(docRef, {
            term: cleanTerm,
            count: increment(1),
            lastSearchedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error("Track Search Error:", e);
    }
};
