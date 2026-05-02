/**
 * SecretDisplay - Shows secret/trap icons on the battlefield
 * [P3-1] Displays "?" icons for active secrets
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Secret } from '../../types';

interface SecretDisplayProps {
  secrets: Secret[];
  isPlayer: boolean;
  isMobile: boolean;
}

export const SecretDisplay: React.FC<SecretDisplayProps> = ({ secrets, isPlayer, isMobile }) => {
  if (secrets.length === 0) return null;

  return (
    <div className={`flex gap-1 ${isPlayer ? 'justify-center' : 'justify-center'}`}>
      <AnimatePresence>
        {secrets.map((secret, i) => (
          <motion.div
            key={secret.id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`
              ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}
              bg-gradient-to-br from-purple-900/90 to-indigo-900/90
              border-2 border-purple-500/50 rounded-lg
              flex items-center justify-center
              shadow-[0_0_10px_rgba(168,85,247,0.4)]
              cursor-default select-none
            `}
            title={isPlayer ? `秘密: ${secret.id}` : '对手的秘密'}
          >
            <motion.span
              className={`${isMobile ? 'text-base' : 'text-xl'} font-black text-purple-300`}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ?
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(SecretDisplay);
