'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPostsOfUser = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = require("path");
const axios_1 = tslib_1.__importDefault(require("axios"));
const format_1 = tslib_1.__importDefault(require("date-fns/format"));
const cli_progress_1 = require("cli-progress");
const lodash_uniqby_1 = tslib_1.__importDefault(require("lodash.uniqby"));
// @ts-ignore
const piexifjs_1 = tslib_1.__importDefault(require("piexifjs"));
const DATE_FORMAT = "yyyy.MM.d HH-mm";
const EXPORT_TITLE = format_1.default(Date.now(), DATE_FORMAT);
async function fetchProfileInfo(username) {
    const { data } = await axios_1.default.get(`https://www.instagram.com/${username}/?__a=1`);
    return data;
}
async function fetchNextPage(userId, after) {
    const first = 50; // Seems like it's maximum number available
    const hash = "56a7068fea504063273cc2120ffd54f3";
    const { data } = await axios_1.default.get(`https://www.instagram.com/graphql/query/?query_hash=${hash}&variables=%7B%22id%22%3A%22${userId}%22%2C%22first%22%3A${first}%2C%22after%22%3A%22${after}%22%7D`);
    return data;
}
async function fetchPostShortLinks(username) {
    let res = [];
    const { graphql: initialResponse } = await fetchProfileInfo(username);
    const userId = initialResponse.user.id;
    let nextPageCursor = initialResponse.user.edge_owner_to_timeline_media.page_info.end_cursor;
    let hasNextPage = initialResponse.user.edge_owner_to_timeline_media.page_info.has_next_page;
    res = res.concat(initialResponse.user.edge_owner_to_timeline_media.edges.map(x => x.node.shortcode));
    while (hasNextPage && nextPageCursor) {
        const { data: nextPage } = await fetchNextPage(userId, nextPageCursor);
        nextPageCursor = nextPage.user.edge_owner_to_timeline_media.page_info.end_cursor;
        hasNextPage = nextPage.user.edge_owner_to_timeline_media.page_info.has_next_page;
        res = res.concat(nextPage.user.edge_owner_to_timeline_media.edges.map(x => x.node.shortcode));
    }
    return res;
}
async function fetchInstagramPhotoResponse(postId) {
    const { data } = await axios_1.default.get(`https://www.instagram.com/p/${postId}/?__a=1`);
    return data;
}
function getLast(arr) {
    if (!arr.length)
        return undefined;
    return arr[arr.length - 1];
}
function formatDate(timestamp) {
    return format_1.default(timestamp * 1000, DATE_FORMAT);
}
function formatIdx(isSingle, idx) {
    if (!isSingle)
        return "";
    return ` photo ${idx + 1}`;
}
function getMediaNodes(response) {
    if (response?.graphql?.shortcode_media?.edge_sidecar_to_children) {
        return response.graphql.shortcode_media.edge_sidecar_to_children.edges.map(({ node }) => ({
            ...node,
            taken_at_timestamp: response.graphql.shortcode_media.taken_at_timestamp,
        }));
    }
    else {
        return [response.graphql.shortcode_media];
    }
}
function getLinkAndName(files) {
    const isSingle = files.length > 1;
    return files.map((node, idx) => {
        const { taken_at_timestamp, display_resources } = node;
        const src = getLast(display_resources)?.src;
        const name = `${formatDate(taken_at_timestamp)}${formatIdx(isSingle, idx)}`;
        return {
            src,
            name,
            exif: {
                DateTimeOriginal: format_1.default(taken_at_timestamp * 1000, "yyyy:MM:dd HH:mm:ss"),
            },
        };
    });
}
async function downloadImage(file, pathToFolder) {
    const { src, name } = file;
    const path = path_1.resolve(pathToFolder, name + ".jpg");
    const response = await axios_1.default.get(src, {
        responseType: "arraybuffer",
    });
    if (!response?.data) {
        return;
    }
    // TODO: write more exif data?
    const jpeg = Buffer.from(response.data);
    const data = jpeg.toString("binary");
    const exifObj = piexifjs_1.default.load(data);
    exifObj.Exif[piexifjs_1.default.ExifIFD.DateTimeOriginal] = file.exif.DateTimeOriginal;
    const exifbytes = piexifjs_1.default.dump(exifObj);
    const newData = piexifjs_1.default.insert(exifbytes, data);
    const newJpeg = Buffer.from(newData, "binary");
    fs_1.default.writeFileSync(path, newJpeg);
}
function createFolderIfPossible(path) {
    if (!fs_1.default.existsSync(path)) {
        fs_1.default.mkdirSync(path);
    }
}
// TODO: Recover if fails
// TODO: Process errors
// TODO: deal with videos. either filter or download them.
async function downloadPostsOfUser(username) {
    console.log(`Fetching all posts of @${username}`);
    const links = await fetchPostShortLinks(username);
    console.log(`Processing ${links.length} posts`);
    const responses = await Promise.all(links.map((x) => fetchInstagramPhotoResponse(x)));
    const files = lodash_uniqby_1.default(responses.map((x) => getLinkAndName(getMediaNodes(x))).flatMap((x) => x), "src");
    const folderName = `@${username} ${EXPORT_TITLE}`;
    const pathToFolder = path_1.resolve(process.cwd(), folderName);
    createFolderIfPossible(pathToFolder);
    console.log(`Downloading ${files.length} photos to ${folderName}`);
    const progressBar = new cli_progress_1.SingleBar({}, cli_progress_1.Presets.shades_classic);
    progressBar.start(files.length, 0);
    // Doing it in sync fashion. TODO: async?
    for (let i = 0; i < files.length; i++) {
        await downloadImage(files[i], pathToFolder);
        progressBar.update(i + 1);
    }
    progressBar.stop();
}
exports.downloadPostsOfUser = downloadPostsOfUser;
