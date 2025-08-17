export function devErrorLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
}

export function devSuccessLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}

export function devWarningLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
}

export function devInfoLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.info(...args);
  }
}
