import { createWriteStream } from "node:fs";
import {  Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const MediaService = async (media: { filename: any; buffer: Iterable<any> | AsyncIterable<any>; }) => {
    const filepath = `./public/${media.filename}`;
    const readable = Readable.from(media.buffer);
    await pipeline(readable, createWriteStream(filepath));
    return filepath
}