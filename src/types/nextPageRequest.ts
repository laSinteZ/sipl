export interface NextPageRequest {
  data:   Data;
  status: string;
}

export interface Data {
  user: DataUser;
}

export interface DataUser {
  edge_owner_to_timeline_media: EdgeOwnerToTimelineMedia;
}

export interface EdgeOwnerToTimelineMedia {
  count: number;
  page_info: PageInfo;
  edges: EdgeOwnerToTimelineMediaEdge[];
}

export interface EdgeOwnerToTimelineMediaEdge {
  node: PurpleNode;
}

export interface PurpleNode {
  __typename: Typename;
  id: string;
  gating_info: null;
  fact_check_overall_rating: null;
  fact_check_information: null;
  media_overlay_info: null;
  sensitivity_friction_info: null;
  dimensions: Dimensions;
  display_url: string;
  display_resources: Resource[];
  is_video: boolean;
  media_preview: null | string;
  tracking_token: string;
  edge_media_to_tagged_user: EdgeMediaToTaggedUser;
  accessibility_caption: null;
  edge_media_to_caption: EdgeMediaTo;
  shortcode: string;
  edge_media_to_comment: EdgeMediaToComment;
  edge_media_to_sponsor_user: EdgeMediaTo;
  comments_disabled: boolean;
  taken_at_timestamp: number;
  edge_media_preview_like: EdgeMediaPreviewLike;
  owner: Owner;
  location: Location;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  viewer_has_saved_to_collection: boolean;
  viewer_in_photo_of_you: boolean;
  viewer_can_reshare: boolean;
  thumbnail_src: string;
  thumbnail_resources: Resource[];
  edge_sidecar_to_children?: EdgeSidecarToChildren;
}

export enum Typename {
  GraphImage = "GraphImage",
  GraphSidecar = "GraphSidecar",
}

export interface Dimensions {
  height: number;
  width: number;
}

export interface Resource {
  src: string;
  config_width: number;
  config_height: number;
}

export interface EdgeMediaPreviewLike {
  count: number;
  edges: any[];
}

export interface EdgeMediaTo {
  edges: EdgeMediaToCaptionEdge[];
}

export interface EdgeMediaToCaptionEdge {
  node: FluffyNode;
}

export interface FluffyNode {
  text: string;
}

export interface EdgeMediaToComment {
  count: number;
  page_info: PageInfo;
}

export interface PageInfo {
  has_next_page: boolean;
  end_cursor: null | string;
}

export interface EdgeMediaToTaggedUser {
  edges: EdgeMediaToTaggedUserEdge[];
}

export interface EdgeMediaToTaggedUserEdge {
  node: TentacledNode;
}

export interface TentacledNode {
  user: NodeUser;
  x: number;
  y: number;
}

export interface NodeUser {
  full_name: string;
  id: string;
  is_verified: boolean;
  profile_pic_url: string;
  username: string;
}

export interface EdgeSidecarToChildren {
  edges: EdgeSidecarToChildrenEdge[];
}

export interface EdgeSidecarToChildrenEdge {
  node: StickyNode;
}

export interface StickyNode {
  __typename: Typename;
  id: string;
  gating_info: null;
  fact_check_overall_rating: null;
  fact_check_information: null;
  media_overlay_info: null;
  sensitivity_friction_info: null;
  dimensions: Dimensions;
  display_url: string;
  display_resources: Resource[];
  is_video: boolean;
  media_preview: string;
  tracking_token: string;
  edge_media_to_tagged_user: EdgeMediaToTaggedUser;
  accessibility_caption: null;
}

export interface Location {
  id: string;
  has_public_page: boolean;
  name: string;
  slug: string;
}

export interface Owner {
  id: string;
  username: string;
}
