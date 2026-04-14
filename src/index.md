# ffmpeg API

An web service for converting audio/video files using FFMPEG.

Sources: https://github.com/gnh1201/ffmpeg-api

Based on:

- https://github.com/samisalkosuo/ffmpeg-api
- https://github.com/surebert/docker-ffmpeg-service
- https://github.com/jrottenberg/ffmpeg 
- https://github.com/fluent-ffmpeg/node-fluent-ffmpeg


# Endpoints

[API endpoints](./endpoints)

## Metadata / privacy (strip tags)

- `POST /sanitize/video` — Returns the uploaded video with **no global container metadata** and **no chapters** (`-map_metadata -1`, `-map_chapters -1`). Default `mode=copy` uses stream copy (fast, no re-encode). Some per-stream or muxer-specific data may remain; use `mode=reencode` to re-encode video/audio (same H.264/AAC style as `/convert/video/to/mp4`) for stronger stripping at the cost of CPU and quality.
- `POST /sanitize/image` — Removes metadata (EXIF, IPTC, XMP, etc.) with **ExifTool** (`exiftool -all= -o …`). Output keeps the original file extension. Exotic formats may be unsupported depending on the image.

Same upload and `?delete=no` behavior as other POST routes.
