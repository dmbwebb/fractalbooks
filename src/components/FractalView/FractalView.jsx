import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const FractalView = ({ bookStructure }) => {
  const [currentLevel, setCurrentLevel] = useState('book');
  const [currentPath, setCurrentPath] = useState([]);
  const [animationDirection, setAnimationDirection] = useState(null);

  const getContentForPath = (path) => {
    let current = bookStructure;
    for (const index of path) {
      current = current.levels[current.type][index];
    }
    return current;
  };

  const getCurrentLevelContent = () => {
    const content = getContentForPath(currentPath);
    return {
      above: content.parent ? getContentForPath(currentPath.slice(0, -1)) : null,
      current: content,
      below: content.children?.length > 0 ? content.children : null
    };
  };

  const handleLevelClick = (direction, index = null) => {
    setAnimationDirection(direction);

    if (direction === 'up') {
      setCurrentPath(currentPath.slice(0, -1));
    } else {
      setCurrentPath([...currentPath, index]);
    }

    // Reset animation after transition
    setTimeout(() => setAnimationDirection(null), 300);
  };

  const levelContent = getCurrentLevelContent();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 relative min-h-screen">
      {/* Above Level (Grayed out) */}
      {levelContent.above && (
        <div
          className="cursor-pointer mb-8 opacity-50 hover:opacity-70 transition-opacity"
          onClick={() => handleLevelClick('up')}
        >
          <div className="flex items-center justify-center mb-2">
            <ChevronUp className="w-6 h-6" />
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 line-clamp-2">
              {levelContent.above.summary}
            </p>
          </div>
        </div>
      )}

      {/* Current Level */}
      <div className={`transform transition-all duration-300 ${
        animationDirection === 'up' ? 'translate-y-4 opacity-0' :
        animationDirection === 'down' ? '-translate-y-4 opacity-0' :
        'translate-y-0 opacity-100'
      }`}>
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            {levelContent.current.title || 'Summary'}
          </h2>
          <p className="text-gray-800 leading-relaxed">
            {levelContent.current.summary || levelContent.current.content}
          </p>
        </div>
      </div>

      {/* Below Level (Grayed out) */}
      {levelContent.below && (
        <div className="mt-8 grid gap-4">
          {levelContent.below.map((item, index) => (
            <div
              key={index}
              className="cursor-pointer opacity-50 hover:opacity-70 transition-opacity"
              onClick={() => handleLevelClick('down', index)}
            >
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.summary || item.content.substring(0, 150) + '...'}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center mt-2">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Navigation Breadcrumbs */}
      <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
        {['Book', ...currentPath.map((_, i) =>
          bookStructure.levels[currentPath.slice(0, i + 1).join('.')].type
        )].map((level, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span>→</span>}
            <span>{level}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Mini-map component to show structure overview
const StructureMinimap = ({ structure, currentPath }) => {
  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-48 bg-white rounded-lg shadow-lg p-4">
      <div className="text-xs text-gray-500 mb-2">Document Structure</div>
      <div className="space-y-1">
        {structure.levels.map((level, i) => (
          <div
            key={i}
            className={`h-1 rounded ${
              currentPath.includes(i) ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FractalView;