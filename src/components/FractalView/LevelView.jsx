import React from 'react';
import { motion, AnimatePresence } from 'react-motion';

const LevelView = ({ content, type, isActive, onClick, depth }) => {
  const getBackgroundColor = () => {
    if (isActive) {
      return 'bg-white';
    }
    return depth === -1 ? 'bg-gray-100' : 'bg-gray-50';
  };

  const getTextStyle = () => {
    if (isActive) {
      return 'text-gray-900';
    }
    return depth === -1 ? 'text-gray-600' : 'text-gray-500';
  };

  return (
    <div
      className={`
        w-full rounded-lg p-4 transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isActive ? 'shadow-lg' : 'shadow-sm'}
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${depth === 0 ? 'scale-100' : depth === -1 ? 'scale-95' : 'scale-90'}
      `}
      onClick={onClick}
      style={{
        opacity: isActive ? 1 : 0.7,
        transform: `translateY(${depth * 20}px)`
      }}
    >
      {content.title && (
        <h3 className={`text-lg font-medium mb-2 ${getTextStyle()}`}>
          {content.title}
        </h3>
      )}

      <div className={`prose max-w-none ${getTextStyle()}`}>
        {isActive ? (
          <div className="relative">
            {content.summary || content.content}
          </div>
        ) : (
          <div className="line-clamp-2">
            {content.summary || content.content}
          </div>
        )}
      </div>

      {isActive && content.metadata && (
        <div className="mt-4 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <span>Reading time: {content.metadata.readingTime} min</span>
            <span>{type}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const LevelViewTransition = ({ level, isVisible, ...props }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <LevelView {...props} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { LevelView, LevelViewTransition };