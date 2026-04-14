var express = require('express');
const fs = require('fs');
const path = require('path');
const {execFile} = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

const constants = require('../constants.js');
const logger = require('../utils/logger.js');
const utils = require('../utils/utils.js');

var router = express.Router();

function safeDeleteIfExists(filepath) {
  if (fs.existsSync(filepath)) {
    utils.deleteFile(filepath);
  }
}

/** Preserve original container extension from upload path; default if missing. */
function videoOutputPath(savedFile) {
  const ext = path.extname(savedFile) || '.mp4';
  return savedFile + '-sanitized' + ext;
}

function imageOutputPath(savedFile) {
  const ext = path.extname(savedFile) || '.jpg';
  return savedFile + '-sanitized' + ext;
}

router.post('/video', function(req, res, next) {
  const savedFile = res.locals.savedFile;
  const outputFile = videoOutputPath(savedFile);
  const mode = String(req.query.mode || 'copy').toLowerCase();

  let outputOptions;
  if (mode === 'reencode') {
    outputOptions = [
      '-map_metadata', '-1',
      '-map_chapters', '-1',
      '-codec:v', 'libx264',
      '-profile:v', 'high',
      '-r', '15',
      '-crf', '23',
      '-preset', 'ultrafast',
      '-b:v', '500k',
      '-maxrate', '500k',
      '-bufsize', '1000k',
      '-vf', 'scale=-2:640',
      '-pix_fmt', 'yuv420p',
      '-threads', '8',
      '-codec:a', 'libfdk_aac',
      '-b:a', '128k',
    ];
  } else {
    outputOptions = [
      '-map_metadata', '-1',
      '-map_chapters', '-1',
      '-c', 'copy',
    ];
  }

  logger.debug(`sanitize video: ${savedFile} -> ${outputFile}, mode=${mode}`);

  ffmpeg(savedFile)
      .renice(constants.defaultFFMPEGProcessPriority)
      .outputOptions(outputOptions)
      .on('error', function(err) {
        logger.error(`${err}`);
        safeDeleteIfExists(outputFile);
        utils.deleteFile(savedFile);
        res.writeHead(500, {'Connection': 'close'});
        res.end(JSON.stringify({error: `${err}`}));
      })
      .on('end', function() {
        utils.deleteFile(savedFile);
        return utils.downloadFile(outputFile, null, req, res, next);
      })
      .save(outputFile);
});

router.post('/image', function(req, res, next) {
  const savedFile = res.locals.savedFile;
  const outputFile = imageOutputPath(savedFile);

  logger.debug(`sanitize image: ${savedFile} -> ${outputFile}`);

  execFile('exiftool', ['-all=', '-o', outputFile, savedFile], {
    maxBuffer: 10 * 1024 * 1024,
  }, function(err, _stdout, stderr) {
    if (err) {
      logger.error(`exiftool: ${err} ${stderr || ''}`);
      safeDeleteIfExists(outputFile);
      utils.deleteFile(savedFile);
      res.writeHead(500, {'Connection': 'close'});
      res.end(JSON.stringify({error: err.message || String(err)}));
      return;
    }
    utils.deleteFile(savedFile);
    return utils.downloadFile(outputFile, null, req, res, next);
  });
});

module.exports = router;
