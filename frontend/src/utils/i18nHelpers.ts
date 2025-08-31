/**
 * i18n utility functions for responsive layout handling
 */

export const getTextLength = (text: string): 'short' | 'medium' | 'long' => {
  if (text.length <= 10) return 'short';
  if (text.length <= 20) return 'medium';
  return 'long';
};

export const getResponsiveClasses = (textKey: string, currentLang: string): string => {
  // Russian text is typically 20-30% longer than English
  const isRussian = currentLang === 'ru';
  
  const baseClasses = 'transition-all duration-300';
  
  // Adjust spacing and sizing based on language
  if (isRussian) {
    return `${baseClasses} text-sm sm:text-base`;
  }
  
  return `${baseClasses} text-base`;
};

export const getButtonClasses = (currentLang: string): string => {
  const isRussian = currentLang === 'ru';
  
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200';
  
  if (isRussian) {
    return `${baseClasses} min-w-[120px] text-sm`;
  }
  
  return `${baseClasses} min-w-[100px]`;
};





