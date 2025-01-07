// src/components/FractalView/FractalView.jsx

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const FractalView = ({ bookStructure, currentPath, onPathChange }) => {
  // Track which chapters are expanded (multi-accordion).
  // For example, if expandedChapters = [0, 2], then chapters 0 and 2 are open.
  const [expandedChapters, setExpandedChapters] = useState([]);

  // Track which paragraphs are expanded for each chapter.
  // For example, expandedParagraphs = { 0: [1, 2], 2: [0] } means
  // chapter 0 has paragraphs 1 and 2 expanded, chapter 2 has paragraph 0 expanded.
  const [expandedParagraphs, setExpandedParagraphs] = useState({});

  const { book, chapters } = bookStructure.levels;

  // -- Expand/Collapse Chapter --------------------------------------------------
  const toggleChapter = (chapterIndex) => {
    if (expandedChapters.includes(chapterIndex)) {
      // Collapse it
      setExpandedChapters(expandedChapters.filter((idx) => idx !== chapterIndex));
    } else {
      // Expand it
      setExpandedChapters([...expandedChapters, chapterIndex]);
    }
  };

  // -- Expand/Collapse Paragraph -----------------------------------------------
  const toggleParagraph = (chapterIndex, paragraphIndex) => {
    const current = expandedParagraphs[chapterIndex] || [];
    if (current.includes(paragraphIndex)) {
      // Collapse this paragraph
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: current.filter((pIdx) => pIdx !== paragraphIndex),
      });
    } else {
      // Expand this paragraph
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: [...current, paragraphIndex],
      });
    }
  };

  // Optional: “Go Up” – go to the parent level in your old path-based logic
  const goUp = () => {
    if (currentPath.length > 0) {
      onPathChange(currentPath.slice(0, -1));
    }
  };

  // Optional: “Go Down” – go to the next level (though in a multi-accordion UI,
  // it might not do much, but we’ll keep it for now).
  const goDown = () => {
    onPathChange([...currentPath, 0]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* --- Up Button --- */}
      {currentPath.length > 0 && (
        <div
          className="cursor-pointer mb-8 opacity-50 hover:opacity-70 transition-opacity flex items-center"
          onClick={goUp}
        >
          <ChevronUp className="w-5 h-5 mr-2" />
          <span className="text-sm text-gray-600">Go Up</span>
        </div>
      )}

      {/* --- Book-Level Info --- */}
      <div className="p-6 bg-white rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          {bookStructure.title || 'Untitled Book'}
        </h2>
        <p className="italic text-gray-700">
          {book.summary || book.content}
        </p>
      </div>

      {/* --- Chapters List --- */}
      <div className="space-y-4">
        {chapters.map((chapter, chapterIndex) => {
          const chapterIsOpen = expandedChapters.includes(chapterIndex);
          const paragraphsForChapter = chapter.paragraphs || [];

          return (
            <div
              key={chapterIndex}
              className="bg-gray-100 rounded-lg shadow-sm p-4 transition-colors"
            >
              {/* Chapter Summary Row */}
              <div
                className="cursor-pointer flex items-start justify-between"
                onClick={() => toggleChapter(chapterIndex)}
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {chapter.title}
                  </h3>
                  <p className="text-gray-700">
                    {chapter.summary || chapter.content}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-gray-600">
                  {chapterIsOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Paragraph Summaries (Collapsible) */}
              <div
                className={`
                  overflow-hidden
                  transition-all duration-300 ease-in-out
                  ${chapterIsOpen ? 'max-h-[1000px] mt-3' : 'max-h-0'}
                `}
              >
                {paragraphsForChapter.map((paragraph, paragraphIndex) => {
                  const paraIsOpen =
                    expandedParagraphs[chapterIndex]?.includes(paragraphIndex);

                  return (
                    <div
                      key={paragraphIndex}
                      className="bg-white rounded-md mt-2 p-3 ml-6 shadow-sm"
                    >
                      {/* Paragraph Summary Row */}
                      <div
                        className="cursor-pointer flex items-start justify-between"
                        onClick={() => toggleParagraph(chapterIndex, paragraphIndex)}
                      >
                        <div>
                          <h4 className="text-sm font-medium text-gray-800 mb-1">
                            Paragraph {paragraphIndex + 1}
                          </h4>
                          <p className="text-gray-600">
                            {paragraph.summary || paragraph.content}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0 text-gray-500">
                          {paraIsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Full Paragraph Text (Collapsible) */}
                      <div
                        className={`
                          overflow-hidden ml-4 pl-4 border-l border-gray-200 mt-2
                          transition-all duration-300 ease-in-out
                          ${paraIsOpen ? 'max-h-[500px]' : 'max-h-0'}
                        `}
                      >
                        <p className="text-gray-700 text-sm">
                          {paragraph.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Down Button --- */}
      <div
        className="cursor-pointer mt-8 opacity-50 hover:opacity-70 transition-opacity flex items-center justify-end"
        onClick={goDown}
      >
        <span className="text-sm text-gray-600 mr-2">Go Down</span>
        <ChevronDown className="w-5 h-5" />
      </div>
    </div>
  );
};

export default FractalView;
