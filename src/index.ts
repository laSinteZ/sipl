import fs from "fs";
import { resolve } from "path";
import axios from "axios";
import { InstagramPostResponse, MediaNode } from "./types/postRequest";
import { ProfileRequest } from "./types/userRequest";
import { NextPageRequest } from "./types/nextPageRequest";
import format from "date-fns/format";
import { SingleBar, Presets } from "cli-progress";
import uniqBy from "lodash.uniqby";
// @ts-ignore
import piexif from "piexifjs";

interface SaveObject {
  src: string;
  name: string;
  exif: {
    DateTimeOriginal: string;
  };
}

const DATE_FORMAT = "yyyy.MM.d HH-mm"
const EXPORT_TITLE = format(Date.now(), DATE_FORMAT);

async function fetchProfileInfo(
  username: string
): Promise<ProfileRequest> {
  const { data } = await axios.get<ProfileRequest>(
    `https://www.instagram.com/${username}/?__a=1`
  );
  return data;
}

async function fetchNextPage(userId: string, after: string): Promise<NextPageRequest> {
  const first = 50; // Seems like it's maximum number available
  const hash = "56a7068fea504063273cc2120ffd54f3";
  const { data } = await axios.get<NextPageRequest>(
    `https://www.instagram.com/graphql/query/?query_hash=${hash}&variables=%7B%22id%22%3A%22${userId}%22%2C%22first%22%3A${first}%2C%22after%22%3A%22${after}%22%7D`
  );
  return data;
}

async function fetchPostShortLinks(username: string) {
  let res: string[] = [];
  const { graphql: initialResponse } = await fetchProfileInfo(username);
  const userId = initialResponse.user.id;
  let nextPageCursor = initialResponse.user.edge_owner_to_timeline_media.page_info.end_cursor;
  let hasNextPage = initialResponse.user.edge_owner_to_timeline_media.page_info.has_next_page;

  res = res.concat(initialResponse.user.edge_owner_to_timeline_media.edges.map(x => x.node.shortcode));

  while (hasNextPage && nextPageCursor) {
    const { data: nextPage } = await fetchNextPage(userId, nextPageCursor);
    nextPageCursor = nextPage.user.edge_owner_to_timeline_media.page_info.end_cursor;
    hasNextPage = nextPage.user.edge_owner_to_timeline_media.page_info.has_next_page;
    res = res.concat(nextPage.user.edge_owner_to_timeline_media.edges.map(x => x.node.shortcode ));
  }

  return res;
}

async function fetchInstagramPhotoResponse(
  postId: string
): Promise<InstagramPostResponse> {
  const { data } = await axios.get<InstagramPostResponse>(
    `https://www.instagram.com/p/${postId}/?__a=1`
  );
  return data;
}

function getLast<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[arr.length - 1];
}

function formatDate(timestamp: number): string {
  return format(timestamp * 1000, DATE_FORMAT);
}

function formatIdx(isSingle: boolean, idx: number): string {
  if (!isSingle) return "";
  return ` photo ${idx + 1}`;
}

function getMediaNodes(response: InstagramPostResponse): MediaNode[] {
  if (response?.graphql?.shortcode_media?.edge_sidecar_to_children) {
    return response.graphql.shortcode_media.edge_sidecar_to_children.edges.map(
      ({ node }) => ({
        ...node,
        taken_at_timestamp: response.graphql.shortcode_media.taken_at_timestamp,
      })
    );
  } else {
    return [response.graphql.shortcode_media];
  }
}

function getLinkAndName(files: MediaNode[]): SaveObject[] {
  const isSingle = files.length > 1;
  return files.map((node, idx) => {
    const { taken_at_timestamp, display_resources } = node;
    const src = getLast(display_resources)?.src!;
    const name = `${formatDate(taken_at_timestamp)}${formatIdx(isSingle, idx)}`;
    return {
      src,
      name,
      exif: {
        DateTimeOriginal: format(taken_at_timestamp * 1000, "yyyy:MM:dd HH:mm:ss"),
      },
    };
  });
}

async function downloadAndSaveImage(file: SaveObject, pathToFolder: string): Promise<any> {
  const { src, name } = file;
  const path = resolve(pathToFolder, name + ".jpg");

  const response = await axios.get<ArrayBuffer>(src, {
    responseType: "arraybuffer",
  });

  if (!response?.data) {
    return;
  }

  // TODO: write more exif data?
  const newJpeg = modifyExifOfJpg(response.data, file);
  fs.writeFileSync(path, newJpeg);
}

  // TODO: write more exif data?
function modifyExifOfJpg(file: ArrayBuffer, fileMetaData: SaveObject): Buffer {
  const jpeg = Buffer.from(file);
  const data = jpeg.toString("binary");
  const exifObj = piexif.load(data);
  exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = fileMetaData.exif.DateTimeOriginal;
  const exifbytes = piexif.dump(exifObj);
  const newData = piexif.insert(exifbytes, data);
  return Buffer.from(newData, "binary");
}

function createFolderIfPossible(path: string): void {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

function removeAtSymbol(username: string): string {
  return username.indexOf("@") === 0 ? username.slice(1) : username;
}

// TODO: Recover if fails
// TODO: Process errors
// TODO: deal with videos. either filter or download them.
export async function downloadPostsOfUser(username: string) {
  username = removeAtSymbol(username);

  console.log(`Fetching all posts of @${username}`)
  const links = await fetchPostShortLinks(username);
  console.log(`Processing ${links.length} posts`);

  const responses = await Promise.all(
    links.map((x) => fetchInstagramPhotoResponse(x))
  );

  const files = uniqBy(
    responses.map((x) => getLinkAndName(getMediaNodes(x))).flatMap((x) => x),
    "src"
  );

  const folderName = `@${username} ${EXPORT_TITLE}`;
  const pathToFolder = resolve(process.cwd(), folderName);
  createFolderIfPossible(pathToFolder);

  console.log(`Downloading ${files.length} photos to ${folderName}`);

  const progressBar = new SingleBar({}, Presets.shades_classic);
  progressBar.start(files.length, 0);

  // Doing it in sync fashion. TODO: async?
  for (let i = 0; i < files.length; i++) {
    await downloadAndSaveImage(files[i], pathToFolder);
    progressBar.update(i + 1);
  }

  progressBar.stop();
}
