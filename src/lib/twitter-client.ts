import type { AbstractConstructor } from './twitter-client-base.js';
import { TwitterClientBase } from './twitter-client-base.js';
import { type TwitterClientBookmarkMethods, withBookmarks } from './twitter-client-bookmarks.js';
import { type TwitterClientListMethods, withLists } from './twitter-client-lists.js';
import { type TwitterClientMediaMethods, withMedia } from './twitter-client-media.js';
import { type TwitterClientNewsMethods, withNews } from './twitter-client-news.js';
import { type TwitterClientPostingMethods, withPosting } from './twitter-client-posting.js';
import { type TwitterClientSearchMethods, withSearch } from './twitter-client-search.js';
import { type TwitterClientTimelineMethods, withTimelines } from './twitter-client-timelines.js';
import { type TwitterClientTweetDetailMethods, withTweetDetails } from './twitter-client-tweet-detail.js';
import { type TwitterClientUserTimelineMethods, withUserTimeline } from './twitter-client-user-timeline.js';
import { type TwitterClientUserMethods, withUsers } from './twitter-client-users.js';

type TwitterClientInstance = TwitterClientBase &
  TwitterClientBookmarkMethods &
  TwitterClientListMethods &
  TwitterClientMediaMethods &
  TwitterClientNewsMethods &
  TwitterClientPostingMethods &
  TwitterClientSearchMethods &
  TwitterClientTimelineMethods &
  TwitterClientTweetDetailMethods &
  TwitterClientUserMethods &
  TwitterClientUserTimelineMethods;

const MixedTwitterClient = withUserTimeline(
  withUsers(
    withNews(
      withLists(withTimelines(withSearch(withTweetDetails(withPosting(withBookmarks(withMedia(TwitterClientBase))))))),
    ),
  ),
) as AbstractConstructor<TwitterClientInstance>;

/**
 * Create a Twitter/X GraphQL client with read + write helpers.
 *
 * @example
 * ```ts
 * import { TwitterClient, resolveCredentials } from '@brainwav/xkit';
 *
 * const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
 * const client = new TwitterClient({ cookies });
 * const results = await client.search('from:username', 5);
 * ```
 */
export class TwitterClient extends MixedTwitterClient { }

export type {
  BookmarkMutationResult,
  CurrentUserResult,
  FollowingResult,
  GetTweetResult,
  ListsResult,
  NewsItem,
  NewsResult,
  SearchResult,
  TweetData,
  TweetResult,
  TwitterClientOptions,
  TwitterList,
  TwitterUser,
  UploadMediaResult
} from './twitter-client-types.js';

