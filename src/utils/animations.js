// utils/animations.js

// Slide transition configurations
export const slideTransitions = {
  up: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  down: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  }
};

// Fade transition configurations
export const fadeTransitions = {
  default: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  slow: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.5 }
  }
};

// Scale transition configurations
export const scaleTransitions = {
  default: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.3 }
  }
};

// Combined transitions
export const combinedTransitions = {
  slideUp: {
    initial: { y: 20, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: -20, opacity: 0, scale: 0.95 },
    transition: { duration: 0.3 }
  },
  slideDown: {
    initial: { y: -20, opacity: 0, scale: 0.95 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: 20, opacity: 0, scale: 0.95 },
    transition: { duration: 0.3 }
  }
};

// Animation timing helpers
export const timing = {
  fast: 0.2,
  default: 0.3,
  slow: 0.5
};

// Easing functions
export const easing = {
  default: [0.4, 0, 0.2, 1],
  smooth: [0.4, 0.4, 0, 1],
  sharp: [0.4, 0, 0.6, 1]
};

// Helper function to create custom transition
export const createTransition = ({
  type = 'default',
  duration = timing.default,
  ease = easing.default
} = {}) => {
  const baseTransition = {
    ...fadeTransitions[type] || fadeTransitions.default,
    transition: { duration, ease }
  };

  return baseTransition;
};