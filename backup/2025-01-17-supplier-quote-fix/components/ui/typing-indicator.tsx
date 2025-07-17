'use client';

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -10 },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <motion.div
      className="flex items-center gap-1 p-2"
      variants={containerVariants}
      animate="animate"
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="w-2 h-2 bg-gray-400 rounded-full"
          variants={dotVariants}
          animate="animate"
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}