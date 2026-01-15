import type { AbstractConstructor, Mixin, TwitterClientBase } from './twitter-client-base.js';
import { TWITTER_API_BASE } from './twitter-client-constants.js';
import { buildSearchFeatures } from './twitter-client-features.js';
import type { NewsItem, NewsResult } from './twitter-client-types.js';

/** Valid news/trending tabs */
export type NewsTab = 'for_you' | 'trending' | 'news' | 'sports' | 'entertainment';

/** Options for news fetch methods */
export interface NewsFetchOptions {
  /** Only fetch AI-curated content (default: true) */
  aiOnly?: boolean;
  /** Include related tweets for each news item (default: false) */
  withTweets?: boolean;
  /** Specific tabs to fetch from (default: ['for_you', 'news', 'sports', 'entertainment']) */
  tabs?: NewsTab[];
  /** Include raw GraphQL response in `_raw` field */
  includeRaw?: boolean;
}

export interface TwitterClientNewsMethods {
  getNews(count?: number, options?: NewsFetchOptions): Promise<NewsResult>;
}

export function withNews<TBase extends AbstractConstructor<TwitterClientBase>>(
  Base: TBase,
): Mixin<TBase, TwitterClientNewsMethods> {
  abstract class TwitterClientNews extends Base {
    // biome-ignore lint/complexity/noUselessConstructor lint/suspicious/noExplicitAny: TS mixin constructor requirement.
    constructor(...args: any[]) {
      super(...args);
    }

    /**
     * Fetch news and trending topics from X's Explore page tabs.
     * Headlines are automatically deduplicated across tabs.
     */
    async getNews(count = 10, options: NewsFetchOptions = {}): Promise<NewsResult> {
      const { aiOnly = true, includeRaw = false, tabs } = options;

      // Default tabs exclude 'trending' to reduce noise
      const defaultTabs: NewsTab[] = ['for_you', 'news', 'sports', 'entertainment'];
      const selectedTabs = tabs ?? defaultTabs;

      const features = buildSearchFeatures();
      const seen = new Set<string>();
      const newsItems: NewsItem[] = [];

      for (const tab of selectedTabs) {
        const tabResult = await this.fetchNewsTab(tab, count, { aiOnly, includeRaw, features });

        if (!tabResult.success) {
          // Continue with other tabs even if one fails
          continue;
        }

        for (const item of tabResult.items) {
          // Deduplicate by headline
          const key = item.headline.toLowerCase().trim();
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          newsItems.push(item);

          if (newsItems.length >= count) {
            break;
          }
        }

        if (newsItems.length >= count) {
          break;
        }
      }

      return { success: true, items: newsItems.slice(0, count) };
    }

    private async fetchNewsTab(
      tab: NewsTab,
      count: number,
      options: {
        aiOnly: boolean;
        includeRaw: boolean;
        features: Record<string, unknown>;
      },
    ): Promise<{ success: boolean; items: NewsItem[] }> {
      const queryIds = await this.getExploreQueryIds();
      const { aiOnly, includeRaw, features } = options;

      for (const queryId of queryIds) {
        const variables = {
          count,
          includePromotedContent: false,
          withCommunity: false,
          ...(tab !== 'for_you' && { tab }),
        };

        const params = new URLSearchParams({
          variables: JSON.stringify(variables),
          features: JSON.stringify(features),
        });

        const url = `${TWITTER_API_BASE}/${queryId}/ExplorePage?${params.toString()}`;

        try {
          const response = await this.fetchWithTimeout(url, {
            method: 'GET',
            headers: this.getHeaders(),
          });

          if (response.status === 404) {
            continue;
          }

          if (!response.ok) {
            continue;
          }

          const data = (await response.json()) as {
            data?: {
              explore_page?: {
                body?: {
                  timeline?: {
                    instructions?: Array<{
                      entries?: Array<{
                        entryId?: string;
                        content?: {
                          itemContent?: {
                            trend?: {
                              name?: string;
                              trendMetadata?: {
                                metaDescription?: string;
                                domainContext?: string;
                              };
                              groupedTrends?: {
                                trends?: Array<{
                                  name?: string;
                                  trendMetadata?: {
                                    metaDescription?: string;
                                    domainContext?: string;
                                  };
                                }>;
                              };
                            };
                            eventSummary?: {
                              title?: string;
                              subtitle?: string;
                              image?: {
                                url?: string;
                              };
                            };
                          };
                          items?: Array<{
                            item?: {
                              itemContent?: {
                                trend?: {
                                  name?: string;
                                  trendMetadata?: {
                                    metaDescription?: string;
                                    domainContext?: string;
                                  };
                                };
                              };
                            };
                          }>;
                        };
                      }>;
                    }>;
                  };
                };
              };
            };
            errors?: Array<{ message: string }>;
          };

          if (data.errors && data.errors.length > 0) {
            continue;
          }

          const instructions = data.data?.explore_page?.body?.timeline?.instructions;
          if (!instructions) {
            continue;
          }

          const items = this.parseNewsItems(instructions, tab, { aiOnly, includeRaw });
          return { success: true, items };
        } catch {}
      }

      return { success: false, items: [] };
    }

    private parseNewsItems(
      instructions: Array<{
        entries?: Array<{
          entryId?: string;
          content?: {
            itemContent?: {
              trend?: {
                name?: string;
                trendMetadata?: {
                  metaDescription?: string;
                  domainContext?: string;
                };
                groupedTrends?: {
                  trends?: Array<{
                    name?: string;
                    trendMetadata?: {
                      metaDescription?: string;
                      domainContext?: string;
                    };
                  }>;
                };
              };
              eventSummary?: {
                title?: string;
                subtitle?: string;
              };
            };
            items?: Array<{
              item?: {
                itemContent?: {
                  trend?: {
                    name?: string;
                    trendMetadata?: {
                      metaDescription?: string;
                      domainContext?: string;
                    };
                  };
                };
              };
            }>;
          };
        }>;
      }>,
      tab: NewsTab,
      options: { aiOnly: boolean; includeRaw: boolean },
    ): NewsItem[] {
      const items: NewsItem[] = [];
      const { aiOnly, includeRaw } = options;

      for (const instruction of instructions) {
        if (!instruction.entries) {
          continue;
        }

        for (const entry of instruction.entries) {
          const entryId = entry.entryId ?? '';

          // Skip promoted content
          if (entryId.includes('promoted')) {
            continue;
          }

          // Filter AI-curated content if requested
          if (aiOnly && !entryId.includes('ai-curated')) {
            continue;
          }

          const itemContent = entry.content?.itemContent;
          if (!itemContent) {
            continue;
          }

          // Parse trend/news item
          const trend = itemContent.trend;
          const eventSummary = itemContent.eventSummary;

          if (trend) {
            const headline = trend.name ?? '';
            const metadata = trend.trendMetadata;
            const category = metadata?.domainContext;
            const description = metadata?.metaDescription;

            if (headline) {
              const item: NewsItem = {
                id: entryId,
                headline,
                category,
                description,
                tab,
              };

              if (includeRaw) {
                item._raw = entry;
              }

              items.push(item);
            }

            // Handle grouped trends
            if (trend.groupedTrends?.trends) {
              for (const groupedTrend of trend.groupedTrends.trends) {
                const groupedHeadline = groupedTrend.name ?? '';
                const groupedMetadata = groupedTrend.trendMetadata;

                if (groupedHeadline) {
                  const groupedItem: NewsItem = {
                    id: `${entryId}-grouped-${groupedHeadline}`,
                    headline: groupedHeadline,
                    category: groupedMetadata?.domainContext,
                    description: groupedMetadata?.metaDescription,
                    tab,
                  };

                  if (includeRaw) {
                    groupedItem._raw = groupedTrend;
                  }

                  items.push(groupedItem);
                }
              }
            }
          } else if (eventSummary) {
            const headline = eventSummary.title ?? '';
            const description = eventSummary.subtitle;

            if (headline) {
              const item: NewsItem = {
                id: entryId,
                headline,
                description,
                tab,
              };

              if (includeRaw) {
                item._raw = entry;
              }

              items.push(item);
            }
          }

          // Handle items array (nested trends)
          if (entry.content?.items) {
            for (const nestedItem of entry.content.items) {
              const nestedContent = nestedItem.item?.itemContent;
              if (!nestedContent?.trend) {
                continue;
              }

              const nestedHeadline = nestedContent.trend.name ?? '';
              const nestedMetadata = nestedContent.trend.trendMetadata;

              if (nestedHeadline) {
                const item: NewsItem = {
                  id: `${entryId}-nested-${nestedHeadline}`,
                  headline: nestedHeadline,
                  category: nestedMetadata?.domainContext,
                  description: nestedMetadata?.metaDescription,
                  tab,
                };

                if (includeRaw) {
                  item._raw = nestedItem;
                }

                items.push(item);
              }
            }
          }
        }
      }

      return items;
    }

    private async getExploreQueryIds(): Promise<string[]> {
      const exploreId = await this.getQueryId('ExplorePage');

      if (exploreId) {
        return [exploreId];
      }

      // Fallback query IDs for ExplorePage
      return [
        'gCKhXL4VRpxTNNsE_RJCdA', // Known fallback 1
        'V7H0Ap3_Hh2FyS75OCDO3Q', // Known fallback 2
      ];
    }
  }

  return TwitterClientNews;
}
