import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const FractalView = ({ bookStructure, currentPath, onPathChange }) => {
  const level = currentPath.length; // 0=book, 1=chapter, 2=paragraph
  const { book, chapters } = bookStructure.levels;

  const goUp = () => {
    onPathChange(currentPath.slice(0, -1));
  };

  const goDown = (index) => {
    onPathChange([...currentPath, index]);
  };

  let title = '';
  let mainContent = null; // This will hold the main content (book summary, chapter title, paragraph text, etc.)
  let itemsBelow = [];

  if (level === 0) {
    // Book level:
    title = bookStructure.title || 'Untitled Book';

    // Book summary in italics
    // Ensure that book.summary is available; if not, fallback to book.content.
    const bookSummary = book.summary || book.content;
    mainContent = (
      <p className="italic text-gray-700 mt-2">
        {bookSummary}
      </p>
    );

    // Below items: Chapters with their full chapter summaries (prominent style)
    itemsBelow = chapters.map((c, i) => ({
      title: c.title,
      description: c.summary || c.content,
      onClick: () => goDown(i)
    }));
  } else if (level === 1) {
    // Chapter level:
    const chapter = chapters[currentPath[0]];
    title = chapter.title;
    // We do NOT show the chapter summary here, only the title.
    // Instead, we show paragraph summaries in full.

    itemsBelow = chapter.paragraphs.map((p, i) => ({
      title: `Paragraph ${i + 1}`,
      // Show full paragraph summary. If no summary, fallback to content.
      description: p.summary || p.content,
      onClick: () => goDown(i)
    }));
  } else if (level === 2) {
    // Paragraph level:
    const chapter = chapters[currentPath[0]];
    const paragraph = chapter.paragraphs[currentPath[1]];

    title = `Paragraph ${currentPath[1] + 1}`;
    // Show full paragraph text, no summary at this level.
    mainContent = (
      <p className="text-gray-800 mt-2">
        {paragraph.content}
      </p>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">

      {/* Up Button */}
      {level > 0 && (
        <div
          className="cursor-pointer mb-8 opacity-50 hover:opacity-70 transition-opacity"
          onClick={goUp}
        >
          <div className="flex items-center justify-center mb-2">
            <ChevronUp className="w-6 h-6" />
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 line-clamp-2">
              Go Up
            </p>
          </div>
        </div>
      )}

      {/* Current Level Display */}
      <div className="p-6 bg-white rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {mainContent}
      </div>

      {/* Items Below */}
      {itemsBelow.length > 0 && (
        <div className="mt-8 space-y-4">
          {itemsBelow.map((item, index) => (
            <div
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow bg-gray-100 p-4 rounded-lg"
              onClick={item.onClick}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-700">
                {item.description}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-center mt-2">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      )}
    </div>
  );
};

export default FractalView;
