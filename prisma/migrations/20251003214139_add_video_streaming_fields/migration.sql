-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "height" INTEGER,
ADD COLUMN     "hls_playlist_path" TEXT,
ADD COLUMN     "thumbnail_path" TEXT,
ADD COLUMN     "width" INTEGER;
