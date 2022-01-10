export const futureTime = (seconds) => {
  return (+Math.floor(new Date().getTime()/1000.0) + +seconds)
} 



