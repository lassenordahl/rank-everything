import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share } from 'lucide-react';
import type { Room } from '@rank-everything/shared-types';
import { transitions, colors } from '../lib/design-tokens';
import { PlayerAvatar, RankingList } from './ui';
import SharePreviewModal from './SharePreviewModal';

import { useFeatureFlag } from '../contexts/FeatureFlagContext';

interface RevealScreenProps {
  room: Room;
  playerId: string;
  isHost: boolean;
  sendMessage: (message: string) => void;
}

export default function RevealScreen({ room, playerId, isHost, sendMessage }: RevealScreenProps) {
  const navigate = useNavigate();
  const showShare = useFeatureFlag('share_results');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [shareDataUrl, setShareDataUrl] = useState<string | null>(null);

  const rankingRef = useRef<HTMLDivElement>(null);

  const players = room.players;
  const currentPlayer = players[currentPlayerIndex];

  // Guard against undefined player (shouldn't happen but TypeScript requires check)
  if (!currentPlayer) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-muted">No players found</p>
      </div>
    );
  }

  const isMyList = currentPlayer.id === playerId;

  // Generate static background for share image using canvas
  const generateBackground = useCallback((width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Fill with base neutral color
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Draw gradient orbs with blur effect
    const drawOrb = (x: number, y: number, radius: number, color: string, opacity: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.globalAlpha = opacity;
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1;
    };

    // Red orb - top left (stronger opacity for vibrant colors)
    drawOrb(width * 0.1, height * 0.1, width * 0.7, colors.red.DEFAULT, 0.55);
    // Blue orb - bottom right
    drawOrb(width * 0.9, height * 0.9, width * 0.6, colors.blue.DEFAULT, 0.55);
    // Yellow orb - center
    drawOrb(width * 0.5, height * 0.5, width * 0.5, colors.yellow.DEFAULT, 0.5);

    return canvas;
  }, []);

  // Handle share image generation
  const handleShare = async () => {
    if (!rankingRef.current) return;

    // Show modal immediately with loading state
    setIsShareModalOpen(true);
    setShareBlob(null);
    setShareDataUrl(null);

    try {
      const html2canvas = (await import('html2canvas')).default;

      // Small delay to ensure render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Screenshot the VISIBLE RankingList (not a hidden copy)
      const rankingCanvas = await html2canvas(rankingRef.current, {
        backgroundColor: '#ffffff', // White background to ensure clean card
        scale: 2, // High quality
        useCORS: true,
        logging: false,
      });

      // Image dimensions
      const imgWidth = 800;
      const imgHeight = 1000; // 4:5 aspect ratio
      const padding = 60;

      // Create composite canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = imgWidth;
      finalCanvas.height = imgHeight;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      // Layer 1: Gradient background
      const bgCanvas = generateBackground(imgWidth, imgHeight);
      ctx.drawImage(bgCanvas, 0, 0);

      // Layer 2: Title text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 56px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rank Everything', imgWidth / 2, 90);

      // Layer 3: RankingList screenshot (centered and properly scaled)
      // Calculate dimensions to fit nicely within the canvas
      const maxCardWidth = imgWidth - padding * 2;
      const maxCardHeight = imgHeight - 200 - 80; // Account for title (120px) and footer (80px)

      // Scale to fit while maintaining aspect ratio
      const cardAspectRatio = rankingCanvas.width / rankingCanvas.height;
      let cardWidth = maxCardWidth;
      let cardHeight = cardWidth / cardAspectRatio;

      // If too tall, scale by height instead
      if (cardHeight > maxCardHeight) {
        cardHeight = maxCardHeight;
        cardWidth = cardHeight * cardAspectRatio;
      }

      const cardX = (imgWidth - cardWidth) / 2;
      const cardY = 130;

      // Draw shadow FIRST (offset to bottom-right)
      ctx.fillStyle = '#000000';
      ctx.fillRect(cardX + 8, cardY + 8, cardWidth, cardHeight);

      // Draw the ranking list screenshot on top
      ctx.drawImage(rankingCanvas, cardX, cardY, cardWidth, cardHeight);

      // Draw border around the card
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      // Get Data URL for preview
      const dataUrl = finalCanvas.toDataURL('image/png');
      setShareDataUrl(dataUrl);

      // Get Blob for sharing
      finalCanvas.toBlob((blob) => {
        if (blob) {
          setShareBlob(blob);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      alert('Failed to generate share image. Please try again.');
      setIsShareModalOpen(false);
    }
  };

  // Handle direct download
  const handleDownload = async () => {
    if (!rankingRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;

      await new Promise((resolve) => setTimeout(resolve, 100));

      const rankingCanvas = await html2canvas(rankingRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgWidth = 800;
      const imgHeight = 1000;
      const padding = 60;

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = imgWidth;
      finalCanvas.height = imgHeight;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      const bgCanvas = generateBackground(imgWidth, imgHeight);
      ctx.drawImage(bgCanvas, 0, 0);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 56px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rank Everything', imgWidth / 2, 90);

      const maxCardWidth = imgWidth - padding * 2;
      const maxCardHeight = imgHeight - 200 - 80;

      const cardAspectRatio = rankingCanvas.width / rankingCanvas.height;
      let cardWidth = maxCardWidth;
      let cardHeight = cardWidth / cardAspectRatio;

      if (cardHeight > maxCardHeight) {
        cardHeight = maxCardHeight;
        cardWidth = cardHeight * cardAspectRatio;
      }

      const cardX = (imgWidth - cardWidth) / 2;
      const cardY = 130;

      ctx.fillStyle = '#000000';
      ctx.fillRect(cardX + 8, cardY + 8, cardWidth, cardHeight);
      ctx.drawImage(rankingCanvas, cardX, cardY, cardWidth, cardHeight);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      const dataUrl = finalCanvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'rank-everything-results.png';
      link.click();
    } catch (error) {
      console.error('Error generating download image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  // Navigation between players
  const goToPrevPlayer = () => {
    setCurrentPlayerIndex((prev) => (prev - 1 + players.length) % players.length);
  };

  const goToNextPlayer = () => {
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const handlePlayAgain = () => {
    if (isHost) {
      // Host sends reset_room event to reset room for all players
      sendMessage(JSON.stringify({ type: 'reset_room' }));
    } else {
      // Non-host just navigates back to lobby
      navigate(`/${room.id}`);
    }
  };

  const handleExit = () => {
    localStorage.removeItem('playerId');
    localStorage.removeItem('roomCode');
    navigate('/');
  };

  return (
    <>
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 gap-6 w-full max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.default}
          className="text-center"
        >
          <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
          <p className="text-black/70 font-medium">Room {room.id}</p>
        </motion.div>

        {/* Player Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-4 w-full"
        >
          <motion.button
            onClick={goToPrevPlayer}
            disabled={players.length <= 1}
            className="btn-secondary p-2 w-12 h-12 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={players.length > 1 ? { scale: 1.1 } : {}}
            whileTap={players.length > 1 ? { scale: 0.9 } : {}}
            layout
          >
            ←
          </motion.button>

          <div className="text-center flex flex-col items-center gap-1 min-w-[160px]">
            <div className="flex items-center gap-3">
              <PlayerAvatar
                name={currentPlayer.nickname}
                colorIndex={currentPlayerIndex}
                size="md"
              />
              <p className="text-xl font-bold">
                {currentPlayer.nickname}
                {isMyList && <span className="text-muted text-sm ml-2">(you)</span>}
              </p>
            </div>
            <p className="text-xs text-black/70 font-mono tracking-wider font-semibold">
              {currentPlayerIndex + 1} OF {players.length}
            </p>
          </div>

          <motion.button
            onClick={goToNextPlayer}
            disabled={players.length <= 1}
            className="btn-secondary p-2 w-12 h-12 flex items-center justify-center font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={players.length > 1 ? { scale: 1.1 } : {}}
            whileTap={players.length > 1 ? { scale: 0.9 } : {}}
            layout
          >
            →
          </motion.button>
        </motion.div>

        {/* Rankings List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPlayer.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={transitions.default}
            className="w-full flex justify-center"
          >
            {/* Display version - fits in UI */}
            <div ref={rankingRef} className="w-full max-w-sm">
              <RankingList
                rankings={currentPlayer.rankings}
                items={room.items || []}
                itemsPerGame={room.config.itemsPerGame}
                showHeader={true}
                headerTitle={`${currentPlayer.nickname}'s Rankings`}
                animate={true}
                compareToRankings={
                  isMyList ? undefined : room.players.find((p) => p.id === playerId)?.rankings
                }
              />

              <div className="text-center mt-4">
                <p className="text-xs text-black/70 font-mono uppercase font-medium">
                  {window.location.host}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-3 w-full"
        >
          {/* Share and Download row */}
          {showShare && (
            <div className="flex gap-3 w-full">
              <motion.button
                onClick={handleShare}
                className="btn-primary flex-1 inset-shadow flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Share size={20} />
                <span>Share Rankings</span>
              </motion.button>
              <motion.button
                onClick={handleDownload}
                className="btn-secondary px-4 flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download"
              >
                <Download size={20} />
              </motion.button>
            </div>
          )}

          {/* Exit and Play Again row */}
          <div className="flex gap-3 w-full">
            <motion.button
              onClick={handleExit}
              className="btn-secondary flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Exit
            </motion.button>
            <motion.button
              onClick={handlePlayAgain}
              className="btn-primary flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Play Again
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Share Preview Modal */}
      <SharePreviewModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        imageBlob={shareBlob}
        imageDataUrl={shareDataUrl}
      />
    </>
  );
}
