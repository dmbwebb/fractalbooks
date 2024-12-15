// Navigation.js

import React from 'react';
import { ChevronRight, Book, FileText, Text } from 'lucide-react';

const Navigation = ({ currentPath, structure, onNavigate }) => {
  // Determine current level type
  // 0 = book, 1 = chapter, 2 = paragraph
  const level = currentPath.length;

  const getCurrentLevelType = () => {
    if (level === 0) return 'book';
    if (level === 1) return 'chapter';
    return 'paragraph';
  };

  const getLevelIcon = (type) => {
    const icons = {
      book: <Book className="w-4 h-4" />,
      chapter: <FileText className="w-4 h-4" />,
      paragraph: <Text className="w-4 h-4" />
    };
    return icons[type];
  };

  // Build breadcrumbs:
  // Book (always)
  // If chapter chosen: add chapter
  // If paragraph chosen: add paragraph
  const breadcrumbs = [
    {
      type: 'book',
      title: structure.title || 'Book',
      path: []
    }
  ];

  if (level >= 1) {
    const chapterIndex = currentPath[0];
    const chapter = structure.levels.chapters[chapterIndex];
    breadcrumbs.push({
      type: 'chapter',
      title: chapter.title,
      path: [chapterIndex]
    });
  }

  if (level === 2) {
    const paragraphIndex = currentPath[1];
    breadcrumbs.push({
      type: 'paragraph',
      title: `Paragraph ${paragraphIndex + 1}`,
      path: [currentPath[0], paragraphIndex]
    });
  }

  return (
    <div className="w-full bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <button
                onClick={() => onNavigate(item.path)}
                className={`flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors
                  ${currentPath.length === item.path.length ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                {getLevelIcon(item.type)}
                <span className="truncate max-w-[150px]">{item.title}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            {getLevelIcon(getCurrentLevelType())}
            <span>Current Level: {getCurrentLevelType()}</span>
          </div>
        </div>
      </div>

      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${(level / 2) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default Navigation;
