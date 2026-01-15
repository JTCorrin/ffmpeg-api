# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FFMPEG API is a Node.js/Express web service that wraps FFmpeg for media file conversion, extraction, and probing. It's designed to run as a Docker container using the `jrottenberg/ffmpeg` base image with a bundled single binary via `pkg`.

## Build and Run Commands

```bash
# Build Docker image
docker build -t ffmpeg-api .

# Run in foreground (dev)
docker run -it --rm --name ffmpeg-api -p 3000:3000 ffmpeg-api

# Run with debug logging
docker run -it --rm -p 3000:3000 -e LOG_LEVEL=debug ffmpeg-api

# Run with persistent files (useful for debugging)
docker run -it --rm -p 3000:3000 -v /var/cache/ffmpeg-api:/tmp -e KEEP_ALL_FILES=true ffmpeg-api

# Install dependencies locally (from src/ directory)
cd src && npm install
```

## Architecture

### Request Flow
All POST requests flow through `uploadfile.js` middleware first, which saves the uploaded file to `/tmp/` using Busboy and stores the path in `res.locals.savedFile`. Route handlers then access this file path for processing.

### Route Structure
- [app.js](src/app.js) - Express server setup, mounts all routes
- [routes/uploadfile.js](src/routes/uploadfile.js) - Middleware handling multipart file uploads for all POST endpoints
- [routes/convert.js](src/routes/convert.js) - Audio/video/image conversion endpoints (`/convert/*`)
- [routes/extract.js](src/routes/extract.js) - Video extraction endpoints (`/video/extract/*`) for images and audio
- [routes/probe.js](src/routes/probe.js) - Media metadata probing (`/probe`)

### Key Dependencies
- `fluent-ffmpeg` - Node.js wrapper for FFmpeg commands
- `busboy` - Streaming multipart form parser for file uploads
- `archiver` - ZIP/tar.gz compression for extracted images
- `winston` - Logging with configurable levels via `LOG_LEVEL` env var

### Environment Variables
- `LOG_LEVEL` - Logging verbosity (default: `info`)
- `FILE_SIZE_LIMIT_BYTES` - Max upload size (default: 512MB)
- `KEEP_ALL_FILES` - Prevent file deletion when `true` (default: `false`)
- `EXTERNAL_PORT` - Override port in generated download URLs (for Docker port mapping)
- `API_KEY` - API key for X-API-Key header authentication (default: disabled)

### File Handling Pattern
Files are saved to `/tmp/` with unique names via `unique-filename`. After processing, files are automatically deleted unless `KEEP_ALL_FILES=true` or `?delete=no` query param is used.

## Technical Notes

### H.264 Encoding
Video conversion uses `-profile:v high` and `-pix_fmt yuv420p` for Firefox/Safari compatibility. The `high444` profile is intentionally avoided due to browser support issues.

### FFmpeg Codecs
- Video: `libx264` with hardware-friendly settings
- Audio (video conversion): `libfdk_aac` (non-GPL)
- Audio extraction: PCM WAV output

## API Key Authentication

Optional API key authentication via the `X-API-Key` header:
- Set `API_KEY` environment variable to enable authentication
- When enabled, all endpoints require `X-API-Key: <your-key>` header
- When `API_KEY` is not set, authentication is disabled (open access for backward compatibility)
- Returns `401 Unauthorized` for missing or invalid keys
- Middleware located at [middleware/apiKeyAuth.js](src/middleware/apiKeyAuth.js)
