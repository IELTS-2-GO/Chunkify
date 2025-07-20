# IELTS2GO Video Chunker

![IELTS2GO Logo](https://ielts2go.com/assets/images/logo.png)

A powerful CLI tool for splitting video files into smaller chunks and generating HLS streams for educational content.

## Features

- **Video Chunking**: Split large videos into smaller, manageable chunks
- **Multiple Processing Modes**:
  - Fast Mode (Stream Copy): Quick chunking without re-encoding
  - Re-encode Mode: Full re-encoding for consistent quality
  - HLS Streaming: Generate HTTP Live Streaming files for web playback
- **Customizable Options**: Control chunk length, output format, quality, and more
- **Interactive Setup**: Guided prompts for easy configuration
- **Detailed Progress**: Real-time progress tracking and statistics

## Prerequisites

Before installing IELTS2GO Video Chunker, ensure you have the following:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [FFmpeg](https://ffmpeg.org/download.html) installed and accessible in your system PATH

## Installation

### Global Installation

To install IELTS2GO Video Chunker globally on your PC, run:

```bash
npm install -g ielts2go-chunker
```

After installation, you can use the `chunker` command from anywhere in your terminal:

```bash
chunker video.mp4
```

### Local Installation

If you prefer not to install globally:

1. Clone the repository:
   ```bash
   git clone https://github.com/ielts2go/chunker.git
   cd chunker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run using Node.js:
   ```bash
   node chunker.js video.mp4
   ```

## Usage

### Basic Usage

```bash
chunker <input-file> [options]
```

### Interactive Mode

Running the command with just an input file will start the interactive setup:

```bash
chunker video.mp4
```

This will guide you through selecting:
- Processing mode (Fast/Re-encode/HLS)
- Output directory
- Chunk length
- File prefix
- Quality settings

### Command Line Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Display help information |
| `-V, --version` | Display version number |
| `-d, --output <dir>` | Output directory (default: "ielts2go_chunks") |
| `-l, --length <seconds>` | Chunk length in seconds (default: 60) |
| `-p, --prefix <name>` | Output filename prefix (default: "ielts2go_chunk") |
| `-q, --quality <preset>` | FFmpeg quality preset (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow) |
| `-f, --fast` | Use fast mode (stream copy without re-encoding) |
| `-e, --encode` | Use re-encode mode |
| `--hls` | Generate HLS streaming files (.m3u8 and .ts) |
| `--hls-segment <seconds>` | HLS segment length in seconds (default: 4) |
| `--hls-type <type>` | HLS playlist type (vod or live) |
| `--silent` | Disable progress output |

### Examples

#### Basic Chunking with Default Settings
```bash
chunker video.mp4
```

#### Specify Output Directory and Chunk Length
```bash
chunker video.mp4 -d my_chunks -l 120
```

#### Fast Mode with Custom Prefix
```bash
chunker video.mp4 -f -p lesson_part
```

#### Re-encode with High Quality
```bash
chunker video.mp4 -e -q veryslow
```

#### Generate HLS Streaming Files
```bash
chunker video.mp4 --hls
```

#### Advanced HLS Configuration
```bash
chunker video.mp4 --hls --hls-segment 10 --hls-type vod -d streaming
```

## HLS Streaming

The HLS mode generates files for HTTP Live Streaming:

- `.m3u8` playlist files
- `.ts` segment files
- A simple HTML player for easy playback

### HLS Output Structure

```
output_directory/
├── ielts2go_chunk_master.m3u8    # Master playlist
├── player.html                   # HTML player
├── ielts2go_metadata.json        # Metadata
└── hls/
    ├── ielts2go_chunk.m3u8       # Variant playlist
    ├── ielts2go_chunk_000.ts     # Video segments
    ├── ielts2go_chunk_001.ts
    └── ...
```

### HLS Options

| Option | Description |
|--------|-------------|
| `--hls` | Enable HLS mode |
| `--hls-segment <seconds>` | Segment length (2, 4, 6, or 10 seconds) |
| `--hls-type <type>` | Playlist type (vod or live) |

## Troubleshooting

### FFmpeg Not Found
Ensure FFmpeg is installed and in your system PATH. Installation guides:
- Windows: https://www.wikihow.com/Install-FFmpeg-on-Windows
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg` or equivalent

### HLS Conversion Issues
If you encounter issues with HLS conversion:
1. Try using a longer segment length: `--hls-segment 10`
2. Ensure your FFmpeg installation includes libx264 and HLS support
3. Check if your input video format is compatible

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, contact:
- Email: support@ielts2go.com
- Website: https://ielts2go.com
