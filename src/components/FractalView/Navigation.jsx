import React from 'react';
import { ChevronRight, Book, FileText, Layers, Text } from 'lucide-react';  // Changed Paragraph to Text

const Navigation = ({ currentPath, structure, onNavigate }) => {
  // Get the current level type (book, chapter, section, paragraph)
  const getCurrentLevel = () => {
    const depths = {
      0: 'book',
      1: 'chapter',
      2: 'section',
      3: 'paragraph'
    };
    return depths[currentPath.length] || 'book';
  };

  // Get icon for each level type
  const getLevelIcon = (type) => {
    const icons = {
      book: <Book className="w-4 h-4" />,
      chapter: <FileText className="w-4 h-4" />,
      section: <Layers className="w-4 h-4" />,
      paragraph: <Text className="w-4 h-4" />  // Changed to Text icon
    };
    return icons[type] || icons.book;
  };

  // Build breadcrumb items based on current path
  const getBreadcrumbs = () => {
    const breadcrumbs = [{
      type: 'book',
      title: structure.title || 'Book',
      path: []
    }];

    currentPath.forEach((index, depth) => {
      const level = getCurrentLevel();
      const currentItem = structure.levels[level][index];
      breadcrumbs.push({
        type: level,
        title: currentItem.title || `${level.charAt(0).toUpperCase() + level.slice(1)} ${index + 1}`,
        path: currentPath.slice(0, depth + 1)
      });
    });

    return breadcrumbs;
  };

  return (
    <div className="w-full bg-white shadow-sm">
      {/* Top Navigation Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm">
          {getBreadcrumbs().map((item, index) => (
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

        {/* Level Context */}
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            {getLevelIcon(getCurrentLevel())}
            <span>Current Level: {getCurrentLevel()}</span>
          </div>

          {structure.levels[getCurrentLevel()]?.length > 0 && (
            <span>
              {structure.levels[getCurrentLevel()].length} items at this level
            </span>
          )}
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${(currentPath.length / 3) * 100}%`
          }}
        />
      </div>
    </div>
  );
};

export default Navigation;