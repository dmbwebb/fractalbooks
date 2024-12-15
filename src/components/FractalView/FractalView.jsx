// FractalView.js

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
  let summaryOrContent = '';
  let itemsBelow = [];

  if (level === 0) {
    // Book level
    title = bookStructure.title || 'Untitled Book';
    summaryOrContent = book.summary || book.content || 'No summary available';
    // The "below" items are chapters
    itemsBelow = chapters.map((c, i) => ({
      title: c.title,
      preview: c.summary || (c.content?.substring(0,100) + '...'),
      onClick: () => goDown(i)
    }));
  } else if (level === 1) {
    // Chapter level
    const chapter = chapters[currentPath[0]];
    title = chapter.title;
    summaryOrContent = chapter.summary || chapter.content;
    // The "below" items are paragraphs
    itemsBelow = chapter.paragraphs.map((p, i) => ({
      title: `Paragraph ${i+1}`,
      preview: p.summary || p.content.substring(0,100) + '...',
      onClick: () => goDown(i)
    }));
  } else if (level === 2) {
    // Paragraph level
    const chapter = chapters[currentPath[0]];
    const paragraph = chapter.paragraphs[currentPath[1]];
    title = `Paragraph ${currentPath[1] + 1}`;
    summaryOrContent = paragraph.content; // Show full content at paragraph level
    itemsBelow = []; // no further down
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
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

      <div className="p-6 bg-white rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-gray-800 leading-relaxed">
          {summaryOrContent}
        </p>
      </div>

      {itemsBelow.length > 0 && (
        <div className="mt-8 grid gap-4">
          {itemsBelow.map((item, index) => (
            <div
              key={index}
              className="cursor-pointer opacity-50 hover:opacity-70 transition-opacity"
              onClick={item.onClick}
            >
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.title}: {item.preview}
                </p>
              </div>
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
