import fs from "fs";
import { resolve } from "path";
import axios from "axios";
import { InstagramPostResponse, MediaNode } from "./types";
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

async function downloadImage(file: SaveObject): Promise<any> {
  const { src, name } = file;
  const path = resolve(__dirname, "downloads", EXPORT_TITLE, name + ".jpg");

  const response = await axios.get<ArrayBuffer>(src, {
    responseType: "arraybuffer",
  });
  if (!response.data) {
    console.log(file);
    return;
  }

  // TODO: write more exif data?
  const jpeg = Buffer.from(response.data);
  const data = jpeg.toString("binary");
  const exifObj = piexif.load(data);
  exifObj.Exif[piexif.ExifIFD.DateTimeOriginal] = file.exif.DateTimeOriginal;
  const exifbytes = piexif.dump(exifObj);
  const newData = piexif.insert(exifbytes, data);
  const newJpeg = Buffer.from(newData, "binary");

  fs.writeFileSync(path, newJpeg);
}

// Provide links here, so it works :)
export async function process(links: string[]) {
  console.log(`Exporting to downloads/${EXPORT_TITLE}`);
  if (!fs.existsSync(resolve(__dirname, "downloads"))) {
    fs.mkdirSync(resolve(__dirname, "downloads"));
  }
  if (!fs.existsSync(resolve(__dirname, "downloads", EXPORT_TITLE))) {
    fs.mkdirSync(resolve(__dirname, "downloads", EXPORT_TITLE));
  }

  console.log(`Processing ${links.length} posts`);
  // TODO: recover if fail
  const responses = await Promise.all(
    links.map((x) => fetchInstagramPhotoResponse(x))
  );

  const files = uniqBy(
    responses.map((x) => getLinkAndName(getMediaNodes(x))).flatMap((x) => x),
    "src"
  );

  console.log(`Downloading ${files.length} files...`);

  const progressBar = new SingleBar({}, Presets.shades_classic);
  progressBar.start(files.length, 0);

  // Doing it in sync fashion. TODO: async?
  for (let i = 0; i < files.length; i++) {
    await downloadImage(files[i]);
    progressBar.update(i + 1);
  }

  progressBar.stop();
}

