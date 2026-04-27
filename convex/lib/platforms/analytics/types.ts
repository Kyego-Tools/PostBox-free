// Shared types for platform analytics

export interface PageInsightsData {
  followers: number;
  views: number; // page_media_view (replaces impressions)
  engagements: number; // page_post_engagements
  reach: number; // page_impressions_unique (deprecated June 2026)
  profileViews: number; // page_views_total
}

export interface FollowerHistoryPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface PostInsight {
  postId: string;
  message?: string;
  createdTime: string;
  fullPicture?: string;
  permalinkUrl?: string;
  views: number; // post_media_view
  reach: number; // post_total_media_view_unique
  reactions: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface AnalyticsCacheEntry {
  pageInsights?: PageInsightsData;
  followerHistory?: FollowerHistoryPoint[];
  posts?: PostInsight[];
}
