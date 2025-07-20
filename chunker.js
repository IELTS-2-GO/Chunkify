#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// --- IELTS2GO Branding & Constants ---
const BRAND = {
  name: 'IELTS2GO',
  tagline: 'Empowering Your English Journey'
};

// --- Styled Console Output ---
const log = {
  brand: () => {
    console.log(chalk.bold.blue(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║    ██╗███████╗██╗  ████████╗███████╗██████╗  ██████╗  ██████╗             ║
║    ██║██╔════╝██║  ╚══██╔══╝██╔════╝╚════██╗██╔════╝ ██╔═══██╗            ║
║    ██║█████╗  ██║     ██║   ███████╗ █████╔╝██║  ███╗██║   ██║            ║
║    ██║██╔══╝  ██║     ██║   ╚════██║██╔═══╝ ██║   ██║██║   ██║            ║
║    ██║███████╗███████╗██║   ███████║███████╗╚██████╔╝╚██████╔╝            ║
║    ╚═╝╚══════╝╚══════╝╚═╝   ╚══════╝╚══════╝ ╚═════╝  ╚═════╝             ║
║                                                                           ║
║                   ${chalk.green('🎬 Video Chunker')} - ${chalk.gray(BRAND.tagline)}                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`));
  },
  
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✅'), message),
  error: (message) => console.log(chalk.red('❌'), message),
  warning: (message) => console.log(chalk.yellow('⚠️'), message),
  progress: (message) => console.log(chalk.yellow('🎬'), message),
  folder: (message) => console.log(chalk.green('📂'), message),
  
  divider: () => console.log(chalk.gray('─'.repeat(75))),
  
  step: (current, total, message) => {
    const progress = `[${current}/${total}]`;
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    
    console.log(
      chalk.blue(progress),
      chalk.green(`${percentage}%`),
      chalk.gray(`[${progressBar}]`),
      message
    );
  }
};

// --- Enhanced Program Setup ---
const program = new Command();
program
  .name('ielts2go-chunker')
  .description(`${chalk.blue('IELTS2GO Video Chunker')} - Professional video splitting tool for educational content`)
  .version('2.1.0')
  .argument('<input-file>', 'Path to the source video file')
  .option('-d, --directory <dir>', 'Output directory for chunks', 'ielts2go_chunks')
  .option('-l, --length <seconds>', 'Duration of each chunk in seconds', '60')
  .option('-p, --prefix <prefix>', 'Prefix for output files', 'ielts2go_chunk')
  .option('-q, --quality <preset>', 'Video quality preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)', 'fast')
  .option('--hls', 'Generate HTTP Live Streaming (HLS) output')
  .option('--hls-segment <seconds>', 'HLS segment length in seconds', '4')
  .option('--hls-type <type>', 'HLS playlist type (vod, live)', 'vod')
  .option('--no-progress', 'Disable progress indicators')
  .addHelpText('after', `
${chalk.green('Examples:')}
  $ ielts2go-chunker video.mp4
  $ ielts2go-chunker video.mp4 -d output -l 120 -p lesson
  $ ielts2go-chunker video.mp4 --quality medium --prefix speaking_practice
  $ ielts2go-chunker video.mp4 --hls --hls-segment 6

${chalk.yellow('Output Modes:')}
  • Standard Mode: Creates individual video chunks
  • HLS Mode: Creates HTTP Live Streaming files (.m3u8 playlist and .ts segments) for web streaming

${chalk.yellow('Tips:')}
  • Use shorter chunks (30-60s) for better learning engagement
  • Higher quality presets take longer but produce better results
  • For HLS streaming, 4-6 second segments provide good balance of quality and latency
  • The HLS output includes an HTML player for easy viewing

${chalk.gray('Built with ❤️ by IELTS2GO - Empowering Your English Journey')}
`);

program.parse(process.argv);

const inputFile = program.args[0];
const options = program.opts();
const outputDir = options.directory;
const chunkLength = parseInt(options.length, 10);
const filePrefix = options.prefix;
const qualityPreset = options.quality;
const showProgress = options.progress;

/**
 * Validates input parameters and environment
 */
function validateInput() {
  if (!inputFile) {
    log.error('No input file specified. Use --help for usage information.');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    log.error(`Input file not found: "${inputFile}"`);
    log.info('Please check the file path and try again.');
    process.exit(1);
  }

  if (chunkLength <= 0) {
    log.error('Chunk length must be greater than 0 seconds.');
    process.exit(1);
  }

  const validPresets = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'];
  if (!validPresets.includes(qualityPreset)) {
    log.warning(`Invalid quality preset: "${qualityPreset}". Using "fast" instead.`);
  }
}

/**
 * Interactive setup for output format
 */
async function setupOutput() {
  log.divider();
  log.info('Setting up output configuration...');
  
  const questions = [
    {
      type: 'list',
      name: 'mode',
      message: 'Choose processing mode:',
      choices: [
        { name: 'Fast Mode (Stream Copy - Recommended)', value: 'copy' },
        { name: 'Re-encode Mode (Slower but consistent quality)', value: 'encode' },
        { name: 'HLS Streaming (HTTP Live Streaming)', value: 'hls' }
      ],
      default: 'copy'
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  if (answers.mode === 'encode') {
    const formatQuestion = await inquirer.prompt([
      {
        type: 'list',
        name: 'extension',
        message: 'Choose output video format:',
        choices: [
          { name: 'MP4 (Recommended - Universal compatibility)', value: 'mp4' },
          { name: 'MKV (High quality, larger file size)', value: 'mkv' },
          { name: 'AVI (Legacy compatibility)', value: 'avi' },
          { name: 'MOV (Apple/QuickTime)', value: 'mov' },
          { name: 'Custom format', value: 'custom' }
        ],
        default: 'mp4'
      }
    ]);
    
    if (formatQuestion.extension === 'custom') {
      const customFormat = await inquirer.prompt([
        {
          type: 'input',
          name: 'extension',
          message: 'Enter custom file extension (without dot):',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'Please enter a valid extension.';
            }
            return true;
          },
          filter: (input) => input.replace('.', '').toLowerCase().trim()
        }
      ]);
      return { mode: 'encode', extension: customFormat.extension };
    }
    
    return { mode: 'encode', extension: formatQuestion.extension };
  } else if (answers.mode === 'hls') {
    // HLS-specific settings
    const hlsSettings = await inquirer.prompt([
      {
        type: 'list',
        name: 'segmentLength',
        message: 'Choose HLS segment length:',
        choices: [
          { name: '2 seconds (Low latency)', value: 2 },
          { name: '4 seconds (Recommended)', value: 4 },
          { name: '6 seconds (Better quality)', value: 6 },
          { name: '10 seconds (Better quality, higher latency)', value: 10 }
        ],
        default: 4
      },
      {
        type: 'list',
        name: 'playlistType',
        message: 'Choose playlist type:',
        choices: [
          { name: 'VOD - Complete file (Recommended)', value: 'vod' },
          { name: 'Live - Continuous stream', value: 'live' }
        ],
        default: 'vod'
      }
    ]);
    
    log.info(`HLS Streaming mode selected - Output will be .m3u8 playlist with .ts segments`);
    return { 
      mode: 'hls', 
      extension: 'ts',
      segmentLength: hlsSettings.segmentLength,
      playlistType: hlsSettings.playlistType
    };
  }
  
  // For copy mode, detect the original format
  const originalExtension = path.extname(inputFile).slice(1).toLowerCase() || 'mp4';
  log.info(`Fast mode selected - keeping original format: ${originalExtension.toUpperCase()}`);
  
  return { mode: 'copy', extension: originalExtension }; 
}

/**
 * Gets video metadata using ffprobe
 */
function getVideoMetadata(inputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputFile, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const duration = metadata.format.duration;
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      
      resolve({
        duration,
        hasVideo: !!videoStream,
        hasAudio: !!audioStream,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'Unknown',
        bitrate: metadata.format.bit_rate
      });
    });
  });
}

/**
 * Creates output directory with proper structure
 */
function createOutputDirectory() {
  if (!fs.existsSync(outputDir)) {
    log.folder(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create metadata file
  const metadataPath = path.join(outputDir, 'ielts2go_metadata.json');
  const metadata = {
    tool: 'IELTS2GO Video Chunker',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    sourceFile: path.basename(inputFile),
    chunkLength: chunkLength,
    qualityPreset: qualityPreset,
    outputDirectory: outputDir
  };
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  log.success(`Metadata saved to: ${metadataPath}`);
}

/**
 * Processes video chunks with enhanced progress tracking
 */
async function processChunks(totalDuration, outputConfig, metadata) {
  const { mode, extension } = outputConfig;
  const startTime = Date.now();
  
  // Special handling for HLS mode
  if (mode === 'hls') {
    return await processHLSStream(totalDuration, outputConfig, metadata);
  }
  
  // Standard chunking process for non-HLS modes
  const numChunks = Math.ceil(totalDuration / chunkLength);
  
  log.divider();
  log.progress(`Starting chunking process:`);
  log.info(`• Total chunks: ${numChunks}`);
  log.info(`• Chunk duration: ~${chunkLength} seconds`);
  log.info(`• Output format: ${extension.toUpperCase()}`);
  log.info(`• Processing mode: ${mode === 'copy' ? 'Fast (Stream Copy)' : 'Re-encode'}`);
  if (mode === 'encode') {
    log.info(`• Quality preset: ${qualityPreset}`);
  }
  log.info(`• Video resolution: ${metadata.resolution}`);
  log.divider();
  
  for (let i = 0; i < numChunks; i++) {
    const chunkStartTime = i * chunkLength;
    const outputFilename = `${filePrefix}_${String(i + 1).padStart(3, '0')}.${extension}`;
    const outputPath = path.join(outputDir, outputFilename);

    await new Promise((resolve, reject) => {
      if (showProgress) {
        log.step(i + 1, numChunks, `Processing ${outputFilename}...`);
      }
      
      const command = ffmpeg(inputFile)
        .seekInput(chunkStartTime)
        .duration(chunkLength);

      if (mode === 'copy') {
        // Fast mode - copy streams without re-encoding
        command.outputOptions([
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero'
        ]);
      } else {
        // Re-encode mode - full quality control
        command.outputOptions([
          '-c:v libx264',
          '-preset', qualityPreset,
          '-c:a aac',
          '-movflags', '+faststart',
          '-avoid_negative_ts', 'make_zero'
        ]);
      }
      
      command.output(outputPath);

      command
        .on('end', () => {
          if (showProgress) {
            log.success(`Completed: ${outputFilename}`);
          }
          resolve();
        })
        .on('error', (err) => {
          log.error(`Failed to process chunk ${i + 1}: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);
  
  log.divider();
  log.success(`🎉 Processing complete!`);
  log.info(`• Total processing time: ${totalTime} seconds`);
  log.info(`• Average time per chunk: ${(totalTime / numChunks).toFixed(2)} seconds`);
  log.info(`• Speed: ${mode === 'copy' ? '⚡ Ultra Fast' : '🔄 High Quality'}`);
  log.info(`• Output location: ${path.resolve(outputDir)}`);
  log.divider();
}

/**
 * Process video into HLS stream format
 */
async function processHLSStream(totalDuration, outputConfig, metadata) {
  const { segmentLength, playlistType } = outputConfig;
  
  // Create HLS-specific directory structure
  const hlsDir = path.join(outputDir, 'hls');
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }
  
  // Setup paths for playlist and segments
  const playlistPath = path.join(hlsDir, `${filePrefix}.m3u8`);
  const segmentPattern = path.join(hlsDir, `${filePrefix}_%03d.ts`);
  
  log.divider();
  log.progress(`Starting HLS streaming process:`);
  log.info(`• Total duration: ${Math.floor(totalDuration)} seconds (${(totalDuration / 60).toFixed(1)} minutes)`);
  log.info(`• Segment length: ${segmentLength} seconds`);
  log.info(`• Playlist type: ${playlistType.toUpperCase()}`);
  log.info(`• Video resolution: ${metadata.resolution}`);
  log.info(`• Output: ${playlistPath}`);
  log.divider();
  
  return new Promise((resolve, reject) => {
    try {
      log.info('Setting up HLS conversion with optimized parameters...');
      
      const command = ffmpeg(inputFile);
      
      // Use the proven working parameters (previously fallback method)
      const hlsOptions = [
        '-c:v', 'libx264',      // Video codec
        '-preset', 'ultrafast', // Fastest preset for encoding
        '-tune', 'fastdecode',  // Optimize for fast decoding
        '-c:a', 'aac',          // Audio codec
        '-b:a', '96k',          // Lower audio bitrate for speed
        '-ac', '2',             // Stereo audio
        '-ar', '44100',         // Standard audio sample rate
        '-hls_time', segmentLength,
        '-hls_segment_filename', segmentPattern,
        '-threads', 'auto',      // Use all available CPU threads
        '-f', 'hls'             // Format is HLS
      ];
      
      // Add any playlist type if specified
      if (playlistType && playlistType !== 'none') {
        hlsOptions.push('-hls_playlist_type', playlistType);
      }
      
      command.outputOptions(hlsOptions);
      command.output(playlistPath);
      
      if (showProgress) {
        // Show progress during encoding
        command.on('progress', (progress) => {
          if (progress.percent) {
            const percent = Math.round(progress.percent);
            const progressBar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
            process.stdout.write(`\r${chalk.blue('[HLS]')} ${chalk.green(`${percent}%`)} ${chalk.gray(`[${progressBar}]`)} Processing...`);
          }
        });
      }
      
      command
        .on('start', (commandLine) => {
          log.info('FFmpeg command: ' + commandLine);
        })
        .on('end', () => {
          if (showProgress) {
            console.log(); // New line after progress
          }
          log.success(`HLS stream created successfully`);
          
          // After successful creation, create the master playlist and HTML player
          createMasterPlaylist(hlsDir, metadata);
          
          resolve();
        })
        .on('error', (err) => {
          log.error(`HLS conversion failed: ${err.message}`);
          log.warning('Trying with even more basic parameters...');
          
          // Try with absolute minimal parameters as last resort
          tryLastResortHLSConversion(inputFile, playlistPath, segmentPattern)
            .then(resolve)
            .catch(reject);
        })
        .run();
    } catch (error) {
      log.error(`Error setting up HLS conversion: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Last resort HLS conversion with absolute minimal parameters
 */
async function tryLastResortHLSConversion(inputFile, playlistPath, segmentPattern) {
  return new Promise((resolve, reject) => {
    log.info('Attempting last resort HLS conversion with absolute minimal parameters...');
    
    const command = ffmpeg(inputFile);
    
    // Absolute minimal HLS options - maximum compatibility
    command.outputOptions([
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-c:a', 'aac',
      '-hls_time', 4,
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls'
    ]);
    
    command.output(playlistPath);
    
    command
      .on('end', () => {
        log.success(`HLS stream created successfully with minimal parameters`);
        createMasterPlaylist(path.dirname(playlistPath), {});
        resolve();
      })
      .on('error', (err) => {
        log.error(`Last resort HLS conversion failed: ${err.message}`);
        log.warning('Please ensure FFmpeg is properly installed with libx264 and HLS support');
        reject(err);
      })
      .run();
  });
}

/**
 * Creates a master playlist for HLS
 */
function createMasterPlaylist(hlsDir, metadata) {
  const masterPlaylistPath = path.join(outputDir, `${filePrefix}_master.m3u8`);
  
  // Simple master playlist pointing to the variant
  const masterPlaylistContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=${metadata.resolution || '1280x720'}
hls/${filePrefix}.m3u8
`;
  
  fs.writeFileSync(masterPlaylistPath, masterPlaylistContent);
  log.success(`Master playlist created: ${masterPlaylistPath}`);
  
  // Create the HTML player
  createHLSPlayer(masterPlaylistPath, metadata);
}

/**
 * Creates a simple HTML player for HLS content
 */
function createHLSPlayer(playlistPath, metadata) {
  const playerPath = path.join(outputDir, 'player.html');
  
  // Important: For local file playback, we need to use the file name only
  // and place the player in the same directory as the master playlist
  const playlistFilename = path.basename(playlistPath);
  
  const playerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS2GO HLS Player</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      text-align: center;
    }
    .player-container {
      width: 100%;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin: 20px 0;
    }
    video {
      width: 100%;
      display: block;
    }
    .info {
      padding: 15px;
      background: #ecf0f1;
      border-radius: 0 0 8px 8px;
    }
    .info p {
      margin: 5px 0;
    }
    .note {
      background-color: #fef9e7;
      border-left: 4px solid #f1c40f;
      padding: 10px 15px;
      margin: 20px 0;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 14px;
      color: #7f8c8d;
    }
    .error-message {
      color: #e74c3c;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      display: none;
    }
    .instructions {
      margin-top: 20px;
      padding: 15px;
      background: #e8f4f8;
      border-radius: 8px;
      font-size: 14px;
    }
    .instructions h3 {
      margin-top: 0;
      color: #2980b9;
    }
    .instructions ol {
      padding-left: 20px;
    }
    .instructions li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <h1>IELTS2GO HLS Player</h1>
  
  <div class="note">
    <p><strong>Note:</strong> Due to browser security restrictions, this player may not work when opened directly from your file system. 
    For best results, serve this folder using a local web server.</p>
  </div>
  
  <div class="player-container">
    <video id="video" controls></video>
    <div id="error-message" class="error-message">Error loading video. Please check browser console for details.</div>
    <div class="info">
      <p><strong>Source:</strong> ${path.basename(inputFile)}</p>
      <p><strong>Resolution:</strong> ${metadata.resolution || 'Unknown'}</p>
      <p><strong>Duration:</strong> ${Math.floor(metadata.duration || 0)} seconds (${((metadata.duration || 0) / 60).toFixed(1)} minutes)</p>
    </div>
  </div>
  
  <div class="instructions">
    <h3>How to Play This Video</h3>
    <ol>
      <li>Option 1: Use a local web server like <code>http-server</code> or <code>live-server</code> to serve this directory.</li>
      <li>Option 2: Upload these files to a web server that supports HLS streaming.</li>
      <li>Option 3: Use VLC Media Player to open the <code>${playlistFilename}</code> file directly.</li>
    </ol>
    <p>To install a simple web server, run: <code>npm install -g http-server</code> and then <code>http-server .</code> in this directory.</p>
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const video = document.getElementById('video');
      const errorMessage = document.getElementById('error-message');
      
      // Check if we're running from a web server or file system
      const isWebServer = window.location.protocol !== 'file:';
      
      if (!isWebServer) {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'For security reasons, HLS playback requires a web server. Please see instructions below.';
        return;
      }
      
      // Load HLS.js dynamically to avoid CORS issues with local files
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12';
      script.onload = function() {
        initializePlayer();
      };
      script.onerror = function() {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Failed to load HLS.js library. Please check your internet connection.';
      };
      document.head.appendChild(script);
      
      function initializePlayer() {
        const videoSrc = '${playlistFilename}';
        console.log('Attempting to load HLS stream:', videoSrc);
        
        if (Hls.isSupported()) {
          const hls = new Hls({
            debug: true
          });
          
          hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS error:', data);
            if (data.fatal) {
              errorMessage.style.display = 'block';
              errorMessage.textContent = 'Error: ' + data.type + ' - ' + data.details;
            }
          });
          
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest parsed successfully');
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          console.log('Using native HLS support');
          video.src = videoSrc;
          video.addEventListener('error', function(e) {
            console.error('Video error:', video.error);
            errorMessage.style.display = 'block';
          });
        } else {
          errorMessage.style.display = 'block';
          errorMessage.textContent = 'HLS is not supported in this browser';
          console.error('HLS is not supported in this browser');
        }
      }
    });
  </script>
  
  <div class="footer">
    <p>Created with IELTS2GO Video Chunker - Empowering Your English Journey</p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(playerPath, playerHtml);
  log.success(`HTML player created: ${playerPath}`);
  log.info(`Open this file in a web browser to play the HLS stream`);
  
  // Create a simple README file with instructions in the output directory
  const readmePath = path.join(outputDir, 'PLAYBACK.md');
  const readmeContent = `# HLS Playback Instructions

This folder contains HLS (HTTP Live Streaming) files generated by IELTS2GO Video Chunker.

## Files
- \`${playlistFilename}\`: Master playlist file
- \`hls/${filePrefix}.m3u8\`: Variant playlist file
- \`hls/${filePrefix}_*.ts\`: Video segments
- \`player.html\`: Web player for HLS content

## How to Play

### Option 1: Using a Web Server (Recommended)
1. Install a simple web server: \`npm install -g http-server\`
2. Navigate to this directory in your terminal
3. Run: \`http-server .\`
4. Open the provided URL in your browser
5. Click on \`player.html\`

### Option 2: Using VLC Media Player
1. Open VLC Media Player
2. Go to Media > Open File
3. Select the \`${playlistFilename}\` file
4. VLC will handle the HLS streaming

### Option 3: Using a Full Web Server
If you have access to a web server, upload all files maintaining the directory structure and access the player.html file through your domain.

## Troubleshooting
- If the player shows errors, check your browser's console for details
- Ensure you're using a modern browser with HLS support
- For local playback, a web server is required due to browser security restrictions

Created with IELTS2GO Video Chunker - Empowering Your English Journey
`;
  
  fs.writeFileSync(readmePath, readmeContent);
  log.info(`Playback instructions created: ${readmePath}`);
}

/**
 * Main execution function
 */
async function run() {
  try {
    // Display branding
    log.brand();
    
    // Validate input
    validateInput();
    
    // Check for CLI HLS mode
    let outputConfig;
    if (options.hls) {
      // Direct HLS mode from command line
      log.info('HLS mode selected via command line options');
      outputConfig = {
        mode: 'hls',
        extension: 'ts',
        segmentLength: parseInt(options.hlsSegment, 10) || 4,
        playlistType: options.hlsType || 'vod'
      };
    } else {
      // Interactive setup
      outputConfig = await setupOutput();
    }
    
    // Get video metadata
    log.info('Analyzing video file...');
    const metadata = await getVideoMetadata(inputFile);
    
    if (!metadata.duration) {
      log.error('Could not determine video duration. Please check if the file is a valid video.');
      process.exit(1);
    }
    
    log.success(`Video analysis complete:`);
    log.info(`• Duration: ${Math.floor(metadata.duration)} seconds (${(metadata.duration / 60).toFixed(1)} minutes)`);
    log.info(`• Resolution: ${metadata.resolution}`);
    log.info(`• Video codec: ${metadata.videoCodec || 'Unknown'}`);
    log.info(`• Audio codec: ${metadata.audioCodec || 'Unknown'}`);
    
    // Create output directory
    createOutputDirectory();
    
    // Process chunks
    await processChunks(metadata.duration, outputConfig, metadata);
    
    // Final success message
    console.log(chalk.green(`
🎓 Thank you for using IELTS2GO Video Chunker!
   Your educational content is now ready for optimal learning experiences.
   
   ${chalk.gray('Visit us at:')} ${chalk.blue('https://ielts2go.com')}
   ${chalk.gray('Support:')} ${chalk.blue('support@ielts2go.com')}
`));
    
  } catch (error) {
    log.error('An unexpected error occurred:');
    console.error(error.message);
    
    if (error.message.includes('ffmpeg') || error.message.includes('ffprobe')) {
      log.warning('Please ensure FFmpeg is installed and accessible in your system PATH.');
      log.info('Installation guide: https://ffmpeg.org/download.html');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Thanks for using Chunkify by IELTS2GO Developed by Adons Tech'));
  process.exit(0);
});

// Start the application
run();