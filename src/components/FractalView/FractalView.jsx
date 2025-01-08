import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const FractalView = ({ bookStructure, currentPath, onPathChange }) => {
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [expandedParagraphs, setExpandedParagraphs] = useState({});

  const { book, chapters } = bookStructure.levels;

  // Toggle chapter expansion
  const toggleChapter = (chapterIndex) => {
    if (expandedChapters.includes(chapterIndex)) {
      setExpandedChapters(expandedChapters.filter(idx => idx !== chapterIndex));
    } else {
      setExpandedChapters([...expandedChapters, chapterIndex]);
    }
  };

  // Toggle paragraph expansion within a chapter
  const toggleParagraph = (chapterIndex, paragraphIndex) => {
    const current = expandedParagraphs[chapterIndex] || [];
    if (current.includes(paragraphIndex)) {
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: current.filter(pIdx => pIdx !== paragraphIndex),
      });
    } else {
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: [...current, paragraphIndex],
      });
    }
  };

  // Legacy "Up" / "Down" logic
  const goUp = () => {
    if (currentPath.length > 0) {
      onPathChange(currentPath.slice(0, -1));
    }
  };

  const goDown = () => {
    onPathChange([...currentPath, 0]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 font-serif">
      {/* --- Go Up Button --- */}
      {currentPath.length > 0 && (
        <div
          className="flex items-center mb-8 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
          onClick={goUp}
        >
          <ChevronUp className="w-5 h-5 mr-2" />
          <span className="text-sm">Go Up</span>
        </div>
      )}

      {/* --- Book-Level Card --- */}
      <div className="p-8 bg-white rounded-xl shadow-md mb-8 transition-colors">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          {bookStructure.title || 'Untitled Book'}
        </h2>
        <p className="italic text-gray-700 leading-relaxed">
          {book.summary || book.content}
        </p>
      </div>

      {/* --- Chapters List --- */}
      <div className="space-y-6">
        {chapters.map((chapter, chapterIndex) => {
          const chapterIsOpen = expandedChapters.includes(chapterIndex);
          const paragraphsForChapter = chapter.paragraphs || [];

          return (
            <div
              key={chapterIndex}
              className="bg-gray-50 rounded-xl shadow-md p-5 transition-colors"
            >
              {/* Chapter Header */}
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => toggleChapter(chapterIndex)}
              >
                <div className="pr-4">
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
                    {chapter.title}
                  </h3>
                  {/*
                    Removed "line-clamp-3" to avoid truncation of the chapter summary
                  */}
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    {chapter.summary || chapter.content}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-gray-500 group-hover:text-indigo-700 transition-colors">
                  {chapterIsOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Paragraphs Collapsible Section */}
              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${chapterIsOpen ? 'max-h-[2000px] mt-3' : 'max-h-0'}
                `}
              >
                <div className="mt-2 space-y-3 ml-6 border-l-4 border-indigo-100 pl-4">
                  {paragraphsForChapter.map((paragraph, paragraphIndex) => {
                    const paraIsOpen =
                      expandedParagraphs[chapterIndex]?.includes(paragraphIndex);

                    return (
                      <div
                        key={paragraphIndex}
                        className="bg-white rounded-lg p-4 shadow-sm transition-colors hover:shadow-md"
                      >
                        {/* Paragraph Summary */}
                        <div
                          className="cursor-pointer flex items-start justify-between group"
                          onClick={() =>
                            toggleParagraph(chapterIndex, paragraphIndex)
                          }
                        >
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {paragraph.summary || paragraph.content}
                          </p>
                          <div className="ml-4 text-gray-400 group-hover:text-indigo-600 transition-colors">
                            {paraIsOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>

                        {/* Full Paragraph Text Collapsible */}
                        <div
                          className={`
                            overflow-hidden transition-all duration-300 ease-in-out
                            ${paraIsOpen ? 'max-h-[800px] mt-3' : 'max-h-0'}
                          `}
                        >
                          <p className="italic text-gray-700 text-sm leading-relaxed">
                            {paragraph.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Go Down Button --- */}
      <div
        className="flex items-center justify-end mt-8 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
        onClick={goDown}
      >
        <span className="text-sm mr-2">Go Down</span>
        <ChevronDown className="w-5 h-5" />
      </div>
    </div>
  );
};

export default FractalView;
