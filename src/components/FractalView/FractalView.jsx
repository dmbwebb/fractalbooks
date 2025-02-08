import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';

const FractalView = ({ bookStructure, currentPath, onPathChange }) => {
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [expandedParagraphs, setExpandedParagraphs] = useState({});

  // State for popovers (analysis)
  const [bookAnalysisOpen, setBookAnalysisOpen] = useState(false);
  const [chaptersAnalysisOpen, setChaptersAnalysisOpen] = useState({});

  const { book, chapters } = bookStructure.levels;

  // Toggle chapter expansion
  const toggleChapter = (chapterIndex) => {
    if (expandedChapters.includes(chapterIndex)) {
      setExpandedChapters(expandedChapters.filter(idx => idx !== chapterIndex));
    } else {
      setExpandedChapters([...expandedChapters, chapterIndex]);
    }
  };

  // Toggle paragraph expansion
  const toggleParagraph = (chapterIndex, paragraphIndex) => {
    const current = expandedParagraphs[chapterIndex] || [];
    if (current.includes(paragraphIndex)) {
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: current.filter(p => p !== paragraphIndex),
      });
    } else {
      setExpandedParagraphs({
        ...expandedParagraphs,
        [chapterIndex]: [...current, paragraphIndex],
      });
    }
  };

  // Toggle analysis popover for book
  const toggleBookAnalysis = () => {
    setBookAnalysisOpen(!bookAnalysisOpen);
  };

  // Toggle analysis popover for a specific chapter
  const toggleChapterAnalysis = (chapterIndex) => {
    setChaptersAnalysisOpen(prev => ({
      ...prev,
      [chapterIndex]: !prev[chapterIndex],
    }));
  };

  // Navigation
  const goUp = () => {
    if (currentPath.length > 0) {
      onPathChange(currentPath.slice(0, -1));
    }
  };

  const goDown = () => {
    onPathChange([...currentPath, 0]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 font-serif relative">
      {/* "Go Up" Button */}
      {currentPath.length > 0 && (
        <div
          className="flex items-center mb-8 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
          onClick={goUp}
        >
          <ChevronUp className="w-5 h-5 mr-2" />
          <span className="text-sm">Go Up</span>
        </div>
      )}

      {/* Book-Level Card */}
      <div className="p-8 bg-white rounded-xl shadow-md mb-8 transition-colors relative">
        <h2 className="text-3xl text-gray-800 mb-4">
          <span className="font-bold">{bookStructure.title || 'Untitled Book'}</span>
          {bookStructure.metadata?.creator && (
            <span className="ml-3 text-base font-normal text-gray-700">
              by {bookStructure.metadata.creator}
            </span>
          )}
        </h2>

        {/* Info icon for book-level analysis */}
        {book.analysis && book.analysis.trim().length > 0 && (
          <div
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
            onClick={toggleBookAnalysis}
            title="View Book Analysis"
          >
            <Info className="w-5 h-5" />
          </div>
        )}

        <p className="italic text-gray-700 leading-relaxed">
          {book.summary || book.content}
        </p>
      </div>

      {/* Book Analysis Popover */}
      {bookAnalysisOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={toggleBookAnalysis}
          ></div>
          <div className="relative z-10 bg-white max-w-xl w-full max-h-[80vh] overflow-auto rounded-lg shadow-lg p-6">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
              onClick={toggleBookAnalysis}
            >
              &times;
            </button>
            <h3 className="text-xl font-semibold mb-4">Chain-of-Thought Analysis (Book)</h3>
            <div className="text-gray-700 whitespace-pre-wrap">
              {book.analysis}
            </div>
          </div>
        </div>
      )}

      {/* Chapters */}
      <div className="space-y-6">
        {chapters.map((chapter, chapterIndex) => {
          const chapterIsOpen = expandedChapters.includes(chapterIndex);
          const paragraphsForChapter = chapter.paragraphs || [];
          const hasAnalysis = chapter.analysis && chapter.analysis.trim().length > 0;

          return (
            <div
              key={chapterIndex}
              className="bg-gray-50 rounded-xl shadow-md p-5 transition-colors relative"
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
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    {chapter.summary || chapter.content}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 text-gray-500 group-hover:text-indigo-700 transition-colors">
                  {chapterIsOpen ? <ChevronUp /> : <ChevronDown />}
                </div>
              </div>

              {/* Chapter analysis info icon */}
              {hasAnalysis && (
                <div
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
                  title="View Chapter Analysis"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChapterAnalysis(chapterIndex);
                  }}
                >
                  <Info className="w-5 h-5" />
                </div>
              )}

              {/* Paragraphs Collapsible */}
              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${chapterIsOpen ? 'max-h-[9999px] mt-3' : 'max-h-0'}
                `}
              >
                <div className="mt-2 space-y-3 ml-6 border-l-4 border-indigo-100 pl-4">
                  {paragraphsForChapter.map((paragraph, pIndex) => {
                    const paraIsOpen =
                      expandedParagraphs[chapterIndex]?.includes(pIndex);

                    return (
                      <div
                        key={pIndex}
                        className="bg-white rounded-lg p-4 shadow-sm transition-colors hover:shadow-md"
                      >
                        {/* Paragraph summary */}
                        <div
                          className="cursor-pointer flex items-start justify-between group"
                          onClick={() => toggleParagraph(chapterIndex, pIndex)}
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
                            ${paraIsOpen ? 'max-h-[9999px] mt-3' : 'max-h-0'}
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

              {/* Chapter Analysis Popover */}
              {chaptersAnalysisOpen[chapterIndex] && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black bg-opacity-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleChapterAnalysis(chapterIndex);
                    }}
                  ></div>
                  <div className="relative z-10 bg-white max-w-xl w-full max-h-[80vh] overflow-auto rounded-lg shadow-lg p-6">
                    <button
                      className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChapterAnalysis(chapterIndex);
                      }}
                    >
                      &times;
                    </button>
                    <h3 className="text-xl font-semibold mb-4">Chain-of-Thought Analysis (Chapter)</h3>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {chapter.analysis}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* "Go Down" Button */}
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
