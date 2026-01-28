// biome-ignore lint/correctness/useImportExtensions: JSON module import doesn't use .js extension.
import queryIds from './query-ids.json' with { type: 'json' };

export const TWITTER_API_BASE = 'https://x.com/i/api/graphql';
export const TWITTER_GRAPHQL_POST_URL = 'https://x.com/i/api/graphql';
export const TWITTER_UPLOAD_URL = 'https://upload.twitter.com/i/media/upload.json';
export const TWITTER_MEDIA_METADATA_URL = 'https://x.com/i/api/1.1/media/metadata/create.json';
export const TWITTER_STATUS_UPDATE_URL = 'https://x.com/i/api/1.1/statuses/update.json';
export const SETTINGS_SCREEN_NAME_REGEX = /"screen_name":"([^"]+)"/;
export const SETTINGS_USER_ID_REGEX = /"user_id"\s*:\s*"(\d+)"/;
export const SETTINGS_NAME_REGEX = /"name":"([^"\\]*(?:\\.[^"\\]*)*)"/;

// Query IDs rotate frequently; the values in query-ids.json are refreshed by
// scripts/update-query-ids.ts. The fallback values keep the client usable if
// the file is missing or incomplete.
export const FALLBACK_QUERY_IDS = {
  CreateTweet: 'z0m4Q8u_67R9VOSMXU_MWg',
  CreateRetweet: 'LFho5rIi4xcKO90p9jwG7A',
  FavoriteTweet: 'lI07N6Otwv1PhnEgXILM7A',
  DeleteBookmark: 'Wlmlj2-xzyS1GN3a6cj-mQ',
  TweetDetail: 'Kzfv17rukSzjT96BerOWZA',
  SearchTimeline: 'f_A-Gyo204PRxixpkrchJg',
  UserTweets: 'a3SQAz_VP9k8VWDr9bMcXQ',
  UserByScreenName: '-oaLodhGbbnzJBACb1kk2Q',
  UserArticlesTweets: '8zBy9h4L90aDL02RsBcCFg',
  Bookmarks: 'RV1g3b8n_SGOHwkqKYSCFw',
  Following: 'i2GOldCH2D3OUEhAdimLrA',
  Followers: 'oQWxG6XdR5SPvMBsPiKUPQ',
  Likes: 'fuBEtiFu3uQFuPDTsv4bfg',
  BookmarkFolderTimeline: 'KJIQpsvxrTfRIlbaRIySHQ',
  ListOwnerships: 'wQcOSjSQ8NtgxIwvYl1lMg',
  ListMemberships: 'BlEXXdARdSeL_0KyKHHvvg',
  ListLatestTweetsTimeline: '2TemLyqrMpTeAmysdbnVqw',
  ListByRestId: 'wXzyA5vM_aVkBL9G8Vp3kw',
  ExplorePage: 'gCKhXL4VRpxTNNsE_RJCdA',
} as const;

export type OperationName = keyof typeof FALLBACK_QUERY_IDS;

export const QUERY_IDS: Record<OperationName, string> = {
  ...FALLBACK_QUERY_IDS,
  ...(queryIds as Partial<Record<OperationName, string>>),
};

export const TARGET_QUERY_ID_OPERATIONS = Object.keys(FALLBACK_QUERY_IDS) as Array<OperationName>;
