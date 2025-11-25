import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const MediaService = async (media: {
  filename: any;
  buffer: Iterable<any> | AsyncIterable<any>;
}) => {
  const filepath = `${media.filename}`;
  const readable = Readable.from(media.buffer);
  await pipeline(readable, createWriteStream(`./public/${filepath}`));

  return filepath;
};
