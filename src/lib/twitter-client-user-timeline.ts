import type { AbstractConstructor, Mixin, TwitterClientBase } from './twitter-client-base.js';
import { TWITTER_API_BASE } from './twitter-client-constants.js';
import { buildUserTweetsFeatures } from './twitter-client-features.js';
import type { SearchResult, TweetData } from './twitter-client-types.js';
import { extractCursorFromInstructions, parseTweetsFromInstructions } from './twitter-client-utils.js';

/** Options for user timeline fetch methods */
export interface UserTimelineFetchOptions {
  /** Include raw GraphQL response data in result */
  includeRaw?: boolean;
  /** Cursor for pagination (to resume from previous fetch) */
  cursor?: string;
}

/** Extended search result with pagination metadata */
export interface UserTimelineResult extends SearchResult {
  /** Last cursor used (for resuming pagination) */
  lastCursor?: string;
  /** Number of pages fetched */
  pagesFetched?: number;
}

export interface TwitterClientUserTimelineMethods {
  getUserTweets(username: string, count?: number, options?: UserTimelineFetchOptions): Promise<UserTimelineResult>;
}

export function withUserTimeline<TBase extends AbstractConstructor<TwitterClientBase>>(
  Base: TBase,
): Mixin<TBase, TwitterClientUserTimelineMethods> {
  abstract class TwitterClientUserTimeline extends Base {
    // biome-ignore lint/complexity/noUselessConstructor lint/suspicious/noExplicitAny: TS mixin constructor requirement.
    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * Resolve a screen name to a user ID using the UserByScreenName endpoint.
     */
    private async resolveUserId(screenName: string): Promise<{ success: true; userId: string } | { success: false; error: string }> {
      const normalizedScreenName = screenName.trim().replace(/^@/, '');
      const queryIds = await this.getUserByScreenNameQueryIds();
      const features = buildUserTweetsFeatures();

      const variables = {
        screen_name: normalizedScreenName,
        withSafetyModeUserFields: true,
      };

      const params = new URLSearchParams({
        variables: JSON.stringify(variables),
        features: JSON.stringify(features),
      });

      for (const queryId of queryIds) {
        const url = `${TWITTER_API_BASE}/${queryId}/UserByScreenName?${params.toString()}`;

        try {
          const response = await this.fetchWithTimeout(url, {
            method: 'GET',
            headers: this.getHeaders(),
          });

          if (response.status === 404) {
            continue;
          }

          if (!response.ok) {
            const text = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
          }

          const data = (await response.json()) as {
            data?: {
              user?: {
                result?: {
                  rest_id?: string;
                };
              };
            };
            errors?: Array<{ message: string }>;
          };

          if (data.errors?.length) {
            return { success: false, error: data.errors.map((e) => e.message).join(', ') };
          }

          const userId = data.data?.user?.result?.rest_id;
          if (userId) {
            return { success: true, userId };
          }
        } catch (error) {
          continue;
        }
      }

      return { success: false, error: `Failed to resolve user @${normalizedScreenName}` };
    }

    /**
     * Get tweets from a specific user's timeline using the UserTweets endpoint.
     */
    async getUserTweets(
      username: string,
      count = 20,
      options: UserTimelineFetchOptions = {},
    ): Promise<UserTimelineResult> {
      const { includeRaw = false, cursor: initialCursor } = options;

      // First resolve the username to a user ID
      const userIdResult = await this.resolveUserId(username);
      if (!userIdResult.success) {
        return { success: false, error: userIdResult.error };
      }

      const userId = userIdResult.userId;
      const features = buildUserTweetsFeatures();
      const pageSize = 20;
      const seen = new Set<string>();
      const tweets: TweetData[] = [];
      let cursor: string | undefined = initialCursor;
      let pagesFetched = 0;

      const fetchPage = async (pageCount: number, pageCursor?: string) => {
        const queryIds = await this.getUserTweetsQueryIds();

        const variables: Record<string, unknown> = {
          userId,
          count: pageCount,
          includePromotedContent: true,
          withQuickPromoteEligibilityTweetFields: true,
          withVoice: true,
          withV2Timeline: true,
        };

        if (pageCursor) {
          variables.cursor = pageCursor;
        }

        const params = new URLSearchParams({
          variables: JSON.stringify(variables),
          features: JSON.stringify(features),
        });

        let had404 = false;
        const errors: string[] = [];

        for (const queryId of queryIds) {
          const url = `${TWITTER_API_BASE}/${queryId}/UserTweets?${params.toString()}`;

          try {
            const response = await this.fetchWithTimeout(url, {
              method: 'GET',
              headers: this.getHeaders(),
            });

            // Handle rate limiting with backoff
            if (response.status === 429) {
              const resetHeader = response.headers.get('x-rate-limit-reset');
              const resetTime = resetHeader ? Number.parseInt(resetHeader, 10) * 1000 : Date.now() + 60000;
              const waitMs = Math.max(0, resetTime - Date.now());
              errors.push(`queryId=${queryId}: HTTP 429 (rate limited, reset in ${Math.ceil(waitMs / 1000)}s)`);

              // Don't try other queryIds if rate limited - they'll all fail
              return {
                success: false as const,
                error: `Rate limited. Try again in ${Math.ceil(waitMs / 1000)} seconds.`,
                had404: false,
              };
            }

            if (response.status === 404) {
              had404 = true;
              errors.push(`queryId=${queryId}: HTTP 404`);
              continue;
            }

            if (!response.ok) {
              const text = await response.text();
              errors.push(`queryId=${queryId}: HTTP ${response.status}: ${text.slice(0, 200)}`);
              continue;
            }

            const data = (await response.json()) as {
              data?: {
                user?: {
                  result?: {
                    timeline?: {
                      timeline?: {
                        instructions?: Array<{
                          entries?: Array<{
                            content?: {
                              itemContent?: {
                                tweet_results?: {
                                  result?: {
                                    rest_id?: string;
                                    legacy?: {
                                      full_text?: string;
                                      created_at?: string;
                                      reply_count?: number;
                                      retweet_count?: number;
                                      favorite_count?: number;
                                      in_reply_to_status_id_str?: string;
                                    };
                                    core?: {
                                      user_results?: {
                                        result?: {
                                          legacy?: {
                                            screen_name?: string;
                                            name?: string;
                                          };
                                        };
                                      };
                                    };
                                  };
                                };
                              };
                              cursorType?: string;
                              value?: string;
                            };
                          }>;
                        }>;
                      };
                    };
                  };
                };
              };
              errors?: Array<{ message: string }>;
            };


            if (data.errors?.length) {
              const msg = data.errors.map((e) => e.message).join(', ');
              errors.push(`queryId=${queryId}: GraphQL errors: ${msg}`);

              // Treat certain error patterns as stale queryId
              if (/operation|not found|unknown|queryid|malformed/i.test(msg)) {
                had404 = true;
              }

              continue;
            }

            const instructions = data.data?.user?.result?.timeline?.timeline?.instructions;
            const pageTweets = parseTweetsFromInstructions(instructions, { quoteDepth: this.quoteDepth, includeRaw });
            const nextCursor = extractCursorFromInstructions(instructions);

            return { success: true as const, tweets: pageTweets, cursor: nextCursor, had404 };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`queryId=${queryId}: exception: ${msg}`);
            continue;
          }
        }

        return {
          success: false as const,
          error: errors.length ? errors.join(' | ') : 'Unknown error fetching user timeline',
          had404,
        };
      };

      const fetchWithRefresh = async (pageCount: number, pageCursor?: string) => {
        const firstAttempt = await fetchPage(pageCount, pageCursor);
        if (firstAttempt.success) {
          return firstAttempt;
        }
        if (firstAttempt.had404) {
          await this.refreshQueryIds();
          const secondAttempt = await fetchPage(pageCount, pageCursor);
          if (secondAttempt.success) {
            return secondAttempt;
          }
          return { success: false as const, error: secondAttempt.error };
        }
        return { success: false as const, error: firstAttempt.error };
      };

      while (tweets.length < count) {
        const pageCount = Math.min(pageSize, count - tweets.length);
        const page = await fetchWithRefresh(pageCount, cursor);
        if (!page.success) {
          return {
            success: false,
            error: page.error,
            lastCursor: cursor,
            pagesFetched,
          };
        }

        pagesFetched += 1;

        for (const tweet of page.tweets) {
          if (seen.has(tweet.id)) {
            continue;
          }
          seen.add(tweet.id);
          tweets.push(tweet);
          if (tweets.length >= count) {
            break;
          }
        }

        if (!page.cursor || page.cursor === cursor || page.tweets.length === 0) {
          break;
        }
        cursor = page.cursor;
      }

      return {
        success: true,
        tweets,
        lastCursor: cursor,
        pagesFetched,
      };
    }
  }

  return TwitterClientUserTimeline;
}
