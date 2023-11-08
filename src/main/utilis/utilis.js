export const timeoutPromise = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(true), timeout)
  })
