export function getFileTypeFromMimeType(mimeType: string): string {
    switch (mimeType) {
        // Documents
        case 'application/pdf':
        return 'PDF';
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word';
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return 'Excel';
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'PowerPoint';
        case 'text/plain':
        return 'Text';
        case 'application/rtf':
        return 'RTF';

        // Images
        case 'image/jpeg':
        case 'image/jpg':
        return 'JPEG';
        case 'image/png':
        return 'PNG';
        case 'image/gif':
        return 'GIF';
        case 'image/webp':
        return 'WebP';
        case 'image/svg+xml':
        return 'SVG';

        // Audio
        case 'audio/mpeg':
        case 'audio/mp3':
        return 'MP3';
        case 'audio/wav':
        return 'WAV';
        case 'audio/ogg':
        return 'OGG';

        // Video
        case 'video/mp4':
        return 'MP4';
        case 'video/webm':
        return 'WebM';
        case 'video/ogg':
        return 'OGV';

        // Archives
        case 'application/zip':
        return 'ZIP';
        case 'application/x-rar-compressed':
        return 'RAR';
        case 'application/x-7z-compressed':
        return '7Z';

        default:
        return 'Unknown';
    }
    }