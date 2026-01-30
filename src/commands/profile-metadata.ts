/**
 * Profile metadata extraction
 */

import type { TweetData } from '../lib/twitter-client-types.js';

export interface ProfileMetadata {
    username: string;
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    profileImageUrl?: string;
    bannerImageUrl?: string;
    followerCount?: number;
    followingCount?: number;
    tweetCount?: number;
    joinDate?: string;
    verified?: boolean;
    protected?: boolean;
}

/**
 * Extract profile metadata from tweets
 * Uses the author data from the first tweet as a proxy for profile info
 */
export function extractProfileMetadata(tweets: TweetData[], username: string): ProfileMetadata {
    if (tweets.length === 0) {
        return { username };
    }

    // Get author data from first tweet
    const firstTweet = tweets[0];
    const author = firstTweet.author;

    if (!author) {
        return { username };
    }

    return {
        username,
        displayName: author.name,
        // Note: Additional fields like bio, location, followers, etc. are not available
        // in the tweet author data. They would need a separate user profile API call.
    };
}

/**
 * Calculate profile statistics
 */
export interface ProfileStatistics {
    totalTweets: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    averageLikes: number;
    averageRetweets: number;
    topTweets: Array<{
        id: string;
        text: string;
        likes: number;
        retweets: number;
        url: string;
    }>;
    hashtagFrequency: Record<string, number>;
    mentionFrequency: Record<string, number>;
    linkDomains: Record<string, number>;
    postingFrequency: {
        byHour: Record<number, number>;
        byDayOfWeek: Record<string, number>;
        byMonth: Record<string, number>;
    };
}

export function calculateStatistics(tweets: TweetData[]): ProfileStatistics {
    const stats: ProfileStatistics = {
        totalTweets: tweets.length,
        totalLikes: 0,
        totalRetweets: 0,
        totalReplies: 0,
        averageLikes: 0,
        averageRetweets: 0,
        topTweets: [],
        hashtagFrequency: {},
        mentionFrequency: {},
        linkDomains: {},
        postingFrequency: {
            byHour: {},
            byDayOfWeek: {},
            byMonth: {},
        },
    };

    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;
    const urlRegex = /https?:\/\/([^/\s]+)/g;

    for (const tweet of tweets) {
        // Engagement stats
        stats.totalLikes += tweet.likeCount || 0;
        stats.totalRetweets += tweet.retweetCount || 0;
        stats.totalReplies += tweet.replyCount || 0;

        // Extract hashtags
        const hashtags = tweet.text?.match(hashtagRegex) || [];
        for (const tag of hashtags) {
            const normalized = tag.toLowerCase();
            stats.hashtagFrequency[normalized] = (stats.hashtagFrequency[normalized] || 0) + 1;
        }

        // Extract mentions
        const mentions = tweet.text?.match(mentionRegex) || [];
        for (const mention of mentions) {
            const normalized = mention.toLowerCase();
            stats.mentionFrequency[normalized] = (stats.mentionFrequency[normalized] || 0) + 1;
        }

        // Extract link domains
        const urls = tweet.text?.match(urlRegex) || [];
        for (const url of urls) {
            const match = url.match(/https?:\/\/([^/\s]+)/);
            if (match) {
                const domain = match[1];
                stats.linkDomains[domain] = (stats.linkDomains[domain] || 0) + 1;
            }
        }

        // Posting frequency
        if (tweet.createdAt) {
            const date = new Date(tweet.createdAt);
            const hour = date.getHours();
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            const month = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

            stats.postingFrequency.byHour[hour] = (stats.postingFrequency.byHour[hour] || 0) + 1;
            stats.postingFrequency.byDayOfWeek[dayOfWeek] = (stats.postingFrequency.byDayOfWeek[dayOfWeek] || 0) + 1;
            stats.postingFrequency.byMonth[month] = (stats.postingFrequency.byMonth[month] || 0) + 1;
        }
    }

    // Calculate averages
    if (tweets.length > 0) {
        stats.averageLikes = Math.round(stats.totalLikes / tweets.length);
        stats.averageRetweets = Math.round(stats.totalRetweets / tweets.length);
    }

    // Get top tweets
    const sortedByLikes = [...tweets]
        .filter((t) => t.likeCount && t.likeCount > 0)
        .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        .slice(0, 10);

    stats.topTweets = sortedByLikes.map((t) => ({
        id: t.id,
        text: (t.text || '').substring(0, 100),
        likes: t.likeCount || 0,
        retweets: t.retweetCount || 0,
        url: `https://x.com/${t.author?.username || 'unknown'}/status/${t.id}`,
    }));

    return stats;
}
